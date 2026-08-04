import express, { type Express } from "express";
import { healthRouter } from "./routes/health.ts";
import { notFoundHandler } from "./middleware/not-found.ts";
import { errorHandler } from "./middleware/error-handler.ts";

/** App/server separation: this builds the Express app without binding a port. */
export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  app.use("/health", healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
