import { describe, expect, it, vi } from "vitest";
import type { PgStore } from "../../src/infrastructure/db.js";
import { OrdersService } from "../../src/modules/orders.js";
import { ReturnsService } from "../../src/modules/returns.js";
import { SellerService } from "../../src/modules/seller.js";

type Row = { id: string; status?: string; order_id?: string };
function fakeTransaction(
  reply: (sql: string, values: unknown[]) => { rows: Row[]; rowCount: number },
) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    return reply(sql, values);
  });
  const db = {
    transaction: vi.fn(async <T>(fn: (c: { query: typeof query }) => Promise<T>) => fn({ query })),
  } as unknown as PgStore;
  return { db, calls, query };
}

describe("Devoluciones: el motivo y la identidad de quien decide quedan persistidos", () => {
  it("conserva una decisión auditada sin invocar Mercado Pago", async () => {
    const { db, calls } = fakeTransaction((sql) => ({
      rows: sql.includes("UPDATE return_requests")
        ? [{ id: "return-1", status: "ACCEPTED", order_id: "order-1" }]
        : [],
      rowCount: 1,
    }));
    const service = new ReturnsService(db);
    const answer = await service.decide("admin-1", "return-1", {
      decision: "ACCEPTED",
      reason: "Se comprobó la documentación de la compra",
    });
    expect(answer.notice).toMatch(/No se ha ejecutado/);
    const update = calls.find((c) => c.sql.includes("UPDATE return_requests"));
    expect(update?.sql).toContain("decision_reason=$3");
    expect(update?.sql).toContain("decided_by=$4");
    expect(update?.values).toEqual([
      "return-1",
      "ACCEPTED",
      "Se comprobó la documentación de la compra",
      "admin-1",
    ]);
    expect(calls.some((c) => /payments|refunds|mercadopago/i.test(c.sql))).toBe(false);
  });
  it("rechaza la modificación de una solicitud no accionable", async () => {
    const { db, calls } = fakeTransaction(() => ({ rows: [], rowCount: 0 }));
    await expect(
      new ReturnsService(db).decide("admin", "done", {
        decision: "REJECTED",
        reason: "La devolución ya se tramitó",
      }),
    ).rejects.toMatchObject({ response: { code: "RETURN_NOT_ACTIONABLE" } });
    expect(calls).toHaveLength(1);
  });
});

describe("Entrega: el servidor comprueba pertenencia y transición de estado", () => {
  it("rechaza confirmar una entrega ajena o que no esté enviada", async () => {
    const { db, calls } = fakeTransaction(() => ({ rows: [], rowCount: 0 }));
    await expect(
      new OrdersService(db).confirmDelivery("buyer", "order", "seller-group"),
    ).rejects.toMatchObject({ response: { code: "DELIVERY_NOT_CONFIRMABLE" } });
    expect(calls[0]?.sql).toContain("o.buyer_id=$3");
    expect(calls[0]?.sql).toContain("so.status='SHIPPED'");
    expect(calls).toHaveLength(1);
  });
  it("confirma la entrega y actualiza el agregado solo con todos los grupos entregados", async () => {
    const { db, calls } = fakeTransaction((sql) => ({
      rows: sql.includes("UPDATE seller_orders") ? [{ id: "group" }] : [],
      rowCount: 1,
    }));
    expect(await new OrdersService(db).confirmDelivery("buyer", "order", "group")).toMatchObject({
      status: "DELIVERED",
    });
    expect(calls.some((c) => c.sql.includes("UPDATE shipments SET status='DELIVERED'"))).toBe(true);
    expect(
      calls.find((c) => c.sql.includes("UPDATE orders o SET status='DELIVERED'"))?.sql,
    ).toMatch(/NOT EXISTS/);
    expect(calls.some((c) => c.sql.includes("SellerOrderDelivered"))).toBe(true);
  });
});

describe("Estado agregado de envío", () => {
  it("no marca el pedido completo enviado mientras haya otros vendedores pendientes", async () => {
    const { db, calls } = fakeTransaction((sql) => ({
      rows: sql.includes("UPDATE seller_orders") ? [{ id: "group", order_id: "order" }] : [],
      rowCount: 1,
    }));
    const result = await new SellerService(db).markShipped("seller", "group", "TRACK-3456");
    expect(result.status).toBe("SHIPPED");
    const aggregation = calls.find((c) => c.sql.includes("UPDATE orders o SET status='SHIPPED'"));
    expect(aggregation?.sql).toContain("NOT EXISTS");
    expect(aggregation?.sql).toContain("so.status NOT IN ('SHIPPED','DELIVERED')");
  });
});
