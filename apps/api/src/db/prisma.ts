import { PrismaClient } from "@prisma/client";
import { config } from "../config/env.ts";

export const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
});
