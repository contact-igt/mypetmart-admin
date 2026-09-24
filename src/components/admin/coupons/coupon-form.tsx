"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAdminCoupon,
  describeAdminError,
  firstValidationErrors,
  fromBasisPoints,
  fromPaise,
  getAdminCoupon,
  setAdminCouponStatus,
  updateAdminCoupon,
  type Coupon,
  type CouponDiscountType,
  type CouponInput,
  type CouponPaymentMethodEligibility,
} from "@/lib/api/admin-coupon-api";
import { fetchAdminCategories } from "@/lib/api/admin-category-api";
import { listAdminProducts, type ProductListItem } from "@/lib/api/admin-product-api";
import type { Category } from "@/data/admin/types";
import { AdminApiError } from "@/lib/api/admin-api-client";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ErrorState, LoadingState } from "../ui/empty-state";
import { FormField, ADMIN_INPUT_CLASS } from "../ui/form-field";
import { StatusBadge } from "../ui/status-badge";
import { useToast } from "../ui/toast";

type FormState = {
  code: string;
  name: string;
  discountType: CouponDiscountType;
  discountValue: string;
  maxDiscount: string;
  minEligibleAmount: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perCustomerLimit: string;
  firstOrderOnly: boolean;
  paymentMethodEligibility: CouponPaymentMethodEligibility;
  eligibleProductIds: number[];
  eligibleCategoryIds: number[];
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  discountType: "percentage",
  discountValue: "",
  maxDiscount: "",
  minEligibleAmount: "0",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  perCustomerLimit: "",
  firstOrderOnly: false,
  paymentMethodEligibility: "both",
  eligibleProductIds: [],
  eligibleCategoryIds: [],
};

function toIsoDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function fromForm(coupon: Coupon): FormState {
  return {
    code: coupon.code,
    name: coupon.name,
    discountType: coupon.discountType,
    discountValue: String(coupon.discountType === "percentage" ? fromBasisPoints(coupon.discountValue) : fromPaise(coupon.discountValue)),
    maxDiscount: coupon.maxDiscountPaise !== null ? String(fromPaise(coupon.maxDiscountPaise)) : "",
    minEligibleAmount: String(fromPaise(coupon.minEligibleAmountPaise)),
    startsAt: toIsoDateInput(coupon.startsAt),
    endsAt: toIsoDateInput(coupon.endsAt),
    usageLimit: coupon.usageLimit !== null ? String(coupon.usageLimit) : "",
    perCustomerLimit: coupon.perCustomerLimit !== null ? String(coupon.perCustomerLimit) : "",
    firstOrderOnly: coupon.firstOrderOnly,
    paymentMethodEligibility: coupon.paymentMethodEligibility ?? "both",
    eligibleProductIds: coupon.eligibleProductIds,
    eligibleCategoryIds: coupon.eligibleCategoryIds,
  };
}

const CODE_PATTERN = /^[A-Za-z0-9_-]+$/u;

export function CouponForm({ couponId }: { couponId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditing = couponId !== undefined;

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const locked = coupon?.hasReservations ?? false;

  const loadCoupon = useCallback(async () => {
    if (!couponId) return;
    setLoading(true);
    setLoadError("");
    try {
      const next = await getAdminCoupon(couponId);
      setCoupon(next);
      setForm(fromForm(next));
      setDirty(false);
    } catch (error) {
      setLoadError(error instanceof AdminApiError && error.status === 404 ? "Coupon not found. It may have been removed." : describeAdminError(error, "Could not load the coupon."));
    } finally {
      setLoading(false);
    }
  }, [couponId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; loadCoupon is also the Retry handler
    void loadCoupon();
  }, [loadCoupon]);

  useEffect(() => {
    fetchAdminCategories("active").then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
    setErrors((current) => {
      const next = { ...current };
      delete next[field as string];
      return next;
    });
    setGeneralError("");
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    const code = form.code.trim();
    if (!code) next.code = "Coupon code is required.";
    else if (code.length > 40) next.code = "Coupon code must be at most 40 characters.";
    else if (!CODE_PATTERN.test(code)) next.code = "Only letters, numbers, hyphens, and underscores are allowed.";
    if (!form.name.trim()) next.name = "Name is required.";

    const value = Number(form.discountValue);
    if (!form.discountValue.trim() || !Number.isFinite(value) || value <= 0) {
      next.discountValue = "Enter a discount value greater than 0.";
    } else if (form.discountType === "percentage" && value > 100) {
      next.discountValue = "A percentage discount cannot exceed 100.";
    }

    if (form.maxDiscount.trim()) {
      const maxDiscount = Number(form.maxDiscount);
      if (!Number.isFinite(maxDiscount) || maxDiscount < 0) next.maxDiscount = "Enter a valid amount.";
    }

    const minEligible = Number(form.minEligibleAmount);
    if (form.minEligibleAmount.trim() === "" || !Number.isFinite(minEligible) || minEligible < 0) {
      next.minEligibleAmount = "Enter a valid amount (0 or more).";
    }

    if (form.startsAt && form.endsAt && form.startsAt >= form.endsAt) {
      next.endsAt = "End date must be after the start date.";
    }

    if (form.usageLimit.trim()) {
      const usageLimit = Number(form.usageLimit);
      if (!Number.isInteger(usageLimit) || usageLimit <= 0) next.usageLimit = "Enter a whole number greater than 0, or leave blank for unlimited.";
    }
    if (form.perCustomerLimit.trim()) {
      const perCustomerLimit = Number(form.perCustomerLimit);
      if (!Number.isInteger(perCustomerLimit) || perCustomerLimit <= 0) next.perCustomerLimit = "Enter a whole number greater than 0, or leave blank for unlimited.";
    }

    return next;
  }

  function buildInput(): CouponInput {
    return {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscount: form.discountType === "percentage" && form.maxDiscount.trim() ? Number(form.maxDiscount) : null,
      minEligibleAmount: Number(form.minEligibleAmount || "0"),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      usageLimit: form.usageLimit.trim() ? Number(form.usageLimit) : null,
      perCustomerLimit: form.perCustomerLimit.trim() ? Number(form.perCustomerLimit) : null,
      firstOrderOnly: form.firstOrderOnly,
      paymentMethodEligibility: form.paymentMethodEligibility,
      eligibleProductIds: form.eligibleProductIds,
      eligibleCategoryIds: form.eligibleCategoryIds,
    };
  }

  async function save() {
    const localErrors = validate();
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setGeneralError("Review the highlighted fields before saving.");
      return;
    }

    setSaving(true);
    setErrors({});
    setGeneralError("");
    try {
      if (couponId) {
        const updated = await updateAdminCoupon(couponId, buildInput());
        setCoupon(updated);
        setForm(fromForm(updated));
        showToast("Coupon updated.");
        setDirty(false);
      } else {
        const created = await createAdminCoupon(buildInput());
        showToast("Coupon created as a draft.");
        setDirty(false);
        router.push(`/admin/coupons/${created.id}/edit`);
      }
    } catch (error) {
      const nextErrors = firstValidationErrors(error);
      if (error instanceof AdminApiError && error.code === "COUPON_CODE_CONFLICT") nextErrors.code = "A coupon with this code already exists.";
      setErrors(nextErrors);
      const message = describeAdminError(error, "Could not save this coupon.");
      setGeneralError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!coupon || !couponId) return;
    const next = coupon.status === "active" ? "inactive" : "active";
    setStatusBusy(true);
    try {
      const updated = await setAdminCouponStatus(couponId, next);
      setCoupon(updated);
      showToast(next === "active" ? "Coupon activated." : "Coupon deactivated. Existing orders are unaffected.");
    } catch (error) {
      showToast(describeAdminError(error, "Could not change the coupon status."), "error");
    } finally {
      setStatusBusy(false);
    }
  }

  function leaveForm() {
    if (dirty) setDiscardOpen(true);
    else router.push("/admin/coupons");
  }

  if (loading) return <LoadingState label="Loading coupon…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => void loadCoupon()} />;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      noValidate
      className="flex flex-col gap-5 pb-24"
      aria-busy={saving}
    >
      {generalError && <div role="alert" className="rounded-lg border border-terracotta/30 bg-terracotta/5 p-3 text-sm font-medium text-terracotta">{generalError}</div>}

      {isEditing && coupon && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={coupon.status} />
            <span className="text-sm text-text-primary/60">
              Used {coupon.usedCount} time{coupon.usedCount === 1 ? "" : "s"}
              {coupon.remainingUses !== null ? ` · ${coupon.remainingUses} remaining` : " · unlimited uses"}
            </span>
          </div>
          <button
            type="button"
            disabled={statusBusy}
            onClick={() => void toggleStatus()}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50 ${
              coupon.status === "active" ? "border border-terracotta/25 bg-white text-terracotta hover:bg-terracotta/10" : "bg-primary-orange text-white hover:opacity-90"
            }`}
          >
            {statusBusy ? "Working…" : coupon.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </div>
      )}

      {locked && (
        <div role="alert" className="rounded-lg border border-yellow-500/30 bg-yellow-50 p-3 text-sm text-text-primary">
          This coupon has already been used on at least one order. Its code, discount terms, and eligibility can no longer be
          changed — only its name, dates, usage limits, and status can still be edited.
        </div>
      )}

      <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold">Basic information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Coupon code" htmlFor="c-code" error={errors.code} hint={locked ? undefined : "Letters, numbers, hyphens, underscores. Saved in upper case."}>
            <input
              id="c-code"
              value={form.code}
              disabled={locked}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
              aria-invalid={Boolean(errors.code)}
              className={`${ADMIN_INPUT_CLASS} font-mono uppercase disabled:cursor-not-allowed disabled:bg-cream-bg/60`}
              maxLength={40}
            />
          </FormField>
          <FormField label="Internal name" htmlFor="c-name" error={errors.name} hint="Shown only in this admin panel.">
            <input id="c-name" value={form.name} onChange={(e) => update("name", e.target.value)} aria-invalid={Boolean(errors.name)} className={ADMIN_INPUT_CLASS} />
          </FormField>
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold">Discount</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Discount type" htmlFor="c-discount-type">
            <select
              id="c-discount-type"
              value={form.discountType}
              disabled={locked}
              onChange={(e) => update("discountType", e.target.value as CouponDiscountType)}
              className={`${ADMIN_INPUT_CLASS} disabled:cursor-not-allowed disabled:bg-cream-bg/60`}
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </FormField>
          <FormField
            label={form.discountType === "percentage" ? "Discount percentage" : "Discount amount (₹)"}
            htmlFor="c-discount-value"
            error={errors.discountValue}
          >
            <input
              id="c-discount-value"
              type="number"
              min="0"
              step="0.01"
              disabled={locked}
              value={form.discountValue}
              onChange={(e) => update("discountValue", e.target.value)}
              aria-invalid={Boolean(errors.discountValue)}
              className={`${ADMIN_INPUT_CLASS} disabled:cursor-not-allowed disabled:bg-cream-bg/60`}
            />
          </FormField>
          {form.discountType === "percentage" && (
            <FormField label="Maximum discount (₹)" htmlFor="c-max-discount" optional error={errors.maxDiscount} hint="Caps the discount amount on large orders.">
              <input
                id="c-max-discount"
                type="number"
                min="0"
                step="0.01"
                disabled={locked}
                value={form.maxDiscount}
                onChange={(e) => update("maxDiscount", e.target.value)}
                aria-invalid={Boolean(errors.maxDiscount)}
                className={`${ADMIN_INPUT_CLASS} disabled:cursor-not-allowed disabled:bg-cream-bg/60`}
              />
            </FormField>
          )}
          <FormField label="Minimum eligible order amount (₹)" htmlFor="c-min-amount" error={errors.minEligibleAmount}>
            <input
              id="c-min-amount"
              type="number"
              min="0"
              step="0.01"
              disabled={locked}
              value={form.minEligibleAmount}
              onChange={(e) => update("minEligibleAmount", e.target.value)}
              aria-invalid={Boolean(errors.minEligibleAmount)}
              className={`${ADMIN_INPUT_CLASS} disabled:cursor-not-allowed disabled:bg-cream-bg/60`}
            />
          </FormField>
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold">Validity period</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Start date" htmlFor="c-starts-at" optional hint="Leave blank to start immediately.">
            <input id="c-starts-at" type="date" value={form.startsAt} onChange={(e) => update("startsAt", e.target.value)} className={ADMIN_INPUT_CLASS} />
          </FormField>
          <FormField label="Expiry date" htmlFor="c-ends-at" optional error={errors.endsAt} hint="Leave blank for no expiry.">
            <input id="c-ends-at" type="date" value={form.endsAt} onChange={(e) => update("endsAt", e.target.value)} aria-invalid={Boolean(errors.endsAt)} className={ADMIN_INPUT_CLASS} />
          </FormField>
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold">Usage limits</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Global usage limit" htmlFor="c-usage-limit" optional error={errors.usageLimit} hint="Total number of orders this coupon can be used on. Leave blank for unlimited.">
            <input id="c-usage-limit" type="number" min="1" step="1" value={form.usageLimit} onChange={(e) => update("usageLimit", e.target.value)} aria-invalid={Boolean(errors.usageLimit)} className={ADMIN_INPUT_CLASS} />
          </FormField>
          <FormField
            label="Per-customer limit"
            htmlFor="c-per-customer-limit"
            optional
            error={errors.perCustomerLimit}
            hint="Authenticated customers only — guests can't use a coupon with this limit set."
          >
            <input
              id="c-per-customer-limit"
              type="number"
              min="1"
              step="1"
              value={form.perCustomerLimit}
              onChange={(e) => update("perCustomerLimit", e.target.value)}
              aria-invalid={Boolean(errors.perCustomerLimit)}
              className={ADMIN_INPUT_CLASS}
            />
          </FormField>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.firstOrderOnly} onChange={(e) => update("firstOrderOnly", e.target.checked)} />
          First order only <span className="text-text-primary/50">(authenticated customers only — guests can&rsquo;t use this coupon)</span>
        </label>
      </section>

      <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold">Payment method eligibility</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
              form.paymentMethodEligibility === "both"
                ? "border-primary-orange bg-primary-orange/5"
                : "border-border-subtle hover:border-text-primary/20"
            } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="paymentMethodEligibility"
              value="both"
              disabled={locked}
              checked={form.paymentMethodEligibility === "both"}
              onChange={() => update("paymentMethodEligibility", "both")}
              className="mt-0.5 text-primary-orange focus:ring-primary-orange"
            />
            <div>
              <p className="text-sm font-semibold text-text-primary">Both methods</p>
              <p className="mt-0.5 text-xs text-text-primary/60">Valid for both Prepaid (PayU) and Cash on Delivery</p>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
              form.paymentMethodEligibility === "payu"
                ? "border-primary-orange bg-primary-orange/5"
                : "border-border-subtle hover:border-text-primary/20"
            } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="paymentMethodEligibility"
              value="payu"
              disabled={locked}
              checked={form.paymentMethodEligibility === "payu"}
              onChange={() => update("paymentMethodEligibility", "payu")}
              className="mt-0.5 text-primary-orange focus:ring-primary-orange"
            />
            <div>
              <p className="text-sm font-semibold text-text-primary">Prepaid only</p>
              <p className="mt-0.5 text-xs text-text-primary/60">Valid only for Pay Online (PayU). COD orders show savings if switched</p>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
              form.paymentMethodEligibility === "cod"
                ? "border-primary-orange bg-primary-orange/5"
                : "border-border-subtle hover:border-text-primary/20"
            } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="paymentMethodEligibility"
              value="cod"
              disabled={locked}
              checked={form.paymentMethodEligibility === "cod"}
              onChange={() => update("paymentMethodEligibility", "cod")}
              className="mt-0.5 text-primary-orange focus:ring-primary-orange"
            />
            <div>
              <p className="text-sm font-semibold text-text-primary">Cash on Delivery only</p>
              <p className="mt-0.5 text-xs text-text-primary/60">Valid only when Cash on Delivery is selected</p>
            </div>
          </label>
        </div>
      </section>

      <EligibilitySection
        categories={categories}
        selectedCategoryIds={form.eligibleCategoryIds}
        selectedProductIds={form.eligibleProductIds}
        disabled={locked}
        onCategoriesChange={(ids) => update("eligibleCategoryIds", ids)}
        onProductsChange={(ids) => update("eligibleProductIds", ids)}
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-subtle bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="hidden text-xs text-text-primary/50 sm:block">{dirty ? "You have unsaved changes." : "All changes saved."}</p>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={leaveForm} className="rounded-lg border border-border-subtle px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : isEditing ? "Save changes" : "Create as draft"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog open={discardOpen} onClose={() => setDiscardOpen(false)} onConfirm={() => router.push("/admin/coupons")} title="Discard unsaved changes?" description="Unsaved coupon fields will be discarded." confirmLabel="Discard" />
    </form>
  );
}

function EligibilitySection({
  categories,
  selectedCategoryIds,
  selectedProductIds,
  disabled,
  onCategoriesChange,
  onProductsChange,
}: {
  categories: Category[];
  selectedCategoryIds: number[];
  selectedProductIds: number[];
  disabled: boolean;
  onCategoriesChange: (ids: number[]) => void;
  onProductsChange: (ids: number[]) => void;
}) {
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productResults, setProductResults] = useState<{ items: ProductListItem[]; totalPages: number } | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Map<number, string>>(new Map());
  const categorySet = useMemo(() => new Set(selectedCategoryIds), [selectedCategoryIds]);

  useEffect(() => {
    let live = true;
    listAdminProducts({ page: productPage, pageSize: 10, search: productSearch || undefined, sort: "name", order: "ASC" })
      .then((result) => {
        if (!live) return;
        setProductResults({ items: result.items, totalPages: result.totalPages });
        setSelectedProducts((current) => {
          const next = new Map(current);
          for (const item of result.items) if (selectedProductIds.includes(item.id)) next.set(item.id, item.name);
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
    // selectedProductIds intentionally excluded — this effect only loads a page of results, it never re-derives selection from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productPage, productSearch]);

  function toggleCategory(id: number) {
    if (disabled) return;
    const next = new Set(categorySet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onCategoriesChange([...next]);
  }

  function toggleProduct(item: ProductListItem) {
    if (disabled) return;
    const nextIds = new Set(selectedProductIds);
    const nextLabels = new Map(selectedProducts);
    if (nextIds.has(item.id)) {
      nextIds.delete(item.id);
      nextLabels.delete(item.id);
    } else {
      nextIds.add(item.id);
      nextLabels.set(item.id, item.name);
    }
    setSelectedProducts(nextLabels);
    onProductsChange([...nextIds]);
  }

  function removeProduct(id: number) {
    if (disabled) return;
    onProductsChange(selectedProductIds.filter((existing) => existing !== id));
    setSelectedProducts((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }

  return (
    <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
      <h2 className="mb-1 text-sm font-semibold">Eligibility</h2>
      <p className="mb-4 text-xs text-text-primary/50">
        Leave both empty to make every product eligible. Otherwise, a line is eligible if it matches a selected product OR a
        selected category.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-primary/70">Eligible categories</p>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border-subtle p-2">
            {categories.length === 0 && <p className="p-2 text-xs text-text-primary/50">No categories available.</p>}
            {categories.map((category) => (
              <label key={category.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-cream-bg/60">
                <input type="checkbox" disabled={disabled} checked={categorySet.has(Number(category.id))} onChange={() => toggleCategory(Number(category.id))} />
                {category.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-primary/70">Eligible products</p>
          {selectedProductIds.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selectedProductIds.map((id) => (
                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-cream-bg px-2 py-1 text-xs">
                  {selectedProducts.get(id) ?? `Product #${id}`}
                  {!disabled && (
                    <button type="button" onClick={() => removeProduct(id)} aria-label={`Remove ${selectedProducts.get(id) ?? id}`}>
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {!disabled && (
            <input
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setProductPage(1);
              }}
              placeholder="Search products to add…"
              className={`${ADMIN_INPUT_CLASS} mb-2`}
            />
          )}
          {!disabled && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border-subtle p-2">
              {productResults?.items.length === 0 && <p className="p-2 text-xs text-text-primary/50">No products match this search.</p>}
              {productResults?.items.map((item) => (
                <label key={item.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-cream-bg/60">
                  <input type="checkbox" checked={selectedProductIds.includes(item.id)} onChange={() => toggleProduct(item)} />
                  <span className="truncate">{item.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-text-primary/40">{item.sku}</span>
                </label>
              ))}
            </div>
          )}
          {!disabled && productResults && productResults.totalPages > 1 && (
            <div className="mt-2 flex items-center justify-end gap-2 text-xs">
              <button type="button" disabled={productPage <= 1} onClick={() => setProductPage((p) => p - 1)} className="rounded border border-border-subtle px-2 py-1 disabled:opacity-40">
                Previous
              </button>
              <span>
                Page {productPage} of {productResults.totalPages}
              </span>
              <button
                type="button"
                disabled={productPage >= productResults.totalPages}
                onClick={() => setProductPage((p) => p + 1)}
                className="rounded border border-border-subtle px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
