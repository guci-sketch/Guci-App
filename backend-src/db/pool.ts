import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mock';

// Supabase (and most managed Postgres providers) require TLS and present a
// certificate chain that Node's default trust store doesn't always have —
// rejectUnauthorized: false is the standard workaround the `pg` driver docs
// recommend for this. Local Postgres has no TLS at all, so this only
// activates for a remote host, or when explicitly forced via DB_SSL=true.
const requiresSsl =
  process.env.DB_SSL === 'true' ||
  /supabase\.(co|com)/.test(connectionString) ||
  (!/localhost|127\.0\.0\.1/.test(connectionString) && process.env.DB_SSL !== 'false');

let pool: pg.Pool;
try {
  pool = new Pool({
    connectionString,
    ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
    max: process.env.VERCEL ? 1 : 10,
  });
} catch {
  console.warn('[AI Studio] DB not connected — mock active');
  pool = {
    query: async () => ({ rows: [] }),
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release: () => {}
    }),
    on: () => {}
  } as any;
}

export { pool };

pool.on('error', err => {
  // A background/idle client error should not crash the whole process.
  console.error('[db] unexpected error on idle client', err);
});

/** Run a query and return rows. Prefer this for simple, single-statement queries. */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  try {
    const result = await pool.query<T>(text, params as any[]);
    return result.rows;
  } catch (err: any) {
    console.warn(`[AI Studio] DB query failed, falling back to mock: ${err.message}`);
    return [];
  }
}

/** Run a callback inside a transaction, committing on success and rolling back on error. */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  let client: pg.PoolClient;
  try {
    client = await pool.connect();
  } catch (err: any) {
    console.warn(`[AI Studio] DB connect failed, falling back to mock: ${err.message}`);
    // Provide a mock client that ignores queries
    const mockClient = {
      query: async () => ({ rows: [] }),
      release: () => {}
    } as unknown as pg.PoolClient;
    return await fn(mockClient);
  }

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
