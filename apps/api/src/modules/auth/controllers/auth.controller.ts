import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { cfg, secureCookies } from "../../../config.js";
import { PgStore } from "../../../infrastructure/db.js";
import { CurrentUser, type Principal, SessionGuard, sha256Hex } from "../../../shared/http.js";
import { AuthService, endpoint, safePath } from "../services/auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly db: PgStore,
  ) {}

  @Get("login")
  async login(
    @Query("provider") provider: string | undefined,
    @Query("return_to") ret: string | undefined,
    @Req() req: Request,
    @Res() response: Response,
  ) {
    if (cfg.NODE_ENV !== "production") {
      const isUp = await fetch(endpoint("auth"), {
        method: "HEAD",
        signal: AbortSignal.timeout(600),
      })
        .then(() => true)
        .catch(() => false);
      if (!isUp) {
        const webOrigin = req.headers.referer
          ? new URL(req.headers.referer).origin
          : cfg.WEB_ORIGIN;
        response.redirect(
          303,
          `${webOrigin}/login?keycloak_offline=1&return_to=${encodeURIComponent(safePath(ret))}`,
        );
        return;
      }
    }
    response.redirect(302, await this.service.begin("login", provider, ret));
  }

  @Get("register")
  async register(
    @Query("return_to") ret: string | undefined,
    @Req() req: Request,
    @Res() response: Response,
  ) {
    if (cfg.NODE_ENV !== "production") {
      const isUp = await fetch(endpoint("registrations"), {
        method: "HEAD",
        signal: AbortSignal.timeout(600),
      })
        .then(() => true)
        .catch(() => false);
      if (!isUp) {
        const webOrigin = req.headers.referer
          ? new URL(req.headers.referer).origin
          : cfg.WEB_ORIGIN;
        response.redirect(
          303,
          `${webOrigin}/register?keycloak_offline=1&return_to=${encodeURIComponent(safePath(ret))}`,
        );
        return;
      }
    }
    response.redirect(302, await this.service.begin("register", undefined, ret));
  }

  @Get("dev-login")
  async devLoginGet(
    @Query("role") role: string | undefined,
    @Query("email") email: string | undefined,
    @Query("return_to") ret: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (cfg.NODE_ENV === "production") {
      throw new UnauthorizedException({ code: "DEV_LOGIN_DISABLED_IN_PROD" });
    }
    const out = await this.service.devLogin(role, email);
    res.cookie("nexa_session", out.session, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "lax",
      path: "/",
      maxAge: cfg.SESSION_TTL_HOURS * 3600000,
    });
    res.cookie("nexa_csrf", out.csrf, {
      httpOnly: false,
      secure: secureCookies,
      sameSite: "lax",
      path: "/",
      maxAge: cfg.SESSION_TTL_HOURS * 3600000,
    });
    const webOrigin = req.headers.referer ? new URL(req.headers.referer).origin : cfg.WEB_ORIGIN;
    const dest = safePath(
      ret ?? (out.role === "ADMIN" ? "/admin" : out.seller_id ? "/seller" : "/account"),
    );
    res.redirect(303, `${webOrigin}${dest}`);
  }

  @Post("dev-login")
  async devLoginPost(
    @Body() body: { role?: string; email?: string; name?: string },
    @Res() res: Response,
  ) {
    if (cfg.NODE_ENV === "production") {
      throw new UnauthorizedException({ code: "DEV_LOGIN_DISABLED_IN_PROD" });
    }
    const out = await this.service.devLogin(body?.role, body?.email, body?.name);
    res.cookie("nexa_session", out.session, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "lax",
      path: "/",
      maxAge: cfg.SESSION_TTL_HOURS * 3600000,
    });
    res.cookie("nexa_csrf", out.csrf, {
      httpOnly: false,
      secure: secureCookies,
      sameSite: "lax",
      path: "/",
      maxAge: cfg.SESSION_TTL_HOURS * 3600000,
    });
    res.json({ authenticated: true, user: out.user, csrf: out.csrf });
  }

  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    const out = await this.service.finish(code, state);
    res.cookie("nexa_session", out.session, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "lax",
      path: "/",
      maxAge: cfg.SESSION_TTL_HOURS * 3600000,
    });
    res.cookie("nexa_csrf", out.csrf, {
      httpOnly: false,
      secure: secureCookies,
      sameSite: "lax",
      path: "/",
      maxAge: cfg.SESSION_TTL_HOURS * 3600000,
    });
    res.redirect(303, `${cfg.WEB_ORIGIN}${out.return_to}`);
  }

  @Get("session")
  async session(@Req() req: Request) {
    const token = req.cookies?.nexa_session as string | undefined;
    if (!token) return { authenticated: false };
    const u = await this.db.one<{
      user_id: string;
      email: string | null;
      display_name: string | null;
      role: string;
      seller_id: string | null;
      avatar_url: string | null;
    }>(
      `SELECT p.id AS user_id,p.email,p.display_name,p.role,p.avatar_url,s.id AS seller_id FROM user_sessions us
      JOIN user_profiles p ON p.id=us.user_id LEFT JOIN sellers s ON s.owner_user_id=p.id AND s.status='APPROVED'
      WHERE us.session_hash=$1 AND us.expires_at>now() AND us.revoked_at IS NULL`,
      [sha256Hex(token)],
    );
    return u ? { authenticated: true, user: u } : { authenticated: false };
  }

  @Post("logout")
  @UseGuards(SessionGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    await this.service.logout(req.cookies?.nexa_session);
    res.clearCookie("nexa_session", { path: "/" });
    res.clearCookie("nexa_csrf", { path: "/" });
    res.status(204).end();
  }

  @Get("me")
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: Principal) {
    return user;
  }
}
