"use client";

import { useCallback, useState } from "react";
import { getPayOnlineDiscount, updatePayOnlineDiscount, type PayOnlineDiscountSettings } from "@/lib/api/admin-settings-api";
import { AdminApiError } from "@/lib/api/admin-api-client";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { ADMIN_INPUT_CLASS, FormField } from "../ui/form-field";
import { useAdminData } from "../ui/use-admin-data";
import { useToast } from "../ui/toast";

function PayOnlineDiscountForm({ initial }: { initial: PayOnlineDiscountSettings }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.enabled && (!/^\d{1,9}(\.\d{1,2})?$/.test(form.discountValue) || Number(form.discountValue) <= 0)) {
      setError("Enter a discount value greater than 0 with at most two decimals.");
      return;
    }
    setSaving(true); setError("");
    try {
      const saved = await updatePayOnlineDiscount({ enabled: form.enabled, discountType: form.discountType, discountValue: form.discountValue.trim() || "0" });
      setForm(saved); showToast("Pay Online discount saved.");
    } catch (cause) {
      const message = cause instanceof AdminApiError ? cause.message : "Could not save Pay Online discount.";
      setError(message); showToast(message, "error");
    } finally { setSaving(false); }
  };
  return <form onSubmit={save} noValidate className="rounded-xl border border-border-subtle bg-white p-5">
    {error && <div role="alert" className="mb-4 rounded-lg border border-terracotta/30 bg-terracotta/5 p-3 text-sm font-medium text-terracotta">{error}</div>}
    <div className="flex items-center justify-between gap-4 border-b border-border-subtle pb-4">
      <div><p className="text-sm font-semibold text-text-primary">Enable Pay Online Discount</p><p className="mt-0.5 text-xs text-text-primary/60">{form.enabled ? "Active for Pay Online orders" : "Disabled"}</p></div>
      <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
        <input type="checkbox" role="switch" aria-checked={form.enabled} aria-label="Enable Pay Online Discount" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} className="peer sr-only" />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-border-subtle transition-colors duration-150 ease-out peer-checked:bg-primary-orange" />
        <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ease-out peer-checked:translate-x-5" />
      </label>
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <FormField label="Discount type" htmlFor="pay-online-discount-type">
        <select id="pay-online-discount-type" value={form.discountType} onChange={(e) => setForm((current) => ({ ...current, discountType: e.target.value as PayOnlineDiscountSettings["discountType"] }))} className={ADMIN_INPUT_CLASS}>
          <option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option>
        </select>
      </FormField>
      <FormField label={form.discountType === "percentage" ? "Discount value (%)" : "Discount value (₹)"} htmlFor="pay-online-discount-value">
        <input id="pay-online-discount-value" inputMode="decimal" value={form.discountValue} onChange={(e) => setForm((current) => ({ ...current, discountValue: e.target.value }))} className={ADMIN_INPUT_CLASS} />
      </FormField>
    </div>
    <p className="mt-3 text-xs text-text-primary/60">Applied after any coupon discount when customers choose Pay Online. It never applies to Cash on Delivery.</p>
    <div className="mt-5 flex justify-end border-t border-border-subtle pt-4"><button type="submit" disabled={saving} className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button></div>
  </form>;
}

export function PayOnlineDiscountView() {
  const fetcher = useCallback(() => getPayOnlineDiscount(), []);
  const { data, loading, error, reload } = useAdminData(fetcher);
  if (loading || !data) return <LoadingState label="Loading Pay Online discount…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return <div className="flex flex-col gap-5"><div><h1 className="text-xl font-bold text-text-primary">Pay Online Discount</h1><p className="mt-1 text-sm text-text-primary/60">A global prepaid discount for every eligible order.</p></div><PayOnlineDiscountForm initial={data} /></div>;
}
