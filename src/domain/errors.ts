/**
 * Base application error. All custom errors extend this class so that
 * the global error-handler can distinguish them from unexpected runtime errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    // Restore the prototype chain (required when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 – request body or parameters are invalid */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/** 404 – the requested aggregate / resource does not exist */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 409 – a business rule was violated
 * (e.g. duplicate account, insufficient funds, account already closed)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/** 409 – optimistic-concurrency violation during event appending */
export class ConcurrencyError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONCURRENCY_ERROR');
  }
}
