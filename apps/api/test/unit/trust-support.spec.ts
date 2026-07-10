import { describe, expect, it, vi } from "vitest";
import type { PgStore } from "../../src/infrastructure/db.js";
import type { FeatureFlagsService } from "../../src/modules/flags.js";
import { SupportService } from "../../src/modules/support.js";
import { TrustService } from "../../src/modules/trust.js";

const fakeFlags = (enabled: boolean) =>
  ({ enabled: vi.fn(async () => enabled) }) as unknown as FeatureFlagsService;
const runTx = (
  query: (sql: string, args?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>,
) =>
  ({
    transaction: async (fn: (c: { query: typeof query }) => Promise<unknown>) => fn({ query }),
  }) as unknown as PgStore;
const validOrder = "00000000-0000-4000-8000-000000000001";
const validListing = "00000000-0000-4000-8000-000000000002";

describe("Trust boundary de reseñas verificadas", () => {
  it("bloquea escritura cuando la función fue deshabilitada", async () => {
    const db = { transaction: vi.fn() } as unknown as PgStore;
    await expect(
      new TrustService(db, fakeFlags(false)).publishReview("buyer", validListing, {
        order_id: validOrder,
        rating: 5,
        comment: "Comentario suficientemente largo",
      }),
    ).rejects.toMatchObject({ response: { code: "REVIEWS_DISABLED" } });
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it("no ejecuta INSERT sin compra pagada y validada en el servidor", async () => {
    const statements: string[] = [];
    const db = runTx(async (sql) => {
      statements.push(sql);
      return { rows: [], rowCount: 0 };
    });
    await expect(
      new TrustService(db, fakeFlags(true)).publishReview("intruso", validListing, {
        order_id: validOrder,
        rating: 1,
        comment: "No he comprado este artículo",
      }),
    ).rejects.toMatchObject({ response: { code: "VERIFIED_PURCHASE_REQUIRED" } });
    expect(statements.some((sql) => sql.includes("INSERT INTO reviews"))).toBe(false);
    expect(statements[0]).toMatch(/o\.buyer_id=\$2/);
  });
  it("nunca hace pública una reseña pendiente ni un anuncio oculto", async () => {
    const query = vi.fn(async () => []);
    await new TrustService({ query } as unknown as PgStore, fakeFlags(true)).listReviews(
      validListing,
    );
    const [sql, args] = query.mock.calls[0] as unknown as [string, string[]];
    expect(sql).toContain("r.status='APPROVED'");
    expect(sql).toContain("l.status='PUBLISHED'");
    expect(args).toEqual([validListing]);
  });
});

describe("Soporte: ownership e invariantes", () => {
  it("bloquea nuevos tickets si el administrador apagó soporte", async () => {
    const db = { transaction: vi.fn() } as unknown as PgStore;
    await expect(
      new SupportService(db, fakeFlags(false)).create("buyer", {
        category: "OTHER",
        subject: "Consulta de cuenta",
        message: "Hola",
      }),
    ).rejects.toMatchObject({ response: { code: "SUPPORT_DISABLED" } });
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it("impide leer mensajes privados de otro comprador", async () => {
    const db = { one: vi.fn(async () => undefined), query: vi.fn() } as unknown as PgStore;
    const service = new SupportService(db, fakeFlags(true));
    await expect(service.detail("intruso", validOrder, false)).rejects.toMatchObject({
      response: { code: "TICKET_NOT_FOUND" },
    });
    expect(db.query as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
    const oneCall = (db.one as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(oneCall?.[0]).toContain("requester_id=$3");
  });
  it("rechaza responder una solicitud ya cerrada", async () => {
    const query = vi.fn(async () => ({
      rows: [{ id: validOrder, status: "CLOSED", requester_id: "owner" }],
      rowCount: 1,
    }));
    const svc = new SupportService(runTx(query), fakeFlags(true));
    await expect(
      svc.addMessage("owner", validOrder, { message: "Nueva consulta" }),
    ).rejects.toMatchObject({ response: { code: "TICKET_CLOSED" } });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
