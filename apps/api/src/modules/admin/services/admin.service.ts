import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { defaultTheme, type ThemeTokens, validateTheme } from "@nexa/domain";
import { PgStore } from "../../../infrastructure/db.js";
import type { CategoryUpdateDto } from "../dtos/admin.dto.js";

@Injectable()
export class AdminService {
  constructor(private readonly db: PgStore) {}

  async settings() {
    const result = await this.db.one<{ id: string; version: number; tokens: ThemeTokens }>(
      `SELECT id,version,tokens FROM global_settings_versions WHERE status='PUBLISHED' ORDER BY version DESC LIMIT 1`,
    );
    return result ?? { id: null, version: 0, tokens: defaultTheme };
  }

  drafts() {
    return this.db.query(
      `SELECT id,version,status,tokens,created_at FROM global_settings_versions ORDER BY version DESC LIMIT 30`,
    );
  }

  async draft(admin_id: string, tokens: ThemeTokens) {
    let t: ThemeTokens;
    try {
      t = validateTheme(tokens);
    } catch {
      throw new BadRequestException({ code: "THEME_INVALID_OR_LOW_CONTRAST" });
    }
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(309977)");
      const r = await c.query<{ id: string; version: number }>(
        `INSERT INTO global_settings_versions(version,status,tokens,created_by) VALUES((SELECT COALESCE(MAX(version),0)+1 FROM global_settings_versions),'DRAFT',$1::jsonb,$2) RETURNING id,version`,
        [JSON.stringify(t), admin_id],
      );
      await c.query("INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,$2,$3)", [
        admin_id,
        "THEME_DRAFTED",
        r.rows[0]!.id,
      ]);
      return r.rows[0];
    });
  }

  async publish(admin_id: string, id: string) {
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(309977)");
      const row = await c.query<{ tokens: ThemeTokens; status: string }>(
        `SELECT tokens,status FROM global_settings_versions WHERE id=$1 FOR UPDATE`,
        [id],
      );
      if (row.rows[0]?.status !== "DRAFT") throw new ConflictException({ code: "THEME_NOT_DRAFT" });
      validateTheme(row.rows[0].tokens);
      await c.query(
        `UPDATE global_settings_versions SET status='ARCHIVED' WHERE status='PUBLISHED'`,
      );
      const out = await c.query(
        `UPDATE global_settings_versions SET status='PUBLISHED',published_at=now() WHERE id=$1 RETURNING id,version,status,tokens`,
        [id],
      );
      await c.query("INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,$2,$3)", [
        admin_id,
        "THEME_PUBLISHED",
        id,
      ]);
      await c.query("INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES($1,$2,$3)", [
        "ThemePublished",
        id,
        JSON.stringify({ theme_version: out.rows[0].version }),
      ]);
      return out.rows[0];
    });
  }

  async rollback(admin_id: string, archived_id: string) {
    const saved = await this.db.one<{ tokens: ThemeTokens }>(
      `SELECT tokens FROM global_settings_versions WHERE id=$1 AND status IN ('ARCHIVED','PUBLISHED')`,
      [archived_id],
    );
    if (!saved) throw new NotFoundException();
    const draft = await this.draft(admin_id, saved.tokens);
    if (!draft) throw new NotFoundException();
    return this.publish(admin_id, draft.id);
  }

  sellerApplications() {
    return this.db.query(
      `SELECT a.id,a.user_id,a.display_name,a.status,a.created_at FROM seller_applications a ORDER BY created_at DESC`,
    );
  }

  async approveSeller(admin_id: string, application_id: string) {
    return this.db.transaction(async (c) => {
      const a = await c.query<{
        id: string;
        user_id: string;
        display_name: string;
        status: string;
      }>(`SELECT id,user_id,display_name,status FROM seller_applications WHERE id=$1 FOR UPDATE`, [
        application_id,
      ]);
      if (a.rows[0]?.status !== "APPLIED")
        throw new ConflictException({ code: "SELLER_APPLICATION_NOT_PENDING" });
      const seller = await c.query(
        `INSERT INTO sellers(owner_user_id,display_name,status) VALUES($1,$2,'APPROVED') RETURNING id`,
        [a.rows[0].user_id, a.rows[0].display_name],
      );
      await c.query(`UPDATE seller_applications SET status='APPROVED' WHERE id=$1`, [
        application_id,
      ]);
      await c.query("INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,$2,$3)", [
        admin_id,
        "SELLER_APPROVED",
        seller.rows[0].id,
      ]);
      await c.query("INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES($1,$2,$3)", [
        "SellerApproved",
        seller.rows[0].id,
        JSON.stringify({ seller_id: seller.rows[0].id }),
      ]);
      return { seller_id: seller.rows[0].id, status: "APPROVED" };
    });
  }

  sellers() {
    return this.db.query(
      `SELECT id,display_name,status,created_at FROM sellers ORDER BY created_at DESC LIMIT 100`,
    );
  }

  async suspendSeller(admin_id: string, seller_id: string, reason: string) {
    return this.db.transaction(async (c) => {
      const r = await c.query<{ id: string; status: string }>(
        `UPDATE sellers SET status='SUSPENDED'
        WHERE id=$1 AND status='APPROVED' RETURNING id,status`,
        [seller_id],
      );
      if (!r.rows[0]) throw new ConflictException({ code: "SELLER_NOT_ACTIVE" });
      await c.query(
        `UPDATE seller_listings SET status='PAUSED' WHERE seller_id=$1 AND status='PUBLISHED'`,
        [seller_id],
      );
      await c.query(
        `INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,'SELLER_SUSPENDED',$2)`,
        [admin_id, seller_id],
      );
      await c.query(
        `INSERT INTO trust_cases(subject_type,subject_id,reason,status,opened_by)
         VALUES('SELLER',$1,$2,'INVESTIGATING',$3)`,
        [seller_id, reason, admin_id],
      );
      await c.query(
        `INSERT INTO outbox_events(event_type,aggregate_id,payload) VALUES('SellerSuspended',$1,$2)`,
        [seller_id, JSON.stringify({ seller_id })],
      );
      return r.rows[0];
    });
  }

  async rejectApplication(admin_id: string, application_id: string, reason: string) {
    return this.db.transaction(async (c) => {
      const r = await c.query<{ id: string; status: string }>(
        `UPDATE seller_applications SET status='REJECTED' WHERE id=$1 AND status IN ('APPLIED','REVIEWING') RETURNING id,status`,
        [application_id],
      );
      if (!r.rows[0]) throw new ConflictException({ code: "APPLICATION_NOT_PENDING" });
      await c.query(
        `INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,'SELLER_APPLICATION_REJECTED',$2)`,
        [admin_id, application_id],
      );
      await c.query(
        `INSERT INTO trust_cases(subject_type,subject_id,reason,status,opened_by)
      VALUES('APPLICATION',$1,$2,'RESOLVED',$3)`,
        [application_id, reason, admin_id],
      );
      return r.rows[0];
    });
  }

  orders() {
    return this.db.query(
      "SELECT id,buyer_id,status,total_minor,created_at FROM orders ORDER BY created_at DESC LIMIT 100",
    );
  }

  audit() {
    return this.db.query(
      "SELECT id,action,resource_id,created_at FROM audit_events ORDER BY created_at DESC LIMIT 100",
    );
  }

  async updateCategory(
    admin_id: string,
    category_id: string,
    input: CategoryUpdateDto,
  ) {
    const updated = await this.db.one<{
      id: string;
      name: string;
      slug: string;
      icon: string | null;
      image_url: string | null;
    }>(
      `UPDATE categories
       SET image_url = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE image_url END,
           icon = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE icon END
       WHERE id = $1
       RETURNING id, name, slug, icon, image_url`,
      [category_id, input.image_url ?? null, input.icon ?? null],
    );
    if (!updated) throw new NotFoundException({ code: "CATEGORY_NOT_FOUND" });
    await this.db.query(
      "INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,'CATEGORY_UPDATED',$2)",
      [admin_id, category_id],
    );
    return updated;
  }

  users() {
    return this.db.query(
      `SELECT u.id, u.email, u.display_name, u.role, u.created_at,
              COALESCE(u.avatar_url, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80') as avatar_url,
              s.id as seller_id, s.display_name as seller_name, s.status as seller_status,
              (SELECT count(*) FROM orders o WHERE o.buyer_id = u.id)::int as orders_count
       FROM user_profiles u
       LEFT JOIN sellers s ON s.owner_user_id = u.id
       ORDER BY u.created_at DESC LIMIT 100`,
    );
  }
}
