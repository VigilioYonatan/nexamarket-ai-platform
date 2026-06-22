import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Param,
  Patch,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { PgStore } from "../infrastructure/db.js";
import { uuid } from "../shared/dto.js";
import {
  AdminGuard,
  CurrentUser,
  type Principal,
  parseUuid,
  SessionGuard,
  ZodPipe,
} from "../shared/http.js";
import { FeatureFlagsService } from "./flags.js";

export const publishReviewDto = z
  .object({
    order_id: uuid,
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(10).max(2000),
  })
  .strict();
export const moderateReviewDto = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
export const openTrustCaseDto = z
  .object({
    subject_type: z.enum(["SELLER", "LISTING", "REVIEW", "ORDER"]),
    subject_id: uuid,
    reason: z.string().trim().min(10).max(2000),
  })
  .strict();
export const resolveTrustCaseDto = z
  .object({
    status: z.enum(["INVESTIGATING", "RESOLVED", "DISMISSED"]),
    resolution: z.string().trim().min(10).max(2000),
  })
  .strict();
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
  async publishReview(user_id: string, listing_id: string, data: z.infer<typeof publishReviewDto>) {
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
  async moderateReview(admin_id: string, id: string, data: z.infer<typeof moderateReviewDto>) {
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
  async openCase(admin_id: string, data: z.infer<typeof openTrustCaseDto>) {
    const row = await this.db.one<{ id: string; status: string }>(
      `INSERT INTO trust_cases(subject_type,subject_id,reason,opened_by)
      VALUES($1,$2,$3,$4) RETURNING id,status`,
      [data.subject_type, data.subject_id, data.reason, admin_id],
    );
    return row;
  }
  async decideCase(admin_id: string, id: string, data: z.infer<typeof resolveTrustCaseDto>) {
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
@Controller("api/v1/products/:listing_id/reviews")
export class PublicReviewsController {
  constructor(private readonly trust: TrustService) {}
  @Get() list(@Param("listing_id") id: string) {
    return this.trust.listReviews(parseUuid(id));
  }
  @Post() @UseGuards(SessionGuard) create(
    @CurrentUser() user: Principal,
    @Param("listing_id") id: string,
    @Body(new ZodPipe(publishReviewDto)) data: z.infer<typeof publishReviewDto>,
  ) {
    return this.trust.publishReview(user.user_id, parseUuid(id), data);
  }
}
@Controller("api/v1/admin/trust")
@UseGuards(SessionGuard, AdminGuard)
export class AdminTrustController {
  constructor(private readonly trust: TrustService) {}
  @Get("reviews/pending") reviews() {
    return this.trust.pendingReviews();
  }
  @Patch("reviews/:id") moderate(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(moderateReviewDto)) dto: z.infer<typeof moderateReviewDto>,
  ) {
    return this.trust.moderateReview(p.user_id, parseUuid(id), dto);
  }
  @Get("cases") cases() {
    return this.trust.cases();
  }
  @Post("cases") open(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(openTrustCaseDto)) dto: z.infer<typeof openTrustCaseDto>,
  ) {
    return this.trust.openCase(p.user_id, dto);
  }
  @Patch("cases/:id") decide(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(resolveTrustCaseDto)) dto: z.infer<typeof resolveTrustCaseDto>,
  ) {
    return this.trust.decideCase(p.user_id, parseUuid(id), dto);
  }
}
