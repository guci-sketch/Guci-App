import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

let pool: pg.Pool;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}
  
const requiresSsl =
  process.env.DB_SSL === 'true' ||
  /supabase\.(co|com)/.test(connectionString) ||
  (!/localhost|127\.0\.0\.1/.test(connectionString) && process.env.DB_SSL !== 'false');

pool = new Pool({
  connectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  max: process.env.VERCEL ? 1 : 10,
});

pool.on('error', err => {
  console.error('[db] unexpected error on idle client', err);
});

export { pool };

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params as any[]);
  return result.rows || [];
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    // If mock, this will just return {rows:[]} and not throw, 
    // but the fn might need specific mock behavior.
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
