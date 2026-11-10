import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { cfg } from "../../../config.js";
import { PgStore } from "../../../infrastructure/db.js";
import { sha256Hex } from "../../../shared/http.js";

export function safePath(p: unknown) {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.includes("\\")
    ? p
    : "/";
}

export function rand() {
  return randomBytes(32).toString("base64url");
}

const issuer = cfg.KEYCLOAK_ISSUER.replace(/\/$/, "");
const internal =
  process.env.KEYCLOAK_INTERNAL_BASE?.replace(/\/$/, "") ?? issuer.replace(/\/realms\/[^/]+$/, "");

export function endpoint(path: string) {
  return `${internal}/realms/${issuer.split("/").at(-1)}/protocol/openid-connect/${path}`;
}

@Injectable()
export class AuthService {
  constructor(private readonly db: PgStore) {}

  async begin(kind: "login" | "register", provider: string | undefined, returnTo: unknown) {
    if (provider && !["google", "facebook"].includes(provider))
      throw new BadRequestException({ code: "UNKNOWN_PROVIDER" });
    const state = rand(),
      nonce = rand(),
      verifier = rand();
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    await this.db.query(
      `INSERT INTO oauth_flows(state_hash,verifier,nonce,return_to,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')`,
      [sha256Hex(state), verifier, nonce, safePath(returnTo)],
    );
    const url = new URL(
      `${issuer}/protocol/openid-connect/${kind === "register" ? "registrations" : "auth"}`,
    );
    const query: Record<string, string> = {
      client_id: cfg.KEYCLOAK_CLIENT_ID,
      redirect_uri: `${cfg.PUBLIC_URL}/auth/callback`,
      response_type: "code",
      scope: "openid profile email",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
      nonce,
    };
    if (provider) query.kc_idp_hint = provider;
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return url.toString();
  }

  async finish(code: string, state: string) {
    if (!code || !state) throw new UnauthorizedException({ code: "INVALID_OAUTH_CALLBACK" });
    const flow = await this.db.one<{ verifier: string; nonce: string; return_to: string }>(
      `DELETE FROM oauth_flows WHERE state_hash=$1 AND expires_at>now() RETURNING verifier,nonce,return_to`,
      [sha256Hex(state)],
    );
    if (!flow) throw new UnauthorizedException({ code: "OAUTH_STATE_EXPIRED" });
    const response = await fetch(endpoint("token"), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${cfg.PUBLIC_URL}/auth/callback`,
        client_id: cfg.KEYCLOAK_CLIENT_ID,
        client_secret: cfg.KEYCLOAK_CLIENT_SECRET,
        code_verifier: flow.verifier,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new UnauthorizedException({ code: "TOKEN_EXCHANGE_FAILED" });
    const body = (await response.json()) as { id_token?: string };
    if (!body.id_token) throw new UnauthorizedException({ code: "NO_ID_TOKEN" });
    const jwks = createRemoteJWKSet(
      new URL(`${internal}/realms/${issuer.split("/").at(-1)}/protocol/openid-connect/certs`),
    );
    const { payload } = await jwtVerify(body.id_token, jwks, {
      issuer,
      audience: cfg.KEYCLOAK_CLIENT_ID,
      algorithms: ["RS256", "ES256"],
      clockTolerance: 5,
    });
    if (payload.nonce !== flow.nonce || !payload.sub)
      throw new UnauthorizedException({ code: "INVALID_OIDC_NONCE" });
    if (payload.azp && payload.azp !== cfg.KEYCLOAK_CLIENT_ID)
      throw new UnauthorizedException({ code: "INVALID_AUTHORIZED_PARTY" });
    const email = typeof payload.email === "string" ? payload.email : null;
    const name =
      typeof payload.name === "string" ? payload.name : (email?.split("@")[0] ?? "Comprador");
    const profile = await this.db.one<{ id: string }>(
      `INSERT INTO user_profiles(subject,email,display_name) VALUES($1,$2,$3)
      ON CONFLICT(subject) DO UPDATE SET email=EXCLUDED.email,display_name=EXCLUDED.display_name
      RETURNING id`,
      [payload.sub, email, name],
    );
    if (!profile) throw new Error("Profile creation failed");
    const session = rand(),
      csrf = rand();
    await this.db.query(
      `INSERT INTO user_sessions(user_id,session_hash,expires_at) VALUES($1,$2,now()+($3||' hours')::interval)`,
      [profile.id, sha256Hex(session), String(cfg.SESSION_TTL_HOURS)],
    );
    return { session, csrf, return_to: flow.return_to };
  }

  async logout(token: string | undefined) {
    if (token)
      await this.db.query("UPDATE user_sessions SET revoked_at=now() WHERE session_hash=$1", [
        sha256Hex(token),
      ]);
  }

  async devLogin(roleInput?: string, emailInput?: string, nameInput?: string) {
    const requestedRole = (roleInput ?? "BUYER").toUpperCase();
    let email = emailInput?.trim().toLowerCase();
    if (!email) {
      if (requestedRole === "ADMIN") email = "admin@test.pe";
      else if (requestedRole === "SELLER") email = "seller@test.pe";
      else email = "buyer@test.pe";
    }

    let profile = await this.db.one<{ id: string; role: string; display_name: string | null }>(
      `SELECT id, role, display_name FROM user_profiles WHERE email = $1`,
      [email],
    );

    if (!profile) {
      const subject = `dev:${email}`;
      const name = nameInput ?? email.split("@")[0] ?? "Usuario";
      profile = await this.db.one<{ id: string; role: string; display_name: string | null }>(
        `INSERT INTO user_profiles(subject, email, display_name, role)
         VALUES($1, $2, $3, $4)
         RETURNING id, role, display_name`,
        [subject, email, name, requestedRole === "ADMIN" ? "ADMIN" : "BUYER"],
      );
    } else if (requestedRole === "ADMIN" && profile.role !== "ADMIN") {
      await this.db.query(`UPDATE user_profiles SET role='ADMIN' WHERE id=$1`, [profile.id]);
      profile.role = "ADMIN";
    }

    if (requestedRole === "SELLER" && profile) {
      const seller = await this.db.one<{ id: string }>(
        `SELECT id FROM sellers WHERE owner_user_id=$1 AND status='APPROVED'`,
        [profile.id],
      );
      if (!seller) {
        await this.db.query(
          `INSERT INTO sellers(owner_user_id, display_name, status)
           VALUES($1, $2, 'APPROVED')
           ON CONFLICT DO NOTHING`,
          [profile.id, `${profile.display_name ?? "Vendedor"} Store`],
        );
      }
    }

    if (!profile) throw new Error("Profile creation failed");

    const session = rand();
    const csrf = rand();
    await this.db.query(
      `INSERT INTO user_sessions(user_id, session_hash, expires_at)
       VALUES($1, $2, now() + ($3 || ' hours')::interval)`,
      [profile.id, sha256Hex(session), String(cfg.SESSION_TTL_HOURS)],
    );

    const fullUser = await this.db.one<{
      user_id: string;
      email: string | null;
      display_name: string | null;
      role: string;
      seller_id: string | null;
      avatar_url: string | null;
    }>(
      `SELECT p.id AS user_id, p.email, p.display_name, p.role, p.avatar_url, s.id AS seller_id
       FROM user_profiles p
       LEFT JOIN sellers s ON s.owner_user_id = p.id AND s.status = 'APPROVED'
       WHERE p.id = $1`,
      [profile.id],
    );

    return {
      session,
      csrf,
      role: fullUser?.role ?? "BUYER",
      seller_id: fullUser?.seller_id ?? null,
      user: fullUser,
    };
  }
}
