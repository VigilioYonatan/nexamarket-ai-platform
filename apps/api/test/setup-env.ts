/** Only test values. Production tests are forbidden from using this local configuration.
 * External provider calls still require explicit sandbox tests and credentials. */
if (process.env.NODE_ENV === "production")
  throw new Error("Refusing Vitest with NODE_ENV=production");
process.env.NODE_ENV = "test";
const defaults: Record<string, string> = {
  DATABASE_URL: "postgresql://test:test_pass_only_local@127.0.0.1:5445/nexamarket_test",
  PUBLIC_URL: "http://localhost:5173",
  WEB_ORIGIN: "http://localhost:5173",
  KEYCLOAK_ISSUER: "http://127.0.0.1:8080/identity/realms/nexamarket",
  KEYCLOAK_CLIENT_ID: "test-bff",
  KEYCLOAK_CLIENT_SECRET: "dummy-unit-only",
  MP_CLIENT_ID: "dummy-test",
  MP_CLIENT_SECRET: "dummy-unit-only",
  MP_REDIRECT_URI: "http://localhost:5173/integrations/mercado-pago/oauth/callback",
  MP_PUBLIC_KEY: "dummy-public",
  MP_WEBHOOK_SECRET: "dummy-signature-secret",
  MP_TOKEN_ENCRYPTION_KEY: "a".repeat(64),
  INTERNAL_METRICS_TOKEN: "dummy-metrics-test-only",
  AI_BASE_URL: "http://127.0.0.1:8100",
};
for (const [key, value] of Object.entries(defaults)) process.env[key] ??= value;
