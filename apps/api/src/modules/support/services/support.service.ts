import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PgStore } from "../../../infrastructure/db.js";
import { FeatureFlagsService } from "../../flags.js";
import type { TicketDto, TicketMessageDto, TicketStatusDto } from "../dtos/support.dto.js";

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

  async create(user_id: string, body: TicketDto) {
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
    body: TicketMessageDto,
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

  async updateStatus(admin_id: string, id: string, data: TicketStatusDto) {
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
