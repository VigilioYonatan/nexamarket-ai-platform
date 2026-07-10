import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PgStore } from "../../src/infrastructure/db.js";
import { FeatureFlagsService } from "../../src/modules/flags.js";
import { SupportService } from "../../src/modules/support.js";
import { TrustService } from "../../src/modules/trust.js";

/** No mock DB: requires disposable migrated nexa_test instance with current migrations.
 * Never use a production URI or fallback. CI destroys test database and volumes. */
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !/\/nexamarket_test(\?|$)/.test(testUrl))
  throw new Error("Explicit nexa_test PostgreSQL URL required");
let pool: Pool;
const ids = {
  buyer: randomUUID(),
  other: randomUUID(),
  admin: randomUUID(),
  sellerOwner: randomUUID(),
  seller: randomUUID(),
  category: randomUUID(),
  product: randomUUID(),
  listing: randomUUID(),
  order: randomUUID(),
  group: randomUUID(),
};
const transact = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
};
const store = {
  query: async (sql: string, args: unknown[] = []) => (await pool.query(sql, args)).rows,
  one: async (sql: string, args: unknown[] = []) => (await pool.query(sql, args)).rows[0],
  transaction: transact,
} as unknown as PgStore;
let trust: TrustService;
let support: SupportService;
beforeAll(async () => {
  pool = new Pool({ connectionString: testUrl });
  await pool.query("SELECT 1 FROM schema_migrations");
  await transact(async (c) => {
    for (const uid of [ids.buyer, ids.other, ids.admin, ids.sellerOwner]) {
      await c.query("INSERT INTO user_profiles(id,subject) VALUES($1,$2)", [
        uid,
        `test:integration:${uid}`,
      ]);
    }
    await c.query(
      "INSERT INTO sellers(id,owner_user_id,display_name,status) VALUES($1,$2,'QA Seller','APPROVED')",
      [ids.seller, ids.sellerOwner],
    );
    await c.query("INSERT INTO categories(id,slug,name) VALUES($1,$2,$3)", [
      ids.category,
      `qa-${ids.category}`,
      "QA Trust",
    ]);
    await c.query(
      "INSERT INTO products(id,category_id,title,description) VALUES($1,$2,'Verified testing product','Test')",
      [ids.product, ids.category],
    );
    await c.query(
      "INSERT INTO seller_listings(id,seller_id,product_id,price_minor,status) VALUES($1,$2,$3,12345,'PUBLISHED')",
      [ids.listing, ids.seller, ids.product],
    );
    await c.query("INSERT INTO inventory_stock(listing_id,on_hand) VALUES($1,5)", [ids.listing]);
    await c.query(
      "INSERT INTO orders(id,buyer_id,idempotency_key,status,total_minor) VALUES($1,$2,$3,'PAID',12345)",
      [ids.order, ids.buyer, `fixture-${ids.order}`],
    );
    await c.query(
      "INSERT INTO seller_orders(id,order_id,seller_id,subtotal_minor,status) VALUES($1,$2,$3,12345,'PAID')",
      [ids.group, ids.order, ids.seller],
    );
    await c.query(
      "INSERT INTO order_lines(order_id,seller_order_id,listing_id,title_snapshot,quantity,price_minor) VALUES($1,$2,$3,'Test',1,12345)",
      [ids.order, ids.group, ids.listing],
    );
  });
  const flags = new FeatureFlagsService(store);
  trust = new TrustService(store, flags);
  support = new SupportService(store, flags);
});
afterAll(async () => {
  if (pool) await pool.end();
});

describe("PostgreSQL real: compra verificada, reseñas y BOLA", () => {
  it("no permite escribir reseña sin ser dueño del pedido", async () => {
    await expect(
      trust.publishReview(ids.other, ids.listing, {
        order_id: ids.order,
        rating: 1,
        comment: "Producto sin compra propia",
      }),
    ).rejects.toMatchObject({ response: { code: "VERIFIED_PURCHASE_REQUIRED" } });
  });
  it("no permite reseñas públicas sin moderación y admite una sola reseña por compra y listing", async () => {
    const created = await trust.publishReview(ids.buyer, ids.listing, {
      order_id: ids.order,
      rating: 5,
      comment: "Compré y recibí el producto correctamente",
    });
    expect(created.status).toBe("PENDING");
    expect(await trust.listReviews(ids.listing)).toHaveLength(0);
    await expect(
      trust.publishReview(ids.buyer, ids.listing, {
        order_id: ids.order,
        rating: 2,
        comment: "Segundo intento debe rechazarse",
      }),
    ).rejects.toMatchObject({ response: { code: "REVIEW_ALREADY_EXISTS" } });
    await trust.moderateReview(ids.admin, created.id, {
      decision: "APPROVED",
      reason: "Comentario verificable de una compra efectiva",
    });
    const visible = await trust.listReviews(ids.listing);
    expect(visible).toHaveLength(1);
    expect(visible[0]).not.toHaveProperty("buyer_id");
    await expect(
      trust.moderateReview(ids.admin, created.id, {
        decision: "REJECTED",
        reason: "Intento de modificar decisión anterior",
      }),
    ).rejects.toMatchObject({ response: { code: "REVIEW_NOT_PENDING" } });
  });
});

describe("PostgreSQL real: soporte privado por comprador", () => {
  let ticketId: string;
  it("rechaza asociar el ticket a un pedido ajeno", async () => {
    await expect(
      support.create(ids.other, {
        order_id: ids.order,
        category: "ORDER",
        subject: "No es mi compra",
        message: "No tengo acceso",
      }),
    ).rejects.toMatchObject({ response: { code: "ORDER_NOT_FOUND" } });
  });
  it("permite abrir y responder ticket propietario", async () => {
    const created = (await support.create(ids.buyer, {
      order_id: ids.order,
      category: "ORDER",
      subject: "Consultar entrega del pedido",
      message: "Por favor confirmen el estado",
    }))!;
    ticketId = created.id;
    expect(created.status).toBe("OPEN");
    const result = await support.detail(ids.buyer, ticketId);
    expect(result.messages).toHaveLength(1);
    expect(result.messages![0]!.author_role).toBe("CUSTOMER");
  });
  it("bloquea acceso y mensajes de un comprador distinto", async () => {
    await expect(support.detail(ids.other, ticketId)).rejects.toMatchObject({
      response: { code: "TICKET_NOT_FOUND" },
    });
    await expect(
      support.addMessage(ids.other, ticketId, { message: "Mensaje intruso" }),
    ).rejects.toMatchObject({ response: { code: "TICKET_NOT_FOUND" } });
  });
  it("admite respuesta de soporte autorizada y cierre auditable", async () => {
    await support.addMessage(ids.admin, ticketId, { message: "Verificaremos tu envío" }, true);
    const thread = await support.detail(ids.buyer, ticketId);
    expect(thread.messages).toHaveLength(2);
    expect(thread.messages![1]!.author_role).toBe("SUPPORT");
    await support.updateStatus(ids.admin, ticketId, { status: "CLOSED" });
    await expect(
      support.addMessage(ids.buyer, ticketId, { message: "Otro comentario" }),
    ).rejects.toMatchObject({ response: { code: "TICKET_CLOSED" } });
  });
});

import { AccountService } from "../../src/modules/account.js";
import { OrdersService } from "../../src/modules/orders.js";
import { ReturnsService } from "../../src/modules/returns.js";
// Shipping/returns are tested against the same disposable fixtures. No PSP calls occur.
import { SellerService } from "../../src/modules/seller.js";

describe("PostgreSQL real: entrega multi-vendedor y revisión de devoluciones", () => {
  it("el comprador ajeno no puede confirmar la entrega", async () => {
    await expect(
      new OrdersService(store).confirmDelivery(ids.other, ids.order, ids.group),
    ).rejects.toMatchObject({ response: { code: "DELIVERY_NOT_CONFIRMABLE" } });
  });
  it("el vendedor publica tracking y el comprador confirma una entrega auditada", async () => {
    await new SellerService(store).markShipped(ids.seller, ids.group, "TRACK-INT-123");
    let order = (await new OrdersService(store).detail(ids.buyer, ids.order)) as unknown as {
      sellers: Array<{ status: string; tracking_number: string }>;
    };
    expect(order.sellers[0]!).toMatchObject({
      status: "SHIPPED",
      tracking_number: "TRACK-INT-123",
    });
    await expect(
      new OrdersService(store).confirmDelivery(ids.other, ids.order, ids.group),
    ).rejects.toMatchObject({ response: { code: "DELIVERY_NOT_CONFIRMABLE" } });
    await new OrdersService(store).confirmDelivery(ids.buyer, ids.order, ids.group);
    order = (await new OrdersService(store).detail(ids.buyer, ids.order)) as unknown as {
      sellers: Array<{ status: string; tracking_number: string }>;
    };
    expect(order.sellers[0]!.status).toBe("DELIVERED");
    await expect(
      new OrdersService(store).confirmDelivery(ids.buyer, ids.order, ids.group),
    ).rejects.toMatchObject({ response: { code: "DELIVERY_NOT_CONFIRMABLE" } });
  });
  it("guarda una decisión de devolución y su razón sin ejecutar reembolso", async () => {
    const request = (await new AccountService(store).createReturn(
      ids.buyer,
      ids.order,
      "El producto tiene una falla documentada",
      ids.group,
    )) as { id: string };
    const result = await new ReturnsService(store).decide(ids.admin, request.id, {
      decision: "ACCEPTED",
      reason: "Evidencia fotográfica y documentación suficientes",
    });
    expect(result.notice).toContain("No se ha ejecutado");
    const persisted = await store.one<{
      decision_reason: string;
      decided_by: string;
      status: string;
    }>("SELECT decision_reason,decided_by,status FROM return_requests WHERE id=$1", [request.id]);
    expect(persisted).toMatchObject({
      decision_reason: "Evidencia fotográfica y documentación suficientes",
      decided_by: ids.admin,
      status: "ACCEPTED",
    });
  });
});
