import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

// The module performs runtime config validation. Set dummy values for isolated unit tests only.
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.PUBLIC_URL ??= "http://localhost:5173";
process.env.WEB_ORIGIN ??= "http://localhost:5173";
process.env.KEYCLOAK_ISSUER ??= "http://localhost:8080/identity/realms/nexamarket";
process.env.KEYCLOAK_CLIENT_ID ??= "test";
process.env.KEYCLOAK_CLIENT_SECRET ??= "test";
process.env.MP_CLIENT_ID ??= "test";
process.env.MP_CLIENT_SECRET ??= "test";
process.env.MP_REDIRECT_URI ??= "http://localhost:5173/integrations/mercado-pago/oauth/callback";
process.env.MP_PUBLIC_KEY ??= "test";
process.env.MP_WEBHOOK_SECRET ??= "test-secret";
process.env.MP_TOKEN_ENCRYPTION_KEY ??= "a".repeat(64);
process.env.INTERNAL_METRICS_TOKEN ??= "token-token-token-token";
const { providerMinor, verifyMpSignature } = await import("../../src/modules/payments.js");
describe("Verificación de Mercado Pago, sin respuestas simuladas de éxito", () => {
  it.each([
    ["123.45", 12345],
    [123, 12300],
    ["0.01", 1],
    ["50.5", 5050],
  ])("acepta importe %s y devuelve %i centavos", (input, expected) =>
    expect(providerMinor(input)).toBe(expected),
  );
  it.each(["-10", "1.999", "Infinity", "1e3", "abc", null, undefined])(
    "rechaza importe no canónico %s",
    (value) => expect(() => providerMinor(value)).toThrow(),
  );
  it("firma válida con timestamp y request-id", () => {
    const now = Date.now(),
      ts = String(Math.floor(now / 1000)),
      secret = "not-real-secret",
      dataId = "123456789",
      reqId = "request-abc";
    const signature = createHmac("sha256", secret)
      .update(`id:${dataId};request-id:${reqId};ts:${ts};`)
      .digest("hex");
    expect(verifyMpSignature(`ts=${ts},v1=${signature}`, reqId, dataId, secret, now)).toBe(true);
    expect(
      verifyMpSignature(`ts=${ts},v1=${signature}`, `${reqId}-evil`, dataId, secret, now),
    ).toBe(false);
    expect(
      verifyMpSignature(`ts=${ts},v1=${signature}`, reqId, dataId, secret, now + 3600000),
    ).toBe(false);
    expect(verifyMpSignature(undefined, reqId, dataId, secret, now)).toBe(false);
  });
});
