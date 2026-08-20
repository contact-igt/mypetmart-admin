import assert from "node:assert/strict";
import test from "node:test";
import { buildReportsCsv } from "../src/lib/reports-csv.mjs";

test("buildReportsCsv exports live sections and neutralizes spreadsheet formulas", () => {
  const csv = buildReportsCsv({
    summary: { orders: { value: 2 }, grossSales: { value: 750 } },
    timeSeries: { current: [{ date: "2026-08-20", orders: 2, units: 3, sales: 750 }] },
    orderStatus: [{ status: "delivered", count: 2, percentage: 100 }],
    productPerformance: [{ productId: 7, name: '=HYPERLINK("bad")', unitsSold: 3, revenue: 750 }],
  }, { from: "2026-08-01", to: "2026-08-20" });

  assert.match(csv, /"Summary","2026-08-01 to 2026-08-20"/);
  assert.match(csv, /"Order status".*"delivered","2"/);
  assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
});
