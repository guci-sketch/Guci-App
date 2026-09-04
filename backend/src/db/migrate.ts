import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const client = await pool.connect();
  try {
    const existing = await client.query(
      `select 1 from information_schema.tables where table_name = 'users'`
    );
    if (existing.rowCount && existing.rowCount > 0) {
      console.log('[migrate] schema already present — nothing to do (drop the database to re-run from scratch).');
      return;
    }
    const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    console.log('[migrate] applying schema.sql...');
    await client.query(sql);
    console.log('[migrate] done.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});
