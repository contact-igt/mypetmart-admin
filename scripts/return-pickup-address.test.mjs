import assert from "node:assert/strict";
import test from "node:test";

import { isPickupAddressFormValid, validatePickupAddressForm } from "../src/lib/return-pickup-address.ts";

const valid = {
  recipientName: "Riya Sharma",
  phone: "+91 98765 43210",
  line1: "10 MG Road",
  line2: "",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400001"
};

test("a complete pickup address passes", () => {
  assert.deepEqual(validatePickupAddressForm(valid), {});
  assert.equal(isPickupAddressFormValid(valid), true);
});

test("blank required fields are reported", () => {
  const errors = validatePickupAddressForm({ ...valid, recipientName: "  ", line1: "", city: "", state: "" });
  assert.ok(errors.recipientName);
  assert.ok(errors.line1);
  assert.ok(errors.city);
  assert.ok(errors.state);
});

test("pincode must be a 6-digit Indian pincode", () => {
  assert.ok(validatePickupAddressForm({ ...valid, postalCode: "12345" }).postalCode);
  assert.ok(validatePickupAddressForm({ ...valid, postalCode: "012345" }).postalCode);
  assert.ok(validatePickupAddressForm({ ...valid, postalCode: "abcdef" }).postalCode);
  assert.equal(validatePickupAddressForm({ ...valid, postalCode: "560001" }).postalCode, undefined);
});

test("phone needs at least 10 digits after stripping non-digits", () => {
  assert.ok(validatePickupAddressForm({ ...valid, phone: "12345" }).phone);
  assert.equal(validatePickupAddressForm({ ...valid, phone: "(022) 4000-1234" }).phone, undefined);
});

test("line 2 is optional", () => {
  assert.equal(isPickupAddressFormValid({ ...valid, line2: "" }), true);
});
