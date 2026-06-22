import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  NotFoundException,
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
export const ticketDto = z
  .object({
    order_id: uuid.optional(),
    category: z.enum(["ORDER", "PAYMENT", "RETURN", "ACCOUNT", "OTHER"]),
    subject: z.string().trim().min(5).max(150),
    message: z.string().trim().min(2).max(4000),
  })
  .strict();
export const ticketMessageDto = z.object({ message: z.string().trim().min(2).max(4000) }).strict();
export const ticketStatusDto = z
  .object({ status: z.enum(["OPEN", "WAITING_CUSTOMER", "WAITING_SUPPORT", "CLOSED"]) })
  .strict();
@Injectable()
export class SupportService {
  constructor(
    private readonly db: PgStore,
    private readonly flags: FeatureFlagsService,
  ) {}
  listMine(user_id: string) {
    return this.db.query(
      `SELECT id,order_id,subject,category,status,priority,created_at,updated_at FROM support_tickets WHERE requester_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [user_id],
    );
  }
  async create(user_id: string, body: z.infer<typeof ticketDto>) {
    if (!(await this.flags.enabled("support")))
      throw new ServiceUnavailableException({ code: "SUPPORT_DISABLED" });
    return this.db.transaction(async (c) => {
      if (body.order_id) {
        const result = await c.query(`SELECT id FROM orders WHERE id=$1 AND buyer_id=$2`, [
          body.order_id,
          user_id,
        ]);
        if (!result.rowCount) throw new NotFoundException({ code: "ORDER_NOT_FOUND" });
      }
      const result = await c.query<{ id: string; status: string }>(
        `INSERT INTO support_tickets(requester_id,order_id,category,subject) VALUES($1,$2,$3,$4) RETURNING id,status`,
        [user_id, body.order_id ?? null, body.category, body.subject],
      );
      const id = result.rows[0]!.id;
      await c.query(
        `INSERT INTO support_ticket_messages(ticket_id,author_id,content) VALUES($1,$2,$3)`,
        [id, user_id, body.message],
      );
      await c.query(
        `INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES('SupportTicketOpened',$1,$2)`,
        [id, JSON.stringify({ ticket_id: id, requester_id: user_id })],
      );
      return result.rows[0];
    });
  }
  async detail(user_id: string, id: string, isAdmin = false) {
    const ticket = await this.db.one(
      `SELECT id,requester_id,order_id,category,subject,status,priority,created_at,updated_at
   FROM support_tickets WHERE id=$1 AND ($2::boolean OR requester_id=$3)`,
      [id, isAdmin, user_id],
    );
    if (!ticket) throw new NotFoundException({ code: "TICKET_NOT_FOUND" });
    const messages = await this.db.query(
      `SELECT m.id,m.content,m.created_at,
    CASE WHEN m.author_id=t.requester_id THEN 'CUSTOMER' ELSE 'SUPPORT' END AS author_role
    FROM support_ticket_messages m JOIN support_tickets t ON t.id=m.ticket_id
    WHERE m.ticket_id=$1 ORDER BY m.created_at,m.id LIMIT 200`,
      [id],
    );
    return { ticket, messages };
  }
  async addMessage(
    user_id: string,
    id: string,
    body: z.infer<typeof ticketMessageDto>,
    isAdmin = false,
  ) {
    return this.db.transaction(async (c) => {
      const t = await c.query<{ id: string; status: string; requester_id: string }>(
        `SELECT id,status,requester_id FROM support_tickets WHERE id=$1 AND ($2::boolean OR requester_id=$3) FOR UPDATE`,
        [id, isAdmin, user_id],
      );
      if (!t.rows[0]) throw new NotFoundException({ code: "TICKET_NOT_FOUND" });
      if (t.rows[0].status === "CLOSED") throw new ConflictException({ code: "TICKET_CLOSED" });
      await c.query(
        `INSERT INTO support_ticket_messages(ticket_id,author_id,content) VALUES($1,$2,$3)`,
        [id, user_id, body.message],
      );
      const state = isAdmin ? "WAITING_CUSTOMER" : "WAITING_SUPPORT";
      await c.query(`UPDATE support_tickets SET status=$2,updated_at=now() WHERE id=$1`, [
        id,
        state,
      ]);
      await c.query(
        `INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES('SupportTicketMessage',$1,$2)`,
        [
          id,
          JSON.stringify({
            ticket_id: id,
            requester_id: t.rows[0].requester_id,
            author_id: user_id,
          }),
        ],
      );
      return { id, status: state };
    });
  }
  queue() {
    return this.db.query(`SELECT t.id,t.category,t.subject,t.status,t.priority,t.created_at
  FROM support_tickets t WHERE t.status!='CLOSED' ORDER BY CASE WHEN t.priority='HIGH' THEN 0 ELSE 1 END,t.created_at LIMIT 100`);
  }
  async updateStatus(admin_id: string, id: string, data: z.infer<typeof ticketStatusDto>) {
    return this.db.transaction(async (c) => {
      const result = await c.query<{ id: string; status: string }>(
        `UPDATE support_tickets SET status=$2,updated_at=now() WHERE id=$1 AND status!=$2 RETURNING id,status`,
        [id, data.status],
      );
      if (!result.rows[0]) throw new ConflictException({ code: "TICKET_STATUS_NOT_CHANGED" });
      await c.query(
        `INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,'TICKET_STATUS_CHANGED',$2)`,
        [admin_id, id],
      );
      return result.rows[0];
    });
  }
}
@Controller("api/v1/me/support")
@UseGuards(SessionGuard)
export class MySupportController {
  constructor(private readonly support: SupportService) {}
  @Get("tickets") list(@CurrentUser() p: Principal) {
    return this.support.listMine(p.user_id);
  }
  @Post("tickets") create(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(ticketDto)) d: z.infer<typeof ticketDto>,
  ) {
    return this.support.create(p.user_id, d);
  }
  @Get("tickets/:id") detail(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.support.detail(p.user_id, parseUuid(id));
  }
  @Post("tickets/:id/messages") reply(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(ticketMessageDto)) dto: z.infer<typeof ticketMessageDto>,
  ) {
    return this.support.addMessage(p.user_id, parseUuid(id), dto);
  }
}
@Controller("api/v1/admin/support")
@UseGuards(SessionGuard, AdminGuard)
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}
  @Get("tickets") queue() {
    return this.support.queue();
  }
  @Get("tickets/:id") detail(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.support.detail(p.user_id, parseUuid(id), true);
  }
  @Post("tickets/:id/messages") reply(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(ticketMessageDto)) dto: z.infer<typeof ticketMessageDto>,
  ) {
    return this.support.addMessage(p.user_id, parseUuid(id), dto, true);
  }
  @Patch("tickets/:id/status") status(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(ticketStatusDto)) dto: z.infer<typeof ticketStatusDto>,
  ) {
    return this.support.updateStatus(p.user_id, parseUuid(id), dto);
  }
}
