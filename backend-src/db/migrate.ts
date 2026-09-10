import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Ordered, tracked migrations. Each file in migrations/ runs exactly once,
 * in filename order (hence the 001_, 002_ prefixes), inside its own
 * transaction, and gets recorded in schema_migrations so re-running this
 * script is always safe — including against a database that already had
 * 001_init.sql's contents applied manually (e.g. pasted into the Supabase
 * SQL Editor) before this tracking table existed.
 */
async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      create table if not exists schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const alreadyApplied = new Set(
      (await client.query('select filename from schema_migrations')).rows.map(r => r.filename)
    );
    if (!alreadyApplied.has('001_init.sql')) {
      const usersTableExists = await client.query(
        `select 1 from information_schema.tables where table_name = 'users'`
      );
      if (usersTableExists.rowCount && usersTableExists.rowCount > 0) {
        console.log('[migrate] detected pre-existing schema — marking 001_init.sql as already applied.');
        await client.query('insert into schema_migrations (filename) values ($1)', ['001_init.sql']);
        alreadyApplied.add('001_init.sql');
      }
    }

    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let appliedCount = 0;
    for (const filename of files) {
      if (alreadyApplied.has(filename)) {
        console.log(`[migrate] skip ${filename} (already applied)`);
        continue;
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf-8');
      console.log(`[migrate] applying ${filename}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations (filename) values ($1)', [filename]);
        await client.query('COMMIT');
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log(appliedCount > 0 ? `[migrate] done — applied ${appliedCount} migration(s).` : '[migrate] already up to date.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});
