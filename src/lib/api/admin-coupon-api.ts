import { AdminApiError, adminApiRequest } from "@/lib/api/admin-api-client";

// ---------------------------------------------------------------------------
// Backend contract this client expects (Module 4 — Admin Coupon Management).
// Mirrors mypetmart-backend/src/database/tables/{Coupon,CouponProduct,
// CouponCategory,CouponRedemption}Table and CouponModels/coupon.types.ts.
// As of this module's authoring, no `/admin/coupons*` controller exists yet
// in the backend — this is the exact shape a companion backend task must
// implement for this UI to function:
//
//   GET    /admin/coupons?search=&status=&discountType=&page=&pageSize=&sortBy=&sortDir=
//            -> { items: BackendCoupon[], total, page, pageSize, totalPages }
//   GET    /admin/coupons/:id                 -> BackendCoupon
//   POST   /admin/coupons                     -> BackendCoupon
//   PATCH  /admin/coupons/:id                 -> BackendCoupon
//   PATCH  /admin/coupons/:id/status  {status} -> BackendCoupon
//   GET    /admin/coupons/:id/redemptions?status=&page=&pageSize=
//            -> { items: BackendCouponRedemption[], total, page, pageSize, totalPages }
//
// discountValue/maxDiscountPaise/minEligibleAmountPaise travel over the wire
// in the SAME raw integer units the DB stores (basis points for percentage,
// paise for fixed) — this module converts to/from human rupee/percent units
// entirely on the client side (see toBasisPoints/fromBasisPoints/toPaise/
// fromPaise below), the same boundary-conversion responsibility every other
// admin form in this app already owns for its own numeric fields.
//
// PATCH /admin/coupons/:id must reject changes to code/discountType/
// discountValue/maxDiscountPaise/minEligibleAmountPaise/eligibleProductIds/
// eligibleCategoryIds once `hasReservations` is true (V1 rule: "prevent
// financial-term changes" on a used coupon) — enforced server-side; this
// client only mirrors that by disabling the fields (see coupon-form.tsx).
// ---------------------------------------------------------------------------

export type CouponDiscountType = "percentage" | "fixed";
export type CouponPaymentMethodEligibility = "both" | "payu" | "cod";
export type CouponStatus = "draft" | "active" | "inactive";
export type CouponRedemptionStatus = "reserved" | "consumed" | "released";

export type CouponEligibleProduct = { id: number; name: string; sku: string };
export type CouponEligibleCategory = { id: number; name: string };

export type Coupon = {
  id: string;
  code: string;
  name: string;
  discountType: CouponDiscountType;
  discountValue: number; // basis points (percentage) or paise (fixed) — raw, as stored
  maxDiscountPaise: number | null;
  minEligibleAmountPaise: number;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  firstOrderOnly: boolean;
  paymentMethodEligibility: CouponPaymentMethodEligibility;
  status: CouponStatus;
  usedCount: number;
  remainingUses: number | null;
  eligibleProductIds: number[];
  eligibleCategoryIds: number[];
  eligibleProducts: CouponEligibleProduct[];
  eligibleCategories: CouponEligibleCategory[];
  // True once at least one "reserved" or "consumed" CouponRedemption row
  // exists — code and financial terms become immutable from this point on.
  hasReservations: boolean;
  createdAt: string;
  updatedAt: string;
};

type BackendCoupon = {
  id: number;
  code: string;
  name: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountPaise: number | null;
  minEligibleAmountPaise: number;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  firstOrderOnly: boolean;
  paymentMethodEligibility?: CouponPaymentMethodEligibility;
  status: CouponStatus;
  usedCount: number;
  remainingUses: number | null;
  eligibleProductIds: number[];
  eligibleCategoryIds: number[];
  eligibleProducts?: CouponEligibleProduct[];
  eligibleCategories?: CouponEligibleCategory[];
  hasReservations: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CouponRedemption = {
  id: string;
  orderId: number;
  orderNumber: string;
  status: CouponRedemptionStatus;
  discountAmount: string; // formatted money, e.g. "100.00"
  eligibleMerchandiseSubtotal: string;
  customerType: "customer" | "guest";
  reservedAt: string;
  consumedAt: string | null;
  releasedAt: string | null;
};

type BackendCouponRedemption = {
  id: number;
  orderId: number;
  orderNumber: string;
  status: CouponRedemptionStatus;
  discountAmountPaise: number;
  eligibleMerchandisePaise: number;
  customerType: "customer" | "guest";
  reservedAt: string;
  consumedAt: string | null;
  releasedAt: string | null;
};

export type CouponListResult = { items: Coupon[]; total: number; page: number; pageSize: number; totalPages: number };
export type CouponRedemptionListResult = { items: CouponRedemption[]; total: number; page: number; pageSize: number; totalPages: number };

// Human-facing units the form works in — converted to/from the backend's
// raw basis-points/paise integers at this module's boundary only.
export type CouponInput = {
  code: string;
  name: string;
  discountType: CouponDiscountType;
  discountValue: number; // percent (e.g. 10 for 10%) or rupees (e.g. 100 for fixed)
  maxDiscount: number | null; // rupees, percentage-type only
  minEligibleAmount: number; // rupees
  startsAt: string | null; // ISO
  endsAt: string | null; // ISO
  usageLimit: number | null;
  perCustomerLimit: number | null;
  firstOrderOnly: boolean;
  paymentMethodEligibility: CouponPaymentMethodEligibility;
  eligibleProductIds: number[];
  eligibleCategoryIds: number[];
};

export function toBasisPoints(percent: number): number {
  return Math.round(percent * 100);
}
export function fromBasisPoints(basisPoints: number): number {
  return basisPoints / 100;
}
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
export function fromPaise(paise: number): number {
  return paise / 100;
}

function toCoupon(c: BackendCoupon): Coupon {
  return {
    id: String(c.id),
    code: c.code,
    name: c.name,
    discountType: c.discountType,
    discountValue: c.discountValue,
    maxDiscountPaise: c.maxDiscountPaise,
    minEligibleAmountPaise: c.minEligibleAmountPaise,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    usageLimit: c.usageLimit,
    perCustomerLimit: c.perCustomerLimit,
    firstOrderOnly: c.firstOrderOnly,
    paymentMethodEligibility: c.paymentMethodEligibility ?? "both",
    status: c.status,
    usedCount: c.usedCount,
    remainingUses: c.remainingUses,
    eligibleProductIds: c.eligibleProductIds ?? [],
    eligibleCategoryIds: c.eligibleCategoryIds ?? [],
    eligibleProducts: c.eligibleProducts ?? [],
    eligibleCategories: c.eligibleCategories ?? [],
    hasReservations: c.hasReservations,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function toRedemption(r: BackendCouponRedemption): CouponRedemption {
  return {
    id: String(r.id),
    orderId: r.orderId,
    orderNumber: r.orderNumber,
    status: r.status,
    discountAmount: fromPaise(r.discountAmountPaise).toFixed(2),
    eligibleMerchandiseSubtotal: fromPaise(r.eligibleMerchandisePaise).toFixed(2),
    customerType: r.customerType,
    reservedAt: r.reservedAt,
    consumedAt: r.consumedAt,
    releasedAt: r.releasedAt,
  };
}

function couponPath(id: string): string {
  return `/admin/coupons/${encodeURIComponent(id)}`;
}

export function toRequestBody(input: CouponInput) {
  return {
    code: input.code,
    name: input.name,
    discountType: input.discountType,
    discountValue: input.discountType === "percentage" ? toBasisPoints(input.discountValue) : toPaise(input.discountValue),
    maxDiscountPaise: input.discountType === "percentage" && input.maxDiscount !== null ? toPaise(input.maxDiscount) : null,
    minEligibleAmountPaise: toPaise(input.minEligibleAmount),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    usageLimit: input.usageLimit,
    perCustomerLimit: input.perCustomerLimit,
    firstOrderOnly: input.firstOrderOnly,
    paymentMethodEligibility: input.paymentMethodEligibility,
    eligibleProductIds: input.eligibleProductIds,
    eligibleCategoryIds: input.eligibleCategoryIds,
  };
}

export async function listAdminCoupons(query: {
  search?: string;
  status?: CouponStatus;
  discountType?: CouponDiscountType;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
}): Promise<CouponListResult> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const result = await adminApiRequest<{ items: BackendCoupon[]; total: number; page: number; pageSize: number; totalPages: number }>(
    `/admin/coupons?${params.toString()}`,
  );
  return { ...result, items: result.items.map(toCoupon) };
}

export async function getAdminCoupon(id: string): Promise<Coupon> {
  return toCoupon(await adminApiRequest<BackendCoupon>(couponPath(id)));
}

export async function createAdminCoupon(input: CouponInput): Promise<Coupon> {
  return toCoupon(
    await adminApiRequest<BackendCoupon>("/admin/coupons", { method: "POST", body: JSON.stringify(toRequestBody(input)) }),
  );
}

export async function updateAdminCoupon(id: string, input: CouponInput): Promise<Coupon> {
  return toCoupon(
    await adminApiRequest<BackendCoupon>(couponPath(id), { method: "PATCH", body: JSON.stringify(toRequestBody(input)) }),
  );
}

export async function setAdminCouponStatus(id: string, status: CouponStatus): Promise<Coupon> {
  return toCoupon(
    await adminApiRequest<BackendCoupon>(`${couponPath(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  );
}

export async function listAdminCouponRedemptions(
  id: string,
  query: { status?: CouponRedemptionStatus; page?: number; pageSize?: number },
): Promise<CouponRedemptionListResult> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const result = await adminApiRequest<{ items: BackendCouponRedemption[]; total: number; page: number; pageSize: number; totalPages: number }>(
    `${couponPath(id)}/redemptions?${params.toString()}`,
  );
  return { ...result, items: result.items.map(toRedemption) };
}

export function describeAdminError(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) {
    return `${error.message}${error.requestId ? ` (request ${error.requestId})` : ""}`;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function firstValidationErrors(error: unknown): Record<string, string> {
  if (!(error instanceof AdminApiError) || !error.errors) return {};
  return Object.fromEntries(Object.entries(error.errors).map(([field, messages]) => [field, messages[0] ?? "Invalid value."]));
}
