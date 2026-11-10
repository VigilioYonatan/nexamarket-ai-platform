import { Injectable, NotFoundException } from "@nestjs/common";
import { PgStore } from "../../../infrastructure/db.js";

@Injectable()
export class NotificationsService {
  constructor(private readonly db: PgStore) {}

  list(user_id: string) {
    return this.db.query(
      `SELECT id,type,subject,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [user_id],
    );
  }

  unread(user_id: string) {
    return this.db.one<{ unread: number }>(
      `SELECT count(*)::int AS unread FROM notifications WHERE user_id=$1 AND read_at IS NULL`,
      [user_id],
    );
  }

  async markRead(user_id: string, id: string) {
    const result = await this.db.one<{ id: string; read_at: Date }>(
      `UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE user_id=$1 AND id=$2 RETURNING id,read_at`,
      [user_id, id],
    );
    if (!result) throw new NotFoundException({ code: "NOTIFICATION_NOT_FOUND" });
    return result;
  }
}
