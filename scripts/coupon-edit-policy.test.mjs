import assert from "node:assert/strict";
import test from "node:test";

import { isCouponFieldEditable } from "../src/lib/coupon-edit-policy.ts";

// Backend admin-coupon.service.ts rejects every one of these with
// 409 COUPON_TERMS_IMMUTABLE once the coupon has redemption history.
const TERMS = ["code", "discountType", "discountValue", "maxDiscount", "minEligibleAmount", "startsAt", "endsAt", "usageLimit", "perCustomerLimit", "firstOrderOnly", "paymentMethodEligibility", "eligibility"];

test("a used coupon locks every term the backend treats as immutable", () => {
  for (const field of TERMS) assert.equal(isCouponFieldEditable(field, true), false, field);
});

test("a used coupon still allows renaming", () => {
  assert.equal(isCouponFieldEditable("name", true), true);
});

test("an unused coupon keeps every field editable", () => {
  for (const field of [...TERMS, "name"]) assert.equal(isCouponFieldEditable(field, false), true, field);
});
