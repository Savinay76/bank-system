import { Request, Response, NextFunction } from 'express';
/**
 * Global Express error handler.
 *
 * Converts AppError subclasses and Zod validation errors into consistent
 * JSON responses; all other errors are treated as 500 Internal Server Errors.
 */
export declare function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void;
