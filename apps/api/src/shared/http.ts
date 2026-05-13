import { createHash, timingSafeEqual } from "node:crypto";
import {
  BadRequestException,
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  type PipeTransform,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { ZodType } from "zod";
import { cfg } from "../config.js";
import { PgStore } from "../infrastructure/db.js";

export type Principal = {
  user_id: string;
  subject: string;
  email: string | null;
  display_name: string | null;
  role: "BUYER" | "ADMIN" | "STAFF";
  seller_id: string | null;
  avatar_url?: string | null;
};
export type SessionRequest = Request & { principal?: Principal };
export class ZodPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}
  transform(value: unknown) {
    const out = this.schema.safeParse(value);
    if (!out.success)
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        issues: out.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    return out.data;
  }
}
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const user = ctx.switchToHttp().getRequest<SessionRequest>().principal;
    if (!user) throw new UnauthorizedException();
    return user;
  },
);
export function sha256Hex(s: string) {
  return createHash("sha256").update(s).digest("hex");
}
function equalStr(a: string, b: string): boolean {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly db: PgStore) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<SessionRequest>();
    const token = req.cookies?.nexa_session as string | undefined;
    if (!token || !/^[-_A-Za-z0-9]{32,128}$/.test(token))
      throw new UnauthorizedException({ code: "AUTH_REQUIRED" });
    const session = await this.db.one<Principal>(
      `SELECT p.id AS user_id,p.subject,p.email,p.display_name,
      p.avatar_url,
      CASE WHEN p.role='ADMIN' THEN 'ADMIN' WHEN p.role='STAFF' THEN 'STAFF' ELSE 'BUYER' END AS role,
      s.id AS seller_id FROM user_sessions us JOIN user_profiles p ON p.id=us.user_id
      LEFT JOIN sellers s ON s.owner_user_id=p.id AND s.status='APPROVED'
      WHERE us.session_hash=$1 AND us.expires_at>now() AND us.revoked_at IS NULL`,
      [sha256Hex(token)],
    );
    if (!session) throw new UnauthorizedException({ code: "SESSION_EXPIRED" });
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const csrf = req.cookies?.nexa_csrf as string | undefined;
      const provided = req.get("x-csrf-token");
      const origin = req.get("origin");
      if (!csrf || !provided || !equalStr(csrf, provided))
        throw new ForbiddenException({ code: "CSRF_DENIED" });
      const target = new URL(`${req.protocol}://${req.get("host")}`);
      if (origin) {
        let claimed: URL;
        try {
          claimed = new URL(origin);
        } catch {
          throw new ForbiddenException({ code: "ORIGIN_DENIED" });
        }
        const allowedOrigins = new Set([
          target.origin,
          new URL(cfg.PUBLIC_URL).origin,
          new URL(cfg.WEB_ORIGIN).origin,
        ]);
        if (cfg.NODE_ENV !== "production") {
          allowedOrigins.add("http://localhost:5173");
          allowedOrigins.add("http://localhost:5174");
          allowedOrigins.add("http://localhost:5175");
          allowedOrigins.add("http://127.0.0.1:5173");
          allowedOrigins.add("http://127.0.0.1:5174");
          allowedOrigins.add("http://127.0.0.1:5175");
        }
        if (!allowedOrigins.has(claimed.origin))
          throw new ForbiddenException({ code: "ORIGIN_DENIED" });
      }
    }
    req.principal = session;
    return true;
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const u = ctx.switchToHttp().getRequest<SessionRequest>().principal;
    if (u?.role !== "ADMIN") throw new ForbiddenException({ code: "ADMIN_REQUIRED" });
    return true;
  }
}
@Injectable()
export class SellerGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const u = ctx.switchToHttp().getRequest<SessionRequest>().principal;
    if (!u?.seller_id) throw new ForbiddenException({ code: "SELLER_NOT_APPROVED" });
    return true;
  }
}

/** Validate path UUID at the HTTP edge. Never expose PostgreSQL UUID cast errors. */
export function parseUuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new BadRequestException({ code: "INVALID_RESOURCE_ID" });
  return value;
}

@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    return parseUuid(value);
  }
}
