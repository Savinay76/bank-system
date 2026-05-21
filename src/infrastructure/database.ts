import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

let _pool: Pool | null = null;

/**
 * Returns the singleton connection pool.
 * The pool is created lazily on first use.
 */
export function getPool(): Pool {
  if (_pool) return _pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  _pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  _pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
  });

  return _pool;
}

/** Test database connectivity (used for health checks). */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}
