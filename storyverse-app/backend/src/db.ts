import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Execute a SQL query on the configured PostgreSQL pool.
 * @param text SQL text
 * @param params Optional parameter array
 */
export function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  return pool.query(text, params);
}

export default pool;