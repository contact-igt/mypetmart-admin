import { createApp } from "./app.ts";
import { config } from "./config/env.ts";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`MyPetMart API listening on port ${config.port} (${config.nodeEnv})`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
