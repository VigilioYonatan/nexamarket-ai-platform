import { ConflictException, Injectable } from "@nestjs/common";
import { PgStore } from "../../../infrastructure/db.js";
import type { ReviewReturnDto } from "../dtos/returns.dto.js";

@Injectable()
export class ReturnsService {
  constructor(private readonly db: PgStore) {}

  queue() {
    return this.db.query(`SELECT r.id,r.order_id,r.seller_order_id,r.status,r.reason,r.created_at,
   so.seller_id FROM return_requests r LEFT JOIN seller_orders so ON so.id=r.seller_order_id
   ORDER BY CASE WHEN r.status IN ('OPEN','UNDER_REVIEW') THEN 0 ELSE 1 END,r.created_at DESC LIMIT 100`);
  }

  async decide(admin_id: string, id: string, dto: ReviewReturnDto) {
    return this.db.transaction(async (c) => {
      const result = await c.query<{ id: string; status: string; order_id: string }>(
        `UPDATE return_requests
      SET status=$2,decision_reason=$3,decided_by=$4,decided_at=now() WHERE id=$1 AND status IN ('OPEN','UNDER_REVIEW') RETURNING id,status,order_id`,
        [id, dto.decision, dto.reason, admin_id],
      );
      if (!result.rows[0]) throw new ConflictException({ code: "RETURN_NOT_ACTIONABLE" });
      await c.query(`INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,$2,$3)`, [
        admin_id,
        `RETURN_${dto.decision}`,
        id,
      ]);
      await c.query(
        `INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES('ReturnStatusChanged',$1,$2)`,
        [
          id,
          JSON.stringify({
            order_id: result.rows[0].order_id,
            return_id: id,
            status: dto.decision,
          }),
        ],
      );
      return {
        id,
        status: dto.decision,
        notice: "No se ha ejecutado ningún reembolso en Mercado Pago.",
      };
    });
  }
}
