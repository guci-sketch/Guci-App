import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and point it at your local PostgreSQL database.'
  );
}

// Supabase (and most managed Postgres providers) require TLS and present a
// certificate chain that Node's default trust store doesn't always have —
// rejectUnauthorized: false is the standard workaround the `pg` driver docs
// recommend for this. Local Postgres has no TLS at all, so this only
// activates for a remote host, or when explicitly forced via DB_SSL=true.
const requiresSsl =
  process.env.DB_SSL === 'true' ||
  /supabase\.(co|com)/.test(connectionString) ||
  (!/localhost|127\.0\.0\.1/.test(connectionString) && process.env.DB_SSL !== 'false');

export const pool = new Pool({
  connectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  // Serverless functions spin up fresh per-invocation; keep the pool small
  // so a burst of concurrent Vercel invocations doesn't exhaust Supabase's
  // connection limit. Use Supabase's "Transaction" pooler connection string
  // (port 6543) for DATABASE_URL in production — see README.
  max: process.env.VERCEL ? 1 : 10,
});

pool.on('error', err => {
  // A background/idle client error should not crash the whole process.
  console.error('[db] unexpected error on idle client', err);
});

/** Run a query and return rows. Prefer this for simple, single-statement queries. */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(text, params as any[]);
  return result.rows;
}

/** Run a callback inside a transaction, committing on success and rolling back on error. */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
