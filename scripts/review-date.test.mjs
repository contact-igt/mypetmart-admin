// Review Date (Stage 2) — pure-helper tests. Run: npm run test:review-date
// Mirrors the existing ad-hoc `node --test` script pattern (see
// scripts/refund-eligibility.test.mjs) — no test framework is installed.

// Set a deliberately hostile timezone BEFORE the helper is imported, so the
// DATEONLY formatter is exercised well away from UTC.
process.env.TZ = "America/Los_Angeles";

import assert from "node:assert/strict";
import test from "node:test";

import {
  formatReviewDateOnly,
  formatTimestampDate,
  resolveDisplayReviewDate,
  reviewDateForCreate,
  reviewDatePatch,
  todayInputValue,
} from "../src/lib/review-date.ts";

test("13. DATEONLY formatting never shifts the calendar day across timezones", () => {
  // In America/Los_Angeles, `new Date("2026-01-01")` is 2025-12-31 16:00 local —
  // the naive approach would render "31 Dec 2025". The helper must not.
  assert.equal(formatReviewDateOnly("2026-01-01"), "01 Jan 2026");
  assert.equal(formatReviewDateOnly("2026-08-14"), "14 Aug 2026");
  assert.equal(formatReviewDateOnly("2026-12-31"), "31 Dec 2026");
});

test("formatReviewDateOnly returns the input unchanged when it is not YYYY-MM-DD", () => {
  assert.equal(formatReviewDateOnly(""), "");
  assert.equal(formatReviewDateOnly("not-a-date"), "not-a-date");
});

test("3. a blank Add-Review date is omitted from the payload (never today)", () => {
  assert.equal(reviewDateForCreate(""), undefined);
  const today = todayInputValue();
  assert.notEqual(reviewDateForCreate(""), today);
});

test("4. a chosen Add-Review date is sent as the selected YYYY-MM-DD", () => {
  assert.equal(reviewDateForCreate("2026-08-14"), "2026-08-14");
});

test("5. todayInputValue is a valid YYYY-MM-DD used for the native max attribute", () => {
  assert.match(todayInputValue(), /^\d{4}-\d{2}-\d{2}$/);
});

test("9. changing the review date in edit sends the newly selected date", () => {
  assert.deepEqual(reviewDatePatch("2026-08-14", "2026-08-10"), { reviewDate: "2026-08-10" });
  assert.deepEqual(reviewDatePatch(null, "2026-08-10"), { reviewDate: "2026-08-10" });
});

test("10. clearing an existing review date sends reviewDate: null, not undefined", () => {
  const patch = reviewDatePatch("2026-08-14", "");
  assert.ok("reviewDate" in patch, "the key must be present so the backend clears the value");
  assert.equal(patch.reviewDate, null);
  assert.notEqual(patch.reviewDate, undefined);
});

test("11. editing other fields without touching the date produces no reviewDate key", () => {
  assert.deepEqual(reviewDatePatch("2026-08-14", "2026-08-14"), {});
  assert.deepEqual(reviewDatePatch(null, ""), {});
  assert.equal("reviewDate" in reviewDatePatch("2026-08-14", "2026-08-14"), false);
});

test("12. the list column shows reviewDate when set, otherwise the created date", () => {
  assert.equal(
    resolveDisplayReviewDate({ reviewDate: "2026-08-14", createdAt: "2026-09-02T06:15:10.000Z" }),
    "14 Aug 2026"
  );
  assert.equal(
    resolveDisplayReviewDate({ reviewDate: null, createdAt: "2026-09-02T06:15:10.000Z" }),
    formatTimestampDate("2026-09-02T06:15:10.000Z")
  );
});
