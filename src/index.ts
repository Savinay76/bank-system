import * as dotenv from 'dotenv';
dotenv.config();

import { getPool } from './infrastructure/database';
import { createApp } from './api/app';

const PORT = Number(process.env.API_PORT ?? 8080);

async function main(): Promise<void> {
  const pool = getPool();

  // Verify DB connectivity before accepting traffic
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB] Connected successfully.');
  } catch (err) {
    console.error('[DB] Failed to connect:', err);
    process.exit(1);
  }

  const app = createApp(pool);

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Bank Account Management API running on port ${PORT}`);
    console.log(`[SERVER] Health check: http://localhost:${PORT}/health`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[SERVER] ${signal} received. Shutting down gracefully…`);
    server.close(async () => {
      await pool.end();
      console.log('[SERVER] All connections closed. Exiting.');
      process.exit(0);
    });

    // Force-kill after 10 s if graceful shutdown stalls
    setTimeout(() => {
      console.error('[SERVER] Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
