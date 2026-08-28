"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  createAdminSpecification,
  deleteAdminSpecification,
  describeAdminError,
  reorderAdminSpecifications,
  updateAdminSpecification,
  type ProductSpecification,
  type SpecificationInput,
} from "@/lib/api/admin-product-api";
import { ADMIN_INPUT_CLASS } from "../ui/form-field";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "@/components/icons";

export type SpecificationDraft = {
  clientId: string;
  id?: number;
  label: string;
  value: string;
};

export type SpecificationManagerHandle = {
  savePending: () => Promise<boolean>;
};

type SpecificationManagerProps = {
  productId?: number;
  specifications?: ProductSpecification[];
  drafts?: SpecificationDraft[];
  onDraftsChange?: (drafts: SpecificationDraft[]) => void;
  onChanged?: () => Promise<void> | void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function blankSpecification(): SpecificationDraft {
  return { clientId: crypto.randomUUID(), label: "", value: "" };
}

export function specificationToInput(specification: SpecificationDraft, displayOrder: number): SpecificationInput {
  return { label: specification.label.trim(), value: specification.value.trim(), displayOrder };
}

export function validateSpecificationDraft(specification: SpecificationDraft): string | null {
  if (!specification.label.trim()) return "Specification label is required.";
  if (specification.label.trim().length > 80) return "Specification label max 80 characters.";
  if (!specification.value.trim()) return "Specification value is required.";
  if (specification.value.trim().length > 200) return "Specification value max 200 characters.";
  return null;
}

function fromSpecification(specification: ProductSpecification): SpecificationDraft {
  return { clientId: String(specification.id), id: specification.id, label: specification.label, value: specification.value };
}

export const SpecificationManager = forwardRef<SpecificationManagerHandle, SpecificationManagerProps>(function SpecificationManager(
  { productId, specifications, drafts, onDraftsChange, onChanged, onDirtyChange },
  ref,
) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<SpecificationDraft[]>(drafts ?? specifications?.map(fromSpecification) ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpecificationDraft | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [dirtyRows, setDirtyRows] = useState<Record<string, true>>({});

  useEffect(() => {
    onDirtyChange?.(Object.keys(dirtyRows).length > 0);
  }, [dirtyRows, onDirtyChange]);

  function commit(next: SpecificationDraft[]) {
    setRows(next);
    if (!productId) onDraftsChange?.(next);
  }

  function patchRow(clientId: string, patch: Partial<SpecificationDraft>) {
    commit(rows.map((row) => row.clientId === clientId ? { ...row, ...patch } : row));
    if (productId) setDirtyRows((current) => ({ ...current, [clientId]: true }));
    setRowErrors((current) => { const next = { ...current }; delete next[clientId]; return next; });
  }

  function add() {
    const specification = blankSpecification();
    commit([...rows, specification]);
    if (productId) setDirtyRows((current) => ({ ...current, [specification.clientId]: true }));
  }

  async function persist(row: SpecificationDraft, index: number, refresh: boolean): Promise<boolean> {
    const validationError = validateSpecificationDraft(row);
    if (validationError) { setRowErrors((current) => ({ ...current, [row.clientId]: validationError })); showToast(validationError, "error"); return false; }
    if (!productId) return false;
    try {
      const input = specificationToInput(row, index);
      const saved = row.id
        ? await updateAdminSpecification(productId, row.id, input)
        : await createAdminSpecification(productId, input);
      const authoritative = { ...fromSpecification(saved), clientId: row.clientId };
      setRows((current) => current.map((item) => item.clientId === row.clientId ? authoritative : item));
      setDirtyRows((current) => { const next = { ...current }; delete next[row.clientId]; return next; });
      setRowErrors((current) => { const next = { ...current }; delete next[row.clientId]; return next; });
      if (refresh) await onChanged?.();
      return true;
    } catch (cause) {
      const message = describeAdminError(cause, "Could not save Specification.");
      setRowErrors((current) => ({ ...current, [row.clientId]: message }));
      showToast(message, "error");
      return false;
    }
  }

  async function save(row: SpecificationDraft) {
    const index = rows.findIndex((item) => item.clientId === row.clientId);
    if (index < 0) return;
    setBusyId(row.clientId);
    try {
      if (await persist(row, index, true)) showToast(row.id ? "Specification updated." : "Specification created.");
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
    if (next.some((row) => !row.id)) { showToast("Save new Specifications before reordering.", "info"); return; }
    setBusyId("reorder");
    try {
      await reorderAdminSpecifications(productId, next.map((row) => row.id!));
      showToast("Specification order updated."); await onChanged?.();
    } catch (cause) { commit(previous); showToast(describeAdminError(cause, "Could not reorder Specifications."), "error"); }
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
      await deleteAdminSpecification(productId, deleteTarget.id);
      setDirtyRows((current) => { const next = { ...current }; delete next[deleteTarget.clientId]; return next; });
      showToast("Specification deleted."); setDeleteTarget(null); await onChanged?.();
    } catch (cause) { showToast(describeAdminError(cause, "Could not delete Specification."), "error"); }
    finally { setBusyId(null); }
  }

  return <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Product Specifications</h2><p className="mt-1 text-xs text-text-primary/50">Add product-specific information such as material, life stage, breed size, colour or capacity. Pricing, stock, SKU and shipping fields are managed separately.</p></div><button type="button" onClick={add} disabled={Boolean(busyId)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-orange disabled:opacity-50"><PlusIcon width={13} /> Add Specification</button></div>
    {rows.length === 0 && <p className="rounded-lg bg-cream-bg/60 p-4 text-sm text-text-primary/60">No Specifications yet. This section stays hidden on the Product page until at least one Specification is added.</p>}
    <div className="flex flex-col gap-2">{rows.map((row, index) => <div key={row.clientId} className="flex items-center gap-2 rounded-lg border border-border-subtle p-2">
      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        <div><input aria-label={`Specification ${index + 1} label`} maxLength={80} value={row.label} onChange={(e) => patchRow(row.clientId, { label: e.target.value })} disabled={busyId !== null} className={ADMIN_INPUT_CLASS} placeholder="e.g. Material" /></div>
        <div><input aria-label={`Specification ${index + 1} value`} maxLength={200} value={row.value} onChange={(e) => patchRow(row.clientId, { value: e.target.value })} disabled={busyId !== null} className={ADMIN_INPUT_CLASS} placeholder="e.g. Nylon" /></div>
        {rowErrors[row.clientId] && <p role="alert" className="sm:col-span-2 text-xs font-medium text-terracotta">{rowErrors[row.clientId]}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={() => move(index,-1)} disabled={index===0 || Boolean(busyId)} aria-label="Move Specification up" className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} className="rotate-180" /></button>
        <button type="button" onClick={() => move(index,1)} disabled={index===rows.length-1 || Boolean(busyId)} aria-label="Move Specification down" className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} /></button>
        {productId && <button type="button" onClick={() => save(row)} disabled={Boolean(busyId)} className="rounded-lg bg-primary-orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{row.id ? "Save" : "Create"}</button>}
        <button type="button" onClick={() => setDeleteTarget(row)} aria-label="Delete Specification" className="rounded p-2 text-terracotta hover:bg-terracotta/10"><TrashIcon width={14} /></button>
      </div>
    </div>)}</div>
    <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Delete Specification?" description="This Specification will be removed from the Product." confirmLabel="Delete Specification" loading={Boolean(deleteTarget && busyId === deleteTarget.clientId)} />
  </section>;
});
