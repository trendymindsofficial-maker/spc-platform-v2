import { ErrorRequestHandler, RequestHandler } from "express";

import { ApiError } from "../lib/http";
import { IS_PRODUCTION } from "../config/env";

/*
|--------------------------------------------------------------------------
| 404 HANDLER
|--------------------------------------------------------------------------
*/

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `No SBC API endpoint matches ${req.method} ${req.path}.`,
  });
};

/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
|
| ApiError carries a client-safe message. Anything else is logged in full
| and reported generically so internal details never leak to the browser.
|
*/

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      success: false,
      error: error.message,
      ...(error.code ? { code: error.code } : {}),
    });

    return;
  }

  /*
   * express.json() raises a SyntaxError with `body` set when the payload
   * is not valid JSON. The old handlers answered 400 for this.
   */
  if (
    error instanceof SyntaxError &&
    "body" in error &&
    (error as { status?: number }).status === 400
  ) {
    res.status(400).json({
      success: false,
      error: "Invalid JSON request body.",
    });

    return;
  }

  console.error(`Unhandled error on ${req.method} ${req.path}:`, error);

  res.status(500).json({
    success: false,
    error: IS_PRODUCTION
      ? "Something went wrong. Please try again."
      : error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.",
  });
};
