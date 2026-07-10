import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PgStore } from "../../src/infrastructure/db.js";
import { CheckoutService } from "../../src/modules/checkout.js";

/** Runs ONLY on an explicit disposable migrated test database.
 * CI must provide TEST_DATABASE_URL and apply migrations first.
 * No production URI fallback is permitted. */
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !/\/nexamarket_test(\?|$)/.test(testUrl)) {
  throw new Error(
    "TEST_DATABASE_URL must explicitly reference nexamarket_test (no production fallback).",
  );
}
let pool: Pool;
const transaction = async <T>(fn: (c: import("pg").PoolClient) => Promise<T>) => {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const val = await fn(c);
    await c.query("COMMIT");
    return val;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
};
beforeAll(async () => {
  pool = new Pool({ connectionString: testUrl });
  await pool.query("SELECT 1 FROM schema_migrations LIMIT 1");
});
afterAll(async () => {
  if (pool) await pool.end();
});
// CI destroys the disposable nexamarket_test database after the test job.
describe("PG real: reserva bajo concurrencia", () => {
  it("exactamente un checkout gana la última unidad", async () => {
    const buyer1 = randomUUID(),
      buyer2 = randomUUID(),
      owner = randomUUID(),
      seller = randomUUID(),
      category = randomUUID(),
      product = randomUUID(),
      listing = randomUUID();
    await transaction(async (c) => {
      for (const id of [buyer1, buyer2, owner])
        await c.query("INSERT INTO user_profiles(id,subject) VALUES($1,$2)", [id, `test:${id}`]);
      await c.query(
        "INSERT INTO sellers(id,owner_user_id,display_name,status) VALUES($1,$2,'QA','APPROVED')",
        [seller, owner],
      );
      await c.query(
        "INSERT INTO seller_mp_connections(seller_id,provider_user_id,access_token_enc,refresh_token_enc,expires_at,status) VALUES($1,$2,'test-not-a-token','test-not-a-token',now()+interval '1 day','CONNECTED')",
        [seller, `test:${seller}`],
      );
      await c.query("INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)", [
        category,
        "QA",
        `qa-${category}`,
      ]);
      await c.query(
        "INSERT INTO products(id,category_id,title,description) VALUES($1,$2,'QA Product','Fixture')",
        [product, category],
      );
      await c.query(
        "INSERT INTO seller_listings(id,seller_id,product_id,price_minor,status) VALUES($1,$2,$3,1000,'PUBLISHED')",
        [listing, seller, product],
      );
      await c.query("INSERT INTO inventory_stock(listing_id,on_hand,reserved) VALUES($1,1,0)", [
        listing,
      ]);
      for (const buyer of [buyer1, buyer2])
        await c.query("INSERT INTO cart_lines(buyer_id,listing_id,quantity) VALUES($1,$2,1)", [
          buyer,
          listing,
        ]);
    });
    const svc = new CheckoutService({ pool, transaction } as unknown as PgStore);
    const results = await Promise.allSettled([
      svc.create(buyer1, "FIRSTKEY0123456789"),
      svc.create(buyer2, "SECONDKEY0123456789"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const state = await pool.query<{ on_hand: number; reserved: number }>(
      "SELECT on_hand,reserved FROM inventory_stock WHERE listing_id=$1",
      [listing],
    );
    expect(state.rows[0]).toMatchObject({ on_hand: 1, reserved: 1 });
    const rows = await pool.query<{ cnt: string }>(
      "SELECT count(*)::text cnt FROM stock_reservations WHERE listing_id=$1",
      [listing],
    );
    expect(Number(rows.rows[0]?.cnt)).toBe(1);
    // A successfully-created checkout consumes its cart exactly once.
    // The failed buyer keeps their cart, because their transaction rolled back.
    const winner = results[0]?.status === "fulfilled" ? buyer1 : buyer2;
    const loser = winner === buyer1 ? buyer2 : buyer1;
    const carts = await pool.query<{ buyer_id: string; quantity: number }>(
      "SELECT buyer_id,quantity FROM cart_lines WHERE buyer_id = ANY($1::uuid[])",
      [[buyer1, buyer2]],
    );
    expect(carts.rows.some((r) => r.buyer_id === winner)).toBe(false);
    expect(carts.rows.find((r) => r.buyer_id === loser)?.quantity).toBe(1);
  });
});
