"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  createAdminFeature,
  deleteAdminFeature,
  describeAdminError,
  reorderAdminFeatures,
  updateAdminFeature,
  type FeatureInput,
  type ProductFeature,
} from "@/lib/api/admin-product-api";
import { ADMIN_INPUT_CLASS } from "../ui/form-field";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "@/components/icons";

export type FeatureDraft = {
  clientId: string;
  id?: number;
  label: string;
};

export type FeatureManagerHandle = {
  savePending: () => Promise<boolean>;
};

type FeatureManagerProps = {
  productId?: number;
  features?: ProductFeature[];
  drafts?: FeatureDraft[];
  onDraftsChange?: (drafts: FeatureDraft[]) => void;
  onChanged?: () => Promise<void> | void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function blankFeature(): FeatureDraft {
  return { clientId: crypto.randomUUID(), label: "" };
}

export function featureToInput(feature: FeatureDraft, displayOrder: number): FeatureInput {
  return { label: feature.label.trim(), displayOrder };
}

export function validateFeatureDraft(feature: FeatureDraft): string | null {
  if (!feature.label.trim()) return "Feature label is required.";
  if (feature.label.trim().length > 120) return "Feature label max 120 characters.";
  return null;
}

function fromFeature(feature: ProductFeature): FeatureDraft {
  return { clientId: String(feature.id), id: feature.id, label: feature.label };
}

export const FeatureManager = forwardRef<FeatureManagerHandle, FeatureManagerProps>(function FeatureManager(
  { productId, features, drafts, onDraftsChange, onChanged, onDirtyChange },
  ref,
) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<FeatureDraft[]>(drafts ?? features?.map(fromFeature) ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureDraft | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [dirtyRows, setDirtyRows] = useState<Record<string, true>>({});

  useEffect(() => {
    onDirtyChange?.(Object.keys(dirtyRows).length > 0);
  }, [dirtyRows, onDirtyChange]);

  function commit(next: FeatureDraft[]) {
    setRows(next);
    if (!productId) onDraftsChange?.(next);
  }

  function patchRow(clientId: string, patch: Partial<FeatureDraft>) {
    commit(rows.map((row) => row.clientId === clientId ? { ...row, ...patch } : row));
    if (productId) setDirtyRows((current) => ({ ...current, [clientId]: true }));
    setRowErrors((current) => { const next = { ...current }; delete next[clientId]; return next; });
  }

  function add() {
    const feature = blankFeature();
    commit([...rows, feature]);
    if (productId) setDirtyRows((current) => ({ ...current, [feature.clientId]: true }));
  }

  async function persist(row: FeatureDraft, index: number, refresh: boolean): Promise<boolean> {
    const validationError = validateFeatureDraft(row);
    if (validationError) { setRowErrors((current) => ({ ...current, [row.clientId]: validationError })); showToast(validationError, "error"); return false; }
    if (!productId) return false;
    try {
      const input = featureToInput(row, index);
      const saved = row.id
        ? await updateAdminFeature(productId, row.id, input)
        : await createAdminFeature(productId, input);
      const authoritative = { ...fromFeature(saved), clientId: row.clientId };
      setRows((current) => current.map((item) => item.clientId === row.clientId ? authoritative : item));
      setDirtyRows((current) => { const next = { ...current }; delete next[row.clientId]; return next; });
      setRowErrors((current) => { const next = { ...current }; delete next[row.clientId]; return next; });
      if (refresh) await onChanged?.();
      return true;
    } catch (cause) {
      const message = describeAdminError(cause, "Could not save Feature.");
      setRowErrors((current) => ({ ...current, [row.clientId]: message }));
      showToast(message, "error");
      return false;
    }
  }

  async function save(row: FeatureDraft) {
    const index = rows.findIndex((item) => item.clientId === row.clientId);
    if (index < 0) return;
    setBusyId(row.clientId);
    try {
      if (await persist(row, index, true)) showToast(row.id ? "Feature updated." : "Feature created.");
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
    if (next.some((row) => !row.id)) { showToast("Save new Features before reordering.", "info"); return; }
    setBusyId("reorder");
    try {
      await reorderAdminFeatures(productId, next.map((row) => row.id!));
      showToast("Feature order updated."); await onChanged?.();
    } catch (cause) { commit(previous); showToast(describeAdminError(cause, "Could not reorder Features."), "error"); }
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
      await deleteAdminFeature(productId, deleteTarget.id);
      setDirtyRows((current) => { const next = { ...current }; delete next[deleteTarget.clientId]; return next; });
      showToast("Feature deleted."); setDeleteTarget(null); await onChanged?.();
    } catch (cause) { showToast(describeAdminError(cause, "Could not delete Feature."), "error"); }
    finally { setBusyId(null); }
  }

  return <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Key Features</h2><p className="mt-1 text-xs text-text-primary/50">Optional short buying highlights shown on the Product page.</p></div><button type="button" onClick={add} disabled={Boolean(busyId)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-orange disabled:opacity-50"><PlusIcon width={13} /> Add Feature</button></div>
    {rows.length === 0 && <p className="rounded-lg bg-cream-bg/60 p-4 text-sm text-text-primary/60">No Key Features yet. This section stays hidden on the Product page until at least one Feature is added.</p>}
    <div className="flex flex-col gap-2">{rows.map((row, index) => <div key={row.clientId} className="flex items-center gap-2 rounded-lg border border-border-subtle p-2">
      <div className="flex-1"><input aria-label={`Feature ${index + 1} label`} maxLength={120} value={row.label} onChange={(e) => patchRow(row.clientId, { label: e.target.value })} disabled={busyId !== null} className={ADMIN_INPUT_CLASS} placeholder="e.g. Soft padded construction" />
        {rowErrors[row.clientId] && <p role="alert" className="mt-1 text-xs font-medium text-terracotta">{rowErrors[row.clientId]}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={() => move(index,-1)} disabled={index===0 || Boolean(busyId)} aria-label="Move Feature up" className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} className="rotate-180" /></button>
        <button type="button" onClick={() => move(index,1)} disabled={index===rows.length-1 || Boolean(busyId)} aria-label="Move Feature down" className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} /></button>
        {productId && <button type="button" onClick={() => save(row)} disabled={Boolean(busyId)} className="rounded-lg bg-primary-orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{row.id ? "Save" : "Create"}</button>}
        <button type="button" onClick={() => setDeleteTarget(row)} aria-label="Delete Feature" className="rounded p-2 text-terracotta hover:bg-terracotta/10"><TrashIcon width={14} /></button>
      </div>
    </div>)}</div>
    <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Delete Feature?" description="This Feature will be removed from the Product." confirmLabel="Delete Feature" loading={Boolean(deleteTarget && busyId === deleteTarget.clientId)} />
  </section>;
});
