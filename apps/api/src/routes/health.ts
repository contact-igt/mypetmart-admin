import { Router } from "express";
import { prisma } from "../db/prisma.ts";

export const healthRouter = Router();

/**
 * Reports API and database status only — never the connection string,
 * error message or stack trace (CLAUDE.md: never leak internals to
 * clients). Returns 200 when both are healthy, 503 when the database
 * dependency is down but the API process itself is still serving requests.
 */
healthRouter.get("/", async (_req, res) => {
  let database: "connected" | "unreachable" = "unreachable";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "unreachable";
  }

  const healthy = database === "connected";
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    api: "ok",
    database,
  });
});
