import { existsSync } from "node:fs";
import path from "node:path";

// Loads the repo-root `.env` (shared with compose.yaml) using Node's native
// env-file support — no dotenv dependency needed (Node 20.6+/24 ships
// `process.loadEnvFile`). Silently skipped if no `.env` exists yet, since a
// real one is never committed — see .env.example.
const ROOT_ENV_PATH = path.resolve(import.meta.dirname, "../../../../.env");
if (existsSync(ROOT_ENV_PATH)) {
  process.loadEnvFile(ROOT_ENV_PATH);
}

// Defaults mirror compose.yaml's local-dev MySQL credentials — not secrets,
// just a working default so `pnpm dev:api` boots without a `.env` file.
// Override via `.env` for anything else.
const DEFAULT_DATABASE_URL =
  "mysql://mypetmart:mypetmart_dev_password@localhost:3306/mypetmart";

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
} as const;
