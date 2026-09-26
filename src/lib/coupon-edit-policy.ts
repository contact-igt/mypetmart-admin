// Mirrors the backend rule in admin-coupon.service.ts: once a coupon has any
// redemption history, every term (code, discount, dates, limits, first-order
// flag, payment-method eligibility, product/category eligibility) is frozen and
// PATCH returns 409 COUPON_TERMS_IMMUTABLE. Only the internal name can change
// (status has its own endpoint).
export type CouponFormField =
  | "name"
  | "code"
  | "discountType"
  | "discountValue"
  | "maxDiscount"
  | "minEligibleAmount"
  | "startsAt"
  | "endsAt"
  | "usageLimit"
  | "perCustomerLimit"
  | "firstOrderOnly"
  | "paymentMethodEligibility"
  | "eligibility";

export function isCouponFieldEditable(field: CouponFormField, hasRedemptionHistory: boolean): boolean {
  return !hasRedemptionHistory || field === "name";
}
