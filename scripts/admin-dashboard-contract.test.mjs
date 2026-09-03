import assert from "node:assert/strict";
import test from "node:test";

import { buildDashboardQuery, buildRecentOrdersQuery } from "../src/lib/api/admin-dashboard-contract.ts";

test("dashboard summary query uses only supported filters", () => {
  const query = new URLSearchParams(buildDashboardQuery({
    from: "2026-08-01",
    to: "2026-08-31",
    compare: true,
    productId: 12,
    orderStatus: "pending",
    state: "Karnataka",
  }));

  assert.equal(query.get("from"), "2026-08-01");
  assert.equal(query.get("to"), "2026-08-31");
  assert.equal(query.get("compare"), "true");
  assert.equal(query.get("productId"), "12");
  assert.equal(query.get("orderStatus"), "pending");
  assert.equal(query.get("state"), "Karnataka");
  assert.equal(query.has("search"), false);
});

test("recent orders use a small backend-paginated, date-bounded request", () => {
  assert.deepEqual(buildRecentOrdersQuery({ from: "2026-08-01", to: "2026-08-31", orderStatus: "confirmed" }), {
    page: 1,
    pageSize: 8,
    from: "2026-08-01T00:00:00.000Z",
    to: "2026-08-31T23:59:59.999Z",
    productId: undefined,
    status: "confirmed",
    state: undefined,
    sortBy: "placedAt",
    sortDir: "DESC",
  });
});
