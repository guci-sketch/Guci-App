import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const client = await pool.connect();
  try {
    const usersTableExists = await client.query(
      `select 1 from information_schema.tables where table_name = 'users'`
    );
    if (usersTableExists.rowCount && usersTableExists.rowCount > 0) {
      console.log('[migrate] detected pre-existing schema — no action needed.');
      return;
    }

    const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    console.log(`[migrate] applying schema.sql...`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    console.log('[migrate] done — schema applied.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});
