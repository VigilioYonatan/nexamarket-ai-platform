import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";
import { cfg } from "../config.js";

async function run() {
  const pool = new Pool({ connectionString: cfg.DATABASE_URL });
  const c = await pool.connect();
  try {
    await c.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations(filename text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())`,
    );
    const directory = join(process.cwd(), "migrations");
    const names = (await readdir(directory)).filter((x) => x.endsWith(".sql")).sort();
    for (const name of names) {
      const done = await c.query("SELECT filename FROM schema_migrations WHERE filename=$1", [
        name,
      ]);
      if (done.rowCount) continue;
      const text = await readFile(join(directory, name), "utf8");
      await c.query("BEGIN");
      try {
        await c.query(text);
        await c.query("INSERT INTO schema_migrations(filename) VALUES($1)", [name]);
        await c.query("COMMIT");
        console.log("Migrated", name);
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    c.release();
    await pool.end();
  }
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
