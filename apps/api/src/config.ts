import { config as loadEnv } from "dotenv";

loadEnv({ path: process.env.ENV_FILE ?? [".env", "../../.env", "../.env"], quiet: true });

import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  PUBLIC_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(),
  KEYCLOAK_ISSUER: z.string().url(),
  KEYCLOAK_CLIENT_ID: z.string().min(1),
  KEYCLOAK_CLIENT_SECRET: z.string().min(1),
  MP_CLIENT_ID: z.string().min(1),
  MP_CLIENT_SECRET: z.string().min(1),
  MP_REDIRECT_URI: z.string().url(),
  MP_PUBLIC_KEY: z.string().min(1),
  MP_WEBHOOK_SECRET: z.string().min(1),
  MP_TOKEN_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  AI_BASE_URL: z.string().url().default("http://ai:8100"),
  INTERNAL_METRICS_TOKEN: z.string().min(16),
  VALKEY_URL: z.string().url().optional(),
  APP_VERSION: z.string().default("dev"),
});
const result = schema.safeParse(process.env);
if (!result.success)
  throw new Error(
    `Invalid runtime configuration: ${result.error.issues.map((i) => i.path.join(".")).join(",")}`,
  );
export const cfg = result.data;
export const secureCookies = cfg.NODE_ENV !== "development" && cfg.NODE_ENV !== "test";
