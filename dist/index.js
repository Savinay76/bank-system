"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const database_1 = require("./infrastructure/database");
const app_1 = require("./api/app");
const PORT = Number(process.env.API_PORT ?? 8080);
async function main() {
    const pool = (0, database_1.getPool)();
    // Verify DB connectivity before accepting traffic
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        console.log('[DB] Connected successfully.');
    }
    catch (err) {
        console.error('[DB] Failed to connect:', err);
        process.exit(1);
    }
    const app = (0, app_1.createApp)(pool);
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`[SERVER] Bank Account Management API running on port ${PORT}`);
        console.log(`[SERVER] Health check: http://localhost:${PORT}/health`);
    });
    // ── Graceful shutdown ────────────────────────────────────────────────────
    const shutdown = async (signal) => {
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
        }, 10000);
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
}
main().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map