import assert from "node:assert/strict";
import test from "node:test";

import { requiresManualCodRefund } from "../src/lib/refund-eligibility.ts";

test("COD returns require manual refund processing", () => {
  assert.equal(requiresManualCodRefund("cod", "cod"), true);
});

test("PayU returns keep the online refund action", () => {
  assert.equal(requiresManualCodRefund("payu", "UPI"), false);
});
