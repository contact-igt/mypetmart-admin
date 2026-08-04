import type { Request, Response } from "express";

/** CLAUDE.md API conventions: 4xx responses carry a `{ error: string }` body. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}
