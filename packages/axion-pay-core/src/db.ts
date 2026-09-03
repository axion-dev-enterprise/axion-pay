import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const db = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export async function pingDb() {
  const result = await db.query('SELECT NOW() AS now');
  return result.rows[0];
}
