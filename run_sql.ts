import { pool } from './backend-src/db/pool.js';

async function patch() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_invitations (
        token VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'EXECUTOR',
        created_by UUID REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log("user_invitations table created");
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}
patch();
