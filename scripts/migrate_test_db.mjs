import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

const connectionString = process.env.TEST_DATABASE_URL || 'postgres://llmops:llmops_test_pw@172.23.84.67:15432/nexamarket_test';
const pool = new Pool({ connectionString });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const dir = path.resolve('apps/api/migrations');
    const files = (await fs.readdir(dir)).filter(f => f.endsWith('.sql')).sort();
    
    for (const file of files) {
      const check = await client.query('SELECT filename FROM schema_migrations WHERE filename = $1', [file]);
      if (check.rowCount > 0) {
        console.log(`[SKIP] Migration already applied: ${file}`);
        continue;
      }
      const sql = await fs.readFile(path.join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[OK] Applied migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[ERROR] Migration failed in ${file}:`, err.message);
        throw err;
      }
    }
    console.log('All migrations applied successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Fatal migration failure:', err);
  process.exit(1);
});
