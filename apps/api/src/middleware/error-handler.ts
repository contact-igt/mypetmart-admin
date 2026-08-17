import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./http-error.ts";

/**
 * Central error handler. Known HttpErrors return their own status/message;
 * anything else (including raw Prisma/DB errors) is logged server-side only
 * and collapsed to a generic 500 — CLAUDE.md: "Never return raw database
 * errors to the client."
 */
// Express identifies error-handling middleware by arity (4 params) — req/next
// are unused but must stay in the signature.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
