import cors, { CorsOptions } from "cors";
import express, { Express } from "express";
import helmet from "helmet";

import { FRONTEND_ORIGINS, NODE_ENV } from "./config/env";
import { ApiError } from "./lib/http";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { apiRouter } from "./routes";

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
|
| Auth is header-based (Firebase ID token), never cookie-based, so
| credentials are not needed. Only the configured frontend origins may
| call the API from a browser.
|
| Requests without an Origin header (server-to-server, curl, Render health
| checks) are allowed through — CORS only protects browser callers.
|
*/

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalized = origin.replace(/\/+$/, "");

    if (FRONTEND_ORIGINS.includes(normalized)) {
      callback(null, true);
      return;
    }

    /*
     * Allow Vercel preview deployments of this project.
     */
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)) {
      callback(null, true);
      return;
    }

    console.warn("Blocked CORS origin:", origin);

    callback(
      new ApiError(403, "This origin is not allowed by SBC CORS policy.")
    );
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  maxAge: 86400,
};

export function createApp(): Express {
  const app = express();

  /*
   * Render terminates TLS at its proxy. Trusting it keeps req.ip and
   * req.protocol accurate.
   */
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors(corsOptions));

  /*
   * The Razorpay webhook signature is an HMAC over the exact bytes
   * Razorpay sent. Re-serialising the parsed object would change key
   * order and whitespace and break every signature, so the raw buffer is
   * stashed here while the body is parsed normally.
   */
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        if (buf && buf.length > 0) {
          (req as express.Request).rawBody = Buffer.from(buf);
        }
      },
    })
  );

  /*
   * Health check for Render and uptime monitors.
   */
  app.get("/health", (_req, res) => {
    res.json({
      success: true,
      service: "sbc-backend",
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      service: "sbc-backend",
      message: "Student Benefit Card API.",
    });
  });

  /*
   * Paths are kept identical to the previous Next.js route handlers
   * (/api/...), so the frontend only had to gain a base URL.
   */
  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
