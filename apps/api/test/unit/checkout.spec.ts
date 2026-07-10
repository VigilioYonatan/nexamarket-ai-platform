import { describe, expect, it, vi } from "vitest";
import type { PgStore } from "../../src/infrastructure/db.js";
import { CheckoutService } from "../../src/modules/checkout.js";

describe("Checkout con idempotencia", () => {
  it("rechaza la ausencia de clave de idempotencia", async () => {
    const svc = new CheckoutService({ transaction: vi.fn() } as unknown as PgStore);
    await expect(svc.create("buyer", "no")).rejects.toMatchObject({
      response: { code: "IDEMPOTENCY_KEY_REQUIRED" },
    });
  });
  it("reutiliza pedido creado bajo la misma clave", async () => {
    const queries: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes("FROM orders WHERE buyer_id"))
          return { rows: [{ id: "prior-order" }], rowCount: 1 };
        if (sql.includes("FROM orders o JOIN checkout_sessions"))
          return {
            rows: [{ id: "prior-order", status: "AWAITING_PAYMENT", total_minor: 100 }],
            rowCount: 1,
          };
        if (sql.includes("FROM seller_orders so JOIN sellers"))
          return { rows: [{ seller_order_id: "group-1", subtotal_minor: 100 }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      }),
    };
    const db = {
      transaction: (fn: (x: typeof client) => unknown) => fn(client),
    } as unknown as PgStore;
    const svc = new CheckoutService(db);
    const result = await svc.create("buyer", "DUPLICATEKEY123456");
    expect(result.order).toMatchObject({ id: "prior-order" });
    expect(queries.some((x) => x.includes("UPDATE inventory_stock"))).toBe(false);
    expect(queries.some((x) => x.includes("INSERT INTO orders"))).toBe(false);
  });
  it("carrito vacío nunca reserva inventario", async () => {
    const queries: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        return { rows: [], rowCount: 0 };
      }),
    };
    const db = {
      transaction: (fn: (x: typeof client) => unknown) => fn(client),
    } as unknown as PgStore;
    const svc = new CheckoutService(db);
    await expect(svc.create("buyer", "CARTEMPTYKEY12345")).rejects.toMatchObject({
      response: { code: "EMPTY_CART" },
    });
    expect(queries.some((x) => x.includes("UPDATE inventory_stock"))).toBe(false);
  });
});
