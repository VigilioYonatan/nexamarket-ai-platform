import { BadRequestException, Injectable } from "@nestjs/common";
import { PgStore } from "../../../infrastructure/db.js";

@Injectable()
export class CommercialService {
  constructor(private readonly db: PgStore) {}

  async current() {
    return (
      this.db.one<{ version: number; commission_bps: number }>(
        `SELECT version,commission_bps FROM platform_commission_versions WHERE status='PUBLISHED' LIMIT 1`,
      ) ?? { version: 0, commission_bps: 0 }
    );
  }

  history() {
    return this.db.query(
      `SELECT id,version,commission_bps,status,created_at,published_at FROM platform_commission_versions ORDER BY version DESC LIMIT 40`,
    );
  }

  async publish(admin_id: string, bps: number) {
    if (!Number.isSafeInteger(bps) || bps < 0 || bps > 3000)
      throw new BadRequestException({ code: "INVALID_COMMISSION_BPS" });
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(309978)");
      const out = await c.query<{ id: string; version: number }>(
        `INSERT INTO platform_commission_versions(version,commission_bps,status,created_by)
        VALUES((SELECT COALESCE(MAX(version),0)+1 FROM platform_commission_versions),$1,'DRAFT',$2) RETURNING id,version`,
        [bps, admin_id],
      );
      const id = out.rows[0]!.id;
      await c.query(
        `UPDATE platform_commission_versions SET status='ARCHIVED' WHERE status='PUBLISHED'`,
      );
      await c.query(
        `UPDATE platform_commission_versions SET status='PUBLISHED',published_at=now() WHERE id=$1`,
        [id],
      );
      await c.query(
        `INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,'COMMISSION_POLICY_PUBLISHED',$2)`,
        [admin_id, id],
      );
      return { id, version: out.rows[0]!.version, commission_bps: bps, status: "PUBLISHED" };
    });
  }
}
