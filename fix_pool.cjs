const fs = require('fs');
const newCode = `import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Please set it in the environment variables (or .env file).');
    }
      
    const requiresSsl =
      process.env.DB_SSL === 'true' ||
      /supabase\\.(co|com)/.test(connectionString) ||
      (!/localhost|127\\.0\\.0\\.1/.test(connectionString) && process.env.DB_SSL !== 'false');
    
    pool = new Pool({
      connectionString,
      ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
      max: process.env.VERCEL ? 1 : 10,
    });
    
    pool.on('error', err => {
      console.error('[db] unexpected error on idle client', err);
    });
  }
  return pool;
}

export { pool }; // Exposing null initially, preferable to use getPool() or query()

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const currentPool = getPool();
  const result = await currentPool.query(text, params as any[]);
  return result.rows || [];
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const currentPool = getPool();
  const client = await currentPool.connect();
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
`;

fs.writeFileSync('backend-src/db/pool.ts', newCode);
