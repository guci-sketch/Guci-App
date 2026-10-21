import pg from 'pg';
import type { ConnectionOptions } from 'node:tls';
import 'dotenv/config';

const { Pool } = pg;

let pool: pg.Pool | null = null;

let warnedInsecureSsl = false;
/**
 * Opsi TLS koneksi database. Bila DB_SSL_CA (isi sertifikat CA PEM, boleh dengan \n literal) diisi, sertifikat
 * server DIVERIFIKASI (aman dari MITM). Tanpa itu, koneksi tetap terenkripsi tetapi sertifikat tidak diverifikasi
 * (perilaku lama; pooler Supabase memakai CA yang tidak ada di trust-store Node) — dengan peringatan sekali di log.
 */
function sslOptions(): ConnectionOptions {
  const ca = process.env.DB_SSL_CA;
  if (ca) return { ca: ca.replace(/\\n/g, '\n'), rejectUnauthorized: true };
  if (!warnedInsecureSsl && process.env.NODE_ENV === 'production') {
    warnedInsecureSsl = true;
    console.warn('[db] DB_SSL_CA belum diatur: koneksi database terenkripsi tetapi sertifikat server TIDAK diverifikasi. Unduh CA dari Supabase → Database → SSL lalu isi DB_SSL_CA.');
  }
  return { rejectUnauthorized: false };
}

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Please set it in the environment variables (or .env file).');
    }
      
    const requiresSsl =
      process.env.DB_SSL === 'true' ||
      /supabase\.(co|com)/.test(connectionString) ||
      (!/localhost|127\.0\.0\.1/.test(connectionString) && process.env.DB_SSL !== 'false');
    
    pool = new Pool({
      connectionString,
      ssl: requiresSsl ? sslOptions() : undefined,
      max: process.env.VERCEL ? 1 : 10,
    });
    
    pool.on('error', err => {
      console.error('[db] unexpected error on idle client', err);
    });
  }
  return pool;
}

// NOTE: `pool` sengaja tidak diekspor — nilainya null saat modul dimuat. Gunakan getPool(), query(), atau withTransaction().

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
