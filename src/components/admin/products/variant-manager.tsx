"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  createAdminVariant,
  deleteAdminVariant,
  describeAdminError,
  reorderAdminVariants,
  updateAdminVariant,
  type ProductVariant,
  type ProductStatus,
  type VariantInput,
} from "@/lib/api/admin-product-api";
import { ADMIN_INPUT_CLASS } from "../ui/form-field";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "@/components/icons";

export type VariantDraft = {
  clientId: string;
  id?: number;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  active: boolean;
  weightGrams: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
};

export type VariantManagerHandle = {
  savePending: () => Promise<boolean>;
};

type VariantManagerProps = {
  productId?: number;
  productStatus?: ProductStatus;
  variants?: ProductVariant[];
  drafts?: VariantDraft[];
  onDraftsChange?: (drafts: VariantDraft[]) => void;
  onChanged?: () => Promise<void> | void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function blankVariant(): VariantDraft {
  return { clientId: crypto.randomUUID(), name: "", sku: "", price: "", compareAtPrice: "", stock: "0", active: true, weightGrams: "", lengthCm: "", widthCm: "", heightCm: "" };
}

export function variantToInput(variant: VariantDraft, displayOrder: number): VariantInput {
  const nullableNumber = (value: string) => value.trim() ? Number(value) : null;
  const nullableDecimal = (value: string) => value.trim() || null;
  return {
    name: variant.name.trim(), sku: variant.sku.trim(), price: variant.price,
    compareAtPrice: nullableDecimal(variant.compareAtPrice), stock: Number(variant.stock || 0),
    active: variant.active, displayOrder,
    weightGrams: nullableNumber(variant.weightGrams), lengthCm: nullableDecimal(variant.lengthCm),
    widthCm: nullableDecimal(variant.widthCm), heightCm: nullableDecimal(variant.heightCm),
  };
}

const MONEY_PATTERN = /^\d{1,8}(?:\.\d{1,2})?$/;
const SHIPPING_PATTERN = /^\d{1,6}(?:\.\d{1,2})?$/;

export function validateVariantDraft(variant: VariantDraft, requirePositivePrice = false): string | null {
  if (!variant.name.trim() || !variant.sku.trim() || !variant.price.trim()) return "Variant name, SKU, and price are required.";
  if (!MONEY_PATTERN.test(variant.price.trim())) return "Variant price must be non-negative and use no more than 2 decimal places.";
  if (Number(variant.price) <= 0) return requirePositivePrice ? "An active Variant on an active Product needs a positive selling price." : "Variant price must be positive.";
  if (variant.compareAtPrice.trim() && !MONEY_PATTERN.test(variant.compareAtPrice.trim())) return "Compare-at price must use no more than 2 decimal places.";
  if (variant.compareAtPrice.trim() && Number(variant.compareAtPrice) < Number(variant.price)) return "Compare-at price must be greater than or equal to the Variant price.";
  if (!Number.isInteger(Number(variant.stock)) || Number(variant.stock) < 0) return "Variant stock must be a non-negative whole number.";
  if (variant.weightGrams.trim() && (!Number.isInteger(Number(variant.weightGrams)) || Number(variant.weightGrams) <= 0)) return "Variant weight must be a positive whole number.";
  for (const value of [variant.lengthCm, variant.widthCm, variant.heightCm]) {
    if (value.trim() && (!SHIPPING_PATTERN.test(value.trim()) || Number(value) <= 0)) return "Variant shipping measurements must be positive and use no more than 2 decimal places.";
  }
  return null;
}

function fromVariant(variant: ProductVariant): VariantDraft {
  return {
    clientId: String(variant.id), id: variant.id, name: variant.name, sku: variant.sku,
    price: variant.price, compareAtPrice: variant.compareAtPrice ?? "", stock: String(variant.stock),
    active: variant.active, weightGrams: variant.weightGrams == null ? "" : String(variant.weightGrams),
    lengthCm: variant.lengthCm ?? "", widthCm: variant.widthCm ?? "", heightCm: variant.heightCm ?? "",
  };
}

export const VariantManager = forwardRef<VariantManagerHandle, VariantManagerProps>(function VariantManager(
  { productId, productStatus, variants, drafts, onDraftsChange, onChanged, onDirtyChange },
  ref,
) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<VariantDraft[]>(drafts ?? variants?.map(fromVariant) ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VariantDraft | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [dirtyRows, setDirtyRows] = useState<Record<string, true>>({});

  useEffect(() => {
    onDirtyChange?.(Object.keys(dirtyRows).length > 0);
  }, [dirtyRows, onDirtyChange]);

  function commit(next: VariantDraft[]) {
    setRows(next);
    if (!productId) onDraftsChange?.(next);
  }

  function patchRow(clientId: string, patch: Partial<VariantDraft>) {
    commit(rows.map((row) => row.clientId === clientId ? { ...row, ...patch } : row));
    if (productId) setDirtyRows((current) => ({ ...current, [clientId]: true }));
    setRowErrors((current) => { const next = { ...current }; delete next[clientId]; return next; });
  }

  function add() {
    const variant = blankVariant();
    commit([...rows, variant]);
    if (productId) setDirtyRows((current) => ({ ...current, [variant.clientId]: true }));
  }

  async function persist(row: VariantDraft, index: number, refresh: boolean): Promise<boolean> {
    const validationError = validateVariantDraft(row, productStatus === "active" && row.active);
    if (validationError) { setRowErrors((current) => ({ ...current, [row.clientId]: validationError })); showToast(validationError, "error"); return false; }
    if (!productId) return false;
    try {
      const input = variantToInput(row, index);
      const saved = row.id
        ? await updateAdminVariant(productId, row.id, input)
        : await createAdminVariant(productId, input);
      const authoritative = { ...fromVariant(saved), clientId: row.clientId };
      setRows((current) => current.map((item) => item.clientId === row.clientId ? authoritative : item));
      setDirtyRows((current) => { const next = { ...current }; delete next[row.clientId]; return next; });
      setRowErrors((current) => { const next = { ...current }; delete next[row.clientId]; return next; });
      if (refresh) await onChanged?.();
      return true;
    } catch (cause) {
      const message = describeAdminError(cause, "Could not save Variant.");
      setRowErrors((current) => ({ ...current, [row.clientId]: message }));
      showToast(message, "error");
      return false;
    }
  }

  async function save(row: VariantDraft) {
    const index = rows.findIndex((item) => item.clientId === row.clientId);
    if (index < 0) return;
    setBusyId(row.clientId);
    try {
      if (await persist(row, index, true)) showToast(row.id ? "Variant updated." : "Variant created.");
    } finally { setBusyId(null); }
  }

  async function savePending(): Promise<boolean> {
    const pending = rows.filter((row) => dirtyRows[row.clientId]);
    if (pending.length === 0) return true;
    setBusyId("save-all");
    try {
      for (const row of pending) {
        const index = rows.findIndex((item) => item.clientId === row.clientId);
        if (index < 0 || !(await persist(row, index, false))) return false;
      }
      await onChanged?.();
      return true;
    } finally { setBusyId(null); }
  }

  useImperativeHandle(ref, () => ({ savePending }));

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const previous = rows;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
    if (!productId) return;
    if (next.some((row) => !row.id)) { showToast("Save new Variants before reordering.", "info"); return; }
    setBusyId("reorder");
    try {
      await reorderAdminVariants(productId, next.map((row) => row.id!));
      showToast("Variant order updated."); await onChanged?.();
    } catch (cause) { commit(previous); showToast(describeAdminError(cause, "Could not reorder Variants."), "error"); }
    finally { setBusyId(null); }
  }

  async function remove() {
    if (!deleteTarget) return;
    if (!productId || !deleteTarget.id) {
      commit(rows.filter((row) => row.clientId !== deleteTarget.clientId));
      setDirtyRows((current) => { const next = { ...current }; delete next[deleteTarget.clientId]; return next; });
      setDeleteTarget(null);
      return;
    }
    setBusyId(deleteTarget.clientId);
    try {
      await deleteAdminVariant(productId, deleteTarget.id);
      setDirtyRows((current) => { const next = { ...current }; delete next[deleteTarget.clientId]; return next; });
      showToast("Variant deleted."); setDeleteTarget(null); await onChanged?.();
    } catch (cause) { showToast(describeAdminError(cause, "Could not delete Variant."), "error"); }
    finally { setBusyId(null); }
  }

  return <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Variants</h2><p className="mt-1 text-xs text-text-primary/50">Blank shipping overrides inherit the Product defaults.</p></div><button type="button" onClick={add} disabled={Boolean(busyId)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-orange disabled:opacity-50"><PlusIcon width={13} /> Add Variant</button></div>
    {rows.length === 0 && <p className="rounded-lg bg-cream-bg/60 p-4 text-sm text-text-primary/60">No Variants yet. Draft Products may be saved empty; an active Variant Product must be sellable.</p>}
    <div className="flex flex-col gap-3">{rows.map((row, index) => <fieldset key={row.clientId} disabled={busyId !== null} aria-describedby={rowErrors[row.clientId] ? `variant-${row.clientId}-error` : undefined} className="rounded-lg border border-border-subtle p-3 disabled:opacity-60"><legend className="px-1 text-xs font-semibold">Variant {index + 1}</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium">Name<input aria-label={`Variant ${index + 1} name`} value={row.name} onChange={(e) => patchRow(row.clientId, { name: e.target.value })} className={`${ADMIN_INPUT_CLASS} mt-1`} /></label>
        <label className="text-xs font-medium">SKU <span className="font-normal text-text-primary/45">(manual)</span><input aria-label={`Variant ${index + 1} SKU`} maxLength={100} value={row.sku} onChange={(e) => patchRow(row.clientId, { sku: e.target.value })} className={`${ADMIN_INPUT_CLASS} mt-1`} /></label>
        <label className="text-xs font-medium">Price (₹)<input type="number" min="0" step="0.01" value={row.price} onChange={(e) => patchRow(row.clientId, { price: e.target.value })} className={`${ADMIN_INPUT_CLASS} mt-1`} /></label>
        <label className="text-xs font-medium">Compare-at (₹)<input type="number" min="0" step="0.01" value={row.compareAtPrice} onChange={(e) => patchRow(row.clientId, { compareAtPrice: e.target.value })} className={`${ADMIN_INPUT_CLASS} mt-1`} /></label>
        <label className="text-xs font-medium">Stock<input type="number" min="0" step="1" value={row.stock} onChange={(e) => patchRow(row.clientId, { stock: e.target.value })} className={`${ADMIN_INPUT_CLASS} mt-1`} /></label>
        <label className="text-xs font-medium">Weight (g)<input type="number" min="1" placeholder="Inherit" value={row.weightGrams} onChange={(e) => patchRow(row.clientId, { weightGrams: e.target.value })} className={`${ADMIN_INPUT_CLASS} mt-1`} /></label>
        {([['lengthCm','Length (cm)'],['widthCm','Width (cm)'],['heightCm','Height (cm)']] as const).map(([field,label]) => <label key={field} className="text-xs font-medium">{label}<input type="number" min="0.01" step="0.01" placeholder="Inherit" value={row[field]} onChange={(e) => patchRow(row.clientId, { [field]: e.target.value })} className={`${ADMIN_INPUT_CLASS} mt-1`} /></label>)}
      </div>
      {rowErrors[row.clientId] && <p id={`variant-${row.clientId}-error`} role="alert" className="mt-3 text-xs font-medium text-terracotta">{rowErrors[row.clientId]}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={row.active} onChange={(e) => patchRow(row.clientId, { active: e.target.checked })} /> Active Variant</label><div className="flex gap-1"><button type="button" onClick={() => move(index,-1)} disabled={index===0 || Boolean(busyId)} aria-label="Move Variant up" className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} className="rotate-180" /></button><button type="button" onClick={() => move(index,1)} disabled={index===rows.length-1 || Boolean(busyId)} aria-label="Move Variant down" className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} /></button>{productId && <button type="button" onClick={() => save(row)} disabled={Boolean(busyId)} className="rounded-lg bg-primary-orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{row.id ? "Save" : "Create"}</button>}<button type="button" onClick={() => setDeleteTarget(row)} aria-label="Delete Variant" className="rounded p-2 text-terracotta hover:bg-terracotta/10"><TrashIcon width={14} /></button></div></div>
    </fieldset>)}</div>
    <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Delete Variant?" description={deleteTarget?.active ? "Deleting or disabling the final active Variant of an active Product is blocked by the Backend." : "This Variant will be removed from the Product."} confirmLabel="Delete Variant" loading={Boolean(deleteTarget && busyId === deleteTarget.clientId)} />
  </section>;
});
