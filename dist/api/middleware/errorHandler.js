"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../../domain/errors");
const zod_1 = require("zod");
/**
 * Global Express error handler.
 *
 * Converts AppError subclasses and Zod validation errors into consistent
 * JSON responses; all other errors are treated as 500 Internal Server Errors.
 */
function errorHandler(err, _req, res, _next) {
    // ── Zod validation errors ────────────────────────────────────────────────
    if (err instanceof zod_1.ZodError) {
        const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: messages,
        });
        return;
    }
    // ── Known application errors ─────────────────────────────────────────────
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json({
            error: err.code,
            message: err.message,
        });
        return;
    }
    // ── Unexpected errors ─────────────────────────────────────────────────────
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    console.error('[ERROR]', err);
    res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message,
    });
}
//# sourceMappingURL=errorHandler.js.map