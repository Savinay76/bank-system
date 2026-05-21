/**
 * Base application error. All custom errors extend this class so that
 * the global error-handler can distinguish them from unexpected runtime errors.
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(message: string, statusCode: number, code: string);
}
/** 400 – request body or parameters are invalid */
export declare class ValidationError extends AppError {
    constructor(message: string);
}
/** 404 – the requested aggregate / resource does not exist */
export declare class NotFoundError extends AppError {
    constructor(message: string);
}
/**
 * 409 – a business rule was violated
 * (e.g. duplicate account, insufficient funds, account already closed)
 */
export declare class ConflictError extends AppError {
    constructor(message: string);
}
/** 409 – optimistic-concurrency violation during event appending */
export declare class ConcurrencyError extends AppError {
    constructor(message: string);
}
