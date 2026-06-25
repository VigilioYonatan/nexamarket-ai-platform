import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { PgStore } from "../infrastructure/db.js";
import { AdminGuard, CurrentUser, type Principal, SessionGuard, ZodPipe } from "../shared/http.js";
export const flagName = z.enum(["reviews", "support", "ai_shopping", "public_promotions"]);
export const flagDto = z.object({ enabled: z.boolean() }).strict();
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
  async enabled(name: z.infer<typeof flagName>) {
    const f = await this.db.one<{ enabled: boolean }>(
      `SELECT enabled FROM feature_flags WHERE name=$1`,
      [name],
    );
    return f?.enabled ?? false;
  }
  async update(admin_id: string, name: z.infer<typeof flagName>, enabled: boolean) {
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
@Controller("api/v1/features")
export class PublicFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}
  @Get() list() {
    return this.flags.publicFlags();
  }
}
@Controller("api/v1/admin/features")
@UseGuards(SessionGuard, AdminGuard)
export class AdminFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}
  @Get() list() {
    return this.flags.list();
  }
  @Patch(":name") update(
    @CurrentUser() p: Principal,
    @Param("name") name: string,
    @Body(new ZodPipe(flagDto)) dto: z.infer<typeof flagDto>,
  ) {
    return this.flags.update(p.user_id, parseFlag(name), dto.enabled);
  }
}

function parseFlag(value: string): z.infer<typeof flagName> {
  const r = flagName.safeParse(value);
  if (!r.success) throw new BadRequestException({ code: "UNKNOWN_FLAG" });
  return r.data;
}
