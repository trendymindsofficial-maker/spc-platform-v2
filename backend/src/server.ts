import { createApp } from "./app";
import { FRONTEND_ORIGINS, NODE_ENV, PORT, assertEnvironment } from "./config/env";
import { getAdminApp } from "./lib/firebase-admin";

/*
|--------------------------------------------------------------------------
| SBC BACKEND ENTRY POINT
|--------------------------------------------------------------------------
*/

function main(): void {
  try {
    assertEnvironment();
  } catch (error) {
    console.error(
      "SBC backend cannot start:",
      error instanceof Error ? error.message : error
    );

    process.exit(1);
  }

  /*
   * Initialize Firebase Admin at boot so a bad private key fails here
   * rather than on the first authenticated request.
   */
  try {
    getAdminApp();
    console.log("Firebase Admin initialized.");
  } catch (error) {
    console.error(
      "Firebase Admin initialization failed:",
      error instanceof Error ? error.message : error
    );

    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`SBC backend listening on port ${PORT} (${NODE_ENV}).`);
    console.log(`Allowed origins: ${FRONTEND_ORIGINS.join(", ")}`);
  });

  /*
   * Render sends SIGTERM on deploy and on scale-down.
   */
  const shutdown = (signal: string) => {
    console.log(`${signal} received. Shutting down.`);

    server.close(() => process.exit(0));

    setTimeout(() => process.exit(0), 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
  });
}

main();
