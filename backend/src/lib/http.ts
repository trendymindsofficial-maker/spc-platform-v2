import { NextFunction, Request, RequestHandler, Response } from "express";

/*
|--------------------------------------------------------------------------
| HTTP HELPERS
|--------------------------------------------------------------------------
*/

/**
 * An error that carries an HTTP status and a client-safe message.
 * Anything else that reaches the error handler is reported as a generic 500.
 */
export class ApiError extends Error {
  public readonly status: number;

  public readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const unauthorized = (message = "Unauthorized.") =>
  new ApiError(401, message);

export const forbidden = (message = "Access denied.") =>
  new ApiError(403, message);

export const badRequest = (message: string, code?: string) =>
  new ApiError(400, message, code);

export const notFound = (message: string) => new ApiError(404, message);

/**
 * Wraps an async route handler so a rejected promise reaches Express'
 * error handler instead of hanging the request.
 */
export function asyncHandler(
  handler: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/**
 * Reads a trimmed string from an unknown request-body value.
 */
export function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
