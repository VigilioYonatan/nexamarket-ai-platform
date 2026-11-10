import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PgStore } from "../../../infrastructure/db.js";
import { FeatureFlagsService } from "../../flags.js";
import type {
  ModerateReviewDto,
  OpenTrustCaseDto,
  PublishReviewDto,
  ResolveTrustCaseDto,
} from "../dtos/trust.dto.js";

@Injectable()
export class TrustService {
  constructor(
    private readonly db: PgStore,
    private readonly flags: FeatureFlagsService,
  ) {}

  listReviews(listing_id: string) {
    return this.db.query(
      `SELECT r.id,r.rating,r.comment,r.created_at,'Comprador verificado' AS author
    FROM reviews r
    JOIN seller_listings l ON l.id=r.listing_id
    WHERE r.listing_id=$1 AND r.status='APPROVED' AND l.status='PUBLISHED'
    ORDER BY r.created_at DESC LIMIT 50`,
      [listing_id],
    );
  }

  async publishReview(user_id: string, listing_id: string, data: PublishReviewDto) {
    if (!(await this.flags.enabled("reviews")))
      throw new ServiceUnavailableException({ code: "REVIEWS_DISABLED" });
    return this.db.transaction(async (c) => {
      const eligible = await c.query(
        `SELECT ol.id FROM orders o JOIN order_lines ol ON ol.order_id=o.id
        JOIN seller_orders so ON so.id=ol.seller_order_id WHERE o.id=$1 AND o.buyer_id=$2
        AND ol.listing_id=$3 AND so.status IN ('PAID','PREPARING','SHIPPED','DELIVERED') LIMIT 1`,
        [data.order_id, user_id, listing_id],
      );
      if (!eligible.rowCount) throw new ConflictException({ code: "VERIFIED_PURCHASE_REQUIRED" });
      const result = await c.query<{ id: string; status: string }>(
        `INSERT INTO reviews(order_id,buyer_id,listing_id,rating,comment,status)
        VALUES($1,$2,$3,$4,$5,'PENDING') ON CONFLICT(order_id,buyer_id,listing_id) DO NOTHING RETURNING id,status`,
        [data.order_id, user_id, listing_id, data.rating, data.comment],
      );
      if (!result.rows[0]) throw new ConflictException({ code: "REVIEW_ALREADY_EXISTS" });
      return result.rows[0];
    });
  }

  pendingReviews() {
    return this.db.query(`SELECT r.id,r.listing_id,r.rating,r.comment,r.created_at,
    l.seller_id FROM reviews r JOIN seller_listings l ON l.id=r.listing_id
    WHERE r.status='PENDING' ORDER BY r.created_at LIMIT 100`);
  }

  async moderateReview(admin_id: string, id: string, data: ModerateReviewDto) {
    return this.db.transaction(async (c) => {
      const updated = await c.query<{ id: string; status: string; buyer_id: string }>(
        `UPDATE reviews SET status=$2 WHERE id=$1 AND status='PENDING' RETURNING id,status,buyer_id`,
        [id, data.decision],
      );
      if (!updated.rows[0]) throw new ConflictException({ code: "REVIEW_NOT_PENDING" });
      await c.query(`INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,$2,$3)`, [
        admin_id,
        `REVIEW_${data.decision}`,
        id,
      ]);
      await c.query(
        `INSERT INTO trust_cases(subject_type,subject_id,reason,status,opened_by,resolved_by,resolution)
        VALUES('REVIEW',$1,$2,'RESOLVED',$3,$3,$2)`,
        [id, data.reason, admin_id],
      );
      await c.query(
        `INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES('ReviewModerated',$1,$2)`,
        [id, JSON.stringify({ buyer_id: updated.rows[0].buyer_id, status: data.decision })],
      );
      return { id: updated.rows[0].id, status: updated.rows[0].status };
    });
  }

  cases() {
    return this.db.query(
      `SELECT id,subject_type,subject_id,reason,status,resolution,created_at FROM trust_cases ORDER BY created_at DESC LIMIT 100`,
    );
  }

  async openCase(admin_id: string, data: OpenTrustCaseDto) {
    const row = await this.db.one<{ id: string; status: string }>(
      `INSERT INTO trust_cases(subject_type,subject_id,reason,opened_by)
      VALUES($1,$2,$3,$4) RETURNING id,status`,
      [data.subject_type, data.subject_id, data.reason, admin_id],
    );
    return row;
  }

  async decideCase(admin_id: string, id: string, data: ResolveTrustCaseDto) {
    return this.db.transaction(async (c) => {
      const updated = await c.query<{ id: string; status: string }>(
        `UPDATE trust_cases SET status=$2,resolution=$3,
        resolved_by=CASE WHEN $2 IN ('RESOLVED','DISMISSED') THEN $4 ELSE NULL END,updated_at=now()
        WHERE id=$1 AND status IN ('OPEN','INVESTIGATING') RETURNING id,status`,
        [id, data.status, data.resolution, admin_id],
      );
      if (!updated.rows[0]) throw new ConflictException({ code: "TRUST_CASE_CLOSED" });
      await c.query(
        `INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,'TRUST_CASE_DECIDED',$2)`,
        [admin_id, id],
      );
      return updated.rows[0];
    });
  }
}
