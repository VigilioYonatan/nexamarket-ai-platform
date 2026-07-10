import { describe, expect, it, vi } from "vitest";
import type { PgStore } from "../../src/infrastructure/db.js";
import { CatalogService } from "../../src/modules/catalog.js";

const emptyDb = {
  query: vi.fn(async () => []),
  one: vi.fn(async () => undefined),
} as unknown as PgStore;
describe("Catálogo, filtros y errores", () => {
  it("no permite un ORDER BY inyectado desde la consulta", async () => {
    const service = new CatalogService(emptyDb);
    await expect(service.list({ sort: "price_asc;DROP TABLE orders" })).rejects.toMatchObject({
      response: { code: "INVALID_SORT" },
    });
  });
  it("página y tamaño de consulta acotados", async () => {
    const db = { query: vi.fn(async () => []) } as unknown as PgStore;
    const service = new CatalogService(db);
    const result = await service.list({ q: "X".repeat(500), page: "9999999", sort: "price_desc" });
    expect(result.page).toBe(100);
    expect(db.query).toHaveBeenCalledTimes(1);
    const [sql, params] = (db.query as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      [string, number, number],
    ];
    expect(params[0].length).toBe(120);
    expect(params[2]).toBe((100 - 1) * 24);
    expect(sql).toContain("l.price_minor DESC");
  });
  it("producto inexistente devuelve 404", async () => {
    const service = new CatalogService(emptyDb);
    await expect(service.detail("00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({
      status: 404,
    });
  });
});
