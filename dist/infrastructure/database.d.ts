import { Pool } from 'pg';
/**
 * Returns the singleton connection pool.
 * The pool is created lazily on first use.
 */
export declare function getPool(): Pool;
/** Test database connectivity (used for health checks). */
export declare function checkDatabaseHealth(): Promise<boolean>;
