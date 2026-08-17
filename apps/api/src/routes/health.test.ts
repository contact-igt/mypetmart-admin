import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../app.ts";

type HealthBody = { status: string; api: string; database: string };
type ErrorBody = { error: string };

describe("GET /health", () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    const app = createApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("responds 200 or 503 with a well-formed, non-leaking body", async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.ok([200, 503].includes(response.status), `unexpected status ${response.status}`);

    const body = (await response.json()) as HealthBody;
    assert.equal(body.api, "ok");
    assert.ok(["connected", "unreachable"].includes(body.database));
    assert.ok(["ok", "degraded"].includes(body.status));

    const serialized = JSON.stringify(body);
    assert.ok(!serialized.includes("mysql://"), "must not leak the connection string");
    assert.ok(!serialized.includes("password"), "must not leak credentials");
  });

  test("unknown route returns 404 with a { error } body", async () => {
    const response = await fetch(`${baseUrl}/does-not-exist`);
    assert.equal(response.status, 404);
    const body = (await response.json()) as ErrorBody;
    assert.equal(typeof body.error, "string");
  });
});
