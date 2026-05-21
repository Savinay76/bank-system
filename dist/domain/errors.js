"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcurrencyError = exports.ConflictError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
/**
 * Base application error. All custom errors extend this class so that
 * the global error-handler can distinguish them from unexpected runtime errors.
 */
class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        // Restore the prototype chain (required when extending built-ins in TS)
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
/** 400 – request body or parameters are invalid */
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}
exports.ValidationError = ValidationError;
/** 404 – the requested aggregate / resource does not exist */
class NotFoundError extends AppError {
    constructor(message) {
        super(message, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
/**
 * 409 – a business rule was violated
 * (e.g. duplicate account, insufficient funds, account already closed)
 */
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
/** 409 – optimistic-concurrency violation during event appending */
class ConcurrencyError extends AppError {
    constructor(message) {
        super(message, 409, 'CONCURRENCY_ERROR');
    }
}
exports.ConcurrencyError = ConcurrencyError;
//# sourceMappingURL=errors.js.map