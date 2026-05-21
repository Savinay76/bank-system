import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../domain/errors';
import { ZodError } from 'zod';

/**
 * Global Express error handler.
 *
 * Converts AppError subclasses and Zod validation errors into consistent
 * JSON responses; all other errors are treated as 500 Internal Server Errors.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Zod validation errors ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    res.status(400).json({
      error:   'VALIDATION_ERROR',
      message: messages,
    });
    return;
  }

  // ── Known application errors ─────────────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error:   err.code,
      message: err.message,
    });
    return;
  }

  // ── Unexpected errors ─────────────────────────────────────────────────────
  const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
  console.error('[ERROR]', err);
  res.status(500).json({
    error:   'INTERNAL_SERVER_ERROR',
    message,
  });
}
