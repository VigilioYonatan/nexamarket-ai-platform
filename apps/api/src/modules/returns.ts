import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { PgStore } from "../infrastructure/db.js";
import {
  AdminGuard,
  CurrentUser,
  type Principal,
  parseUuid,
  SessionGuard,
  ZodPipe,
} from "../shared/http.js";
export const reviewReturnDto = z
  .object({
    decision: z.enum(["UNDER_REVIEW", "ACCEPTED", "REJECTED"]),
    reason: z.string().trim().min(10).max(1000),
  })
  .strict();
@Injectable()
export class ReturnsService {
  constructor(private readonly db: PgStore) {}
  queue() {
    return this.db.query(`SELECT r.id,r.order_id,r.seller_order_id,r.status,r.reason,r.created_at,
   so.seller_id FROM return_requests r LEFT JOIN seller_orders so ON so.id=r.seller_order_id
   ORDER BY CASE WHEN r.status IN ('OPEN','UNDER_REVIEW') THEN 0 ELSE 1 END,r.created_at DESC LIMIT 100`);
  }
  async decide(admin_id: string, id: string, dto: z.infer<typeof reviewReturnDto>) {
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
      // ACCEPTED is approval for a human-managed workflow, never a claim that MP refunded the buyer.
      return {
        id,
        status: dto.decision,
        notice: "No se ha ejecutado ningÃºn reembolso en Mercado Pago.",
      };
    });
  }
}
@Controller("api/v1/admin/returns")
@UseGuards(SessionGuard, AdminGuard)
export class AdminReturnsController {
  constructor(private readonly returns: ReturnsService) {}
  @Get() queue() {
    return this.returns.queue();
  }
  @Patch(":id") decide(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(reviewReturnDto)) dto: z.infer<typeof reviewReturnDto>,
  ) {
    return this.returns.decide(p.user_id, parseUuid(id), dto);
  }
}
