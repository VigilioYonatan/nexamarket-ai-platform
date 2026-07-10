import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PgStore } from "../../src/infrastructure/db.js";
import { MercadoPagoService } from "../../src/modules/payments.js";

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

const query = async <T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> => {
  const res = await pool.query(sql, params);
  return res.rows as T[];
};

const one = async <T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T | undefined> => {
  const res = await pool.query(sql, params);
  return res.rows[0] as T | undefined;
};

beforeAll(async () => {
  pool = new Pool({ connectionString: testUrl });
  await pool.query("SELECT 1 FROM schema_migrations LIMIT 1");
});

afterAll(async () => {
  if (pool) await pool.end();
});

describe("PostgreSQL real: Pagos, Webhooks y Ledger Invariants", () => {
  it("deduplica webhooks idempotentemente en psp_webhook_inbox", async () => {
    const store = { pool, transaction, query, one } as unknown as PgStore;
    const _svc = new MercadoPagoService(store);
    const eventKey = `evt_${randomUUID()}`;
    const providerPaymentId = `pay_${randomUUID()}`;

    // Simular recepción de webhook duplicado
    await pool.query(
      `INSERT INTO psp_webhook_inbox(event_key, provider_payment_id, provider_user_id) VALUES($1, $2, $3) ON CONFLICT(event_key) DO NOTHING`,
      [eventKey, providerPaymentId, "mp_user_123"],
    );
    const duplicateInsert = await pool.query(
      `INSERT INTO psp_webhook_inbox(event_key, provider_payment_id, provider_user_id) VALUES($1, $2, $3) ON CONFLICT(event_key) DO NOTHING`,
      [eventKey, providerPaymentId, "mp_user_123"],
    );
    expect(duplicateInsert.rowCount).toBe(0);

    const count = await pool.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM psp_webhook_inbox WHERE event_key=$1`,
      [eventKey],
    );
    expect(Number(count.rows[0]?.cnt)).toBe(1);
  });

  it("verifica restricción de balance contable de doble entrada (ledger_balance_check)", async () => {
    const journalId = randomUUID();
    await pool.query(
      `INSERT INTO ledger_journals(id, source_type, source_id, currency) VALUES($1, 'TEST', $2, 'PEN')`,
      [journalId, randomUUID()],
    );

    // Asiento desbalanceado debe fallar al hacer commit por el trigger diferido
    await expect(
      transaction(async (c) => {
        await c.query(
          `INSERT INTO ledger_postings(journal_id, account, amount_minor, currency) VALUES($1, 'MP_RECEIVABLE', 5000, 'PEN')`,
          [journalId],
        );
      }),
    ).rejects.toThrow();

    // Asiento perfectamente balanceado (débito y crédito suman 0) tiene éxito
    await transaction(async (c) => {
      await c.query(
        `INSERT INTO ledger_postings(journal_id, account, amount_minor, currency) VALUES($1, 'MP_RECEIVABLE', 5000, 'PEN')`,
        [journalId],
      );
      await c.query(
        `INSERT INTO ledger_postings(journal_id, account, amount_minor, currency) VALUES($1, 'SELLER_PAYABLE', -4500, 'PEN')`,
        [journalId],
      );
      await c.query(
        `INSERT INTO ledger_postings(journal_id, account, amount_minor, currency) VALUES($1, 'PLATFORM_FEE_RECEIVABLE', -500, 'PEN')`,
        [journalId],
      );
    });

    const sum = await pool.query<{ total: string }>(
      `SELECT sum(amount_minor)::text AS total FROM ledger_postings WHERE journal_id=$1`,
      [journalId],
    );
    expect(Number(sum.rows[0]?.total)).toBe(0);
  });

  it("permite desconexión OAuth segura del vendedor", async () => {
    const store = { pool, transaction, query, one } as unknown as PgStore;
    const svc = new MercadoPagoService(store);
    const sellerId = randomUUID();
    const ownerId = randomUUID();

    await pool.query(`INSERT INTO user_profiles(id, subject) VALUES($1, $2)`, [
      ownerId,
      `seller:${ownerId}`,
    ]);
    await pool.query(
      `INSERT INTO sellers(id, owner_user_id, display_name, status) VALUES($1, $2, 'Test Seller MP', 'APPROVED')`,
      [sellerId, ownerId],
    );
    await pool.query(
      `INSERT INTO seller_mp_connections(seller_id, provider_user_id, access_token_enc, refresh_token_enc, expires_at, status)
       VALUES($1, $2, 'dummy', 'dummy', now() + interval '1 day', 'CONNECTED')`,
      [sellerId, `provider_${sellerId}`],
    );

    const res = await svc.disconnectSeller(sellerId);
    expect(res.status).toBe("DISCONNECTED");

    const dbRow = await pool.query<{ status: string }>(
      `SELECT status FROM seller_mp_connections WHERE seller_id=$1`,
      [sellerId],
    );
    expect(dbRow.rows[0]?.status).toBe("DISCONNECTED");
  });
});
