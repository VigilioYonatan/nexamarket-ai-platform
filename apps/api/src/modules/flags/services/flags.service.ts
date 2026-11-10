import { Injectable } from "@nestjs/common";
import { PgStore } from "../../../infrastructure/db.js";
import type { FlagName } from "../dtos/flags.dto.js";

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly db: PgStore) {}

  list() {
    return this.db.query<{ name: string; enabled: boolean; updated_at: Date }>(
      `SELECT name,enabled,updated_at FROM feature_flags ORDER BY name`,
    );
  }

  publicFlags() {
    return this.db.query<{ name: string; enabled: boolean }>(
      `SELECT name,enabled FROM feature_flags WHERE name IN ('reviews','support','ai_shopping','public_promotions') ORDER BY name`,
    );
  }

  async enabled(name: FlagName) {
    const f = await this.db.one<{ enabled: boolean }>(
      `SELECT enabled FROM feature_flags WHERE name=$1`,
      [name],
    );
    return f?.enabled ?? false;
  }

  async update(admin_id: string, name: FlagName, enabled: boolean) {
    return this.db.transaction(async (c) => {
      const row = await c.query<{ name: string; enabled: boolean }>(
        `INSERT INTO feature_flags(name,enabled,updated_by,updated_at) VALUES($1,$2,$3,now())
    ON CONFLICT(name) DO UPDATE SET enabled=EXCLUDED.enabled,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING name,enabled`,
        [name, enabled, admin_id],
      );
      await c.query(`INSERT INTO audit_events(actor_user_id,action) VALUES($1,$2)`, [
        admin_id,
        `FEATURE_FLAG_${name}_${enabled ? "ON" : "OFF"}`,
      ]);
      return row.rows[0];
    });
  }
}
