import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminOrderActionPath,
  buildAdminOrderPath,
  buildAdminOrderQuery,
  serializeAdminOrderBody,
} from "../src/lib/api/admin-order-contract.ts";

test("list query uses backend-supported filters and omits empty values", () => {
  const query = new URLSearchParams(
    buildAdminOrderQuery({
      page: 2,
      pageSize: 10,
      search: "Priya Sharma",
      status: "confirmed",
      paymentStatus: "paid",
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-31T23:59:59.000Z",
      sortBy: "total",
      sortDir: "DESC",
      productId: undefined,
      state: "",
    }),
  );

  assert.equal(query.get("page"), "2");
  assert.equal(query.get("search"), "Priya Sharma");
  assert.equal(query.get("status"), "confirmed");
  assert.equal(query.get("paymentStatus"), "paid");
  assert.equal(query.get("sortBy"), "total");
  assert.equal(query.get("sortDir"), "DESC");
  assert.equal(query.has("productId"), false);
  assert.equal(query.has("state"), false);
});

test("detail and mutation routes use the numeric order resource path safely", () => {
  assert.equal(buildAdminOrderPath(42), "/admin/orders/42");
  assert.equal(buildAdminOrderPath("42"), "/admin/orders/42");
  assert.equal(buildAdminOrderPath("42/notes"), "/admin/orders/42%2Fnotes");
  assert.equal(buildAdminOrderActionPath(42, "status"), "/admin/orders/42/status");
  assert.equal(buildAdminOrderActionPath(42, "shipping-address"), "/admin/orders/42/shipping-address");
  assert.equal(buildAdminOrderActionPath(42, "notes"), "/admin/orders/42/notes");
});

test("mutation bodies preserve the backend contracts", () => {
  assert.deepEqual(JSON.parse(serializeAdminOrderBody({ status: "confirmed" })), { status: "confirmed" });
  assert.deepEqual(JSON.parse(serializeAdminOrderBody({ ids: [42, 43], status: "processing" })), { ids: [42, 43], status: "processing" });
  assert.deepEqual(JSON.parse(serializeAdminOrderBody({ recipientName: "Riya", city: "Mumbai" })), { recipientName: "Riya", city: "Mumbai" });
  assert.deepEqual(JSON.parse(serializeAdminOrderBody({ message: "Call customer" })), { message: "Call customer" });
});
