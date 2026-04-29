import { Global, Injectable, Module, type OnModuleDestroy } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { cfg } from "../config.js";
import * as schema from "./schema.js";
@Injectable()
export class PgStore implements OnModuleDestroy {
  readonly pool: Pool;
  readonly orm;

  constructor() {
    this.pool = new Pool({
      connectionString: cfg.DATABASE_URL,
      max: 15,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      application_name: "nexamarket-api",
    });
    this.pool.on("error", (err) => {
      console.error("[PgStore] Unexpected error on idle Postgres client:", err.message);
    });
    this.orm = drizzle(this.pool, { schema });
  }
  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = [],
  ): Promise<T[]> {
    return (await this.pool.query<T>(sql, values)).rows;
  }
  async one<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = [],
  ): Promise<T | undefined> {
    return (await this.query<T>(sql, values))[0];
  }
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
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
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
@Global()
@Module({ providers: [PgStore], exports: [PgStore] })
export class DbModule {}
