import { afterEach, describe, expect, it, vi } from "vitest";
import { api, money, newKey, toError } from "../src/lib/api";

afterEach(() => vi.unstubAllGlobals());
describe("Cliente HTTP del storefront", () => {
  it("formatea moneda PEN con centavos exactos", () => {
    expect(money(100)).toContain("1.00");
    expect(money(0)).toContain("0.00");
  });
  it("idempotency keys son tokens independientes", () => {
    const a = newKey(),
      b = newKey();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });
  it("método GET usa same-origin sin Authorization", async () => {
    const mock = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", mock);
    await expect(api("/api/v1/products")).resolves.toEqual({ items: [] });
    expect(mock.mock.calls[0]?.[1]).toMatchObject({ method: "GET", credentials: "same-origin" });
  });
  it("POST adjunta CSRF y JSON, sin colocar tokens bearer", async () => {
    vi.stubGlobal("document", { cookie: "nexa_csrf=CSRF_123" });
    const mock = vi.fn(
      async () =>
        new Response(JSON.stringify({ saved: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", mock);
    await api("/api/v1/cart/items", { method: "POST", body: JSON.stringify({ quantity: 1 }) });
    const init = (mock.mock.calls[0]?.[1] ?? {}) as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("x-csrf-token")).toBe("CSRF_123");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.has("authorization")).toBe(false);
  });
  it("fallo HTTP no se considera éxito", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code: "INSUFFICIENT_STOCK", message: "Sin stock" }), {
            status: 409,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    await expect(api("/api/v1/products")).rejects.toMatchObject({
      message: "Sin stock",
      code: "INSUFFICIENT_STOCK",
      status: 409,
    });
  });
  it("maneja errores desconocidos", () => expect(toError(null)).toContain("error"));
});
