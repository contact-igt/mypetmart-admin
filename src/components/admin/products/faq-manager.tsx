"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  createAdminFaq,
  deleteAdminFaq,
  describeAdminError,
  reorderAdminFaqs,
  updateAdminFaq,
  type FaqInput,
  type ProductFaq,
} from "@/lib/api/admin-product-api";
import { ADMIN_INPUT_CLASS } from "../ui/form-field";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "@/components/icons";

export type FaqDraft = {
  clientId: string;
  id?: number;
  question: string;
  answer: string;
};

export type FaqManagerHandle = {
  savePending: () => Promise<boolean>;
};

type FaqManagerProps = {
  productId?: number;
  faqs?: ProductFaq[];
  drafts?: FaqDraft[];
  onDraftsChange?: (drafts: FaqDraft[]) => void;
  onChanged?: () => Promise<void> | void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function blankFaq(): FaqDraft {
  return { clientId: crypto.randomUUID(), question: "", answer: "" };
}

export function faqToInput(faq: FaqDraft, displayOrder: number): FaqInput {
  return { question: faq.question.trim(), answer: faq.answer.trim(), displayOrder };
}

export function validateFaqDraft(faq: FaqDraft): string | null {
  if (!faq.question.trim()) return "FAQ question is required.";
  if (faq.question.trim().length > 200) return "FAQ question max 200 characters.";
  if (!faq.answer.trim()) return "FAQ answer is required.";
  if (faq.answer.trim().length > 2000) return "FAQ answer max 2000 characters.";
  return null;
}

function fromFaq(faq: ProductFaq): FaqDraft {
  return { clientId: String(faq.id), id: faq.id, question: faq.question, answer: faq.answer };
}

export const FaqManager = forwardRef<FaqManagerHandle, FaqManagerProps>(function FaqManager(
  { productId, faqs, drafts, onDraftsChange, onChanged, onDirtyChange },
  ref,
) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<FaqDraft[]>(drafts ?? faqs?.map(fromFaq) ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaqDraft | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [dirtyRows, setDirtyRows] = useState<Record<string, true>>({});

  useEffect(() => {
    onDirtyChange?.(Object.keys(dirtyRows).length > 0);
  }, [dirtyRows, onDirtyChange]);

  function commit(next: FaqDraft[]) {
    setRows(next);
    if (!productId) onDraftsChange?.(next);
  }

  function patchRow(clientId: string, patch: Partial<FaqDraft>) {
    commit(rows.map((row) => row.clientId === clientId ? { ...row, ...patch } : row));
    if (productId) setDirtyRows((current) => ({ ...current, [clientId]: true }));
    setRowErrors((current) => { const next = { ...current }; delete next[clientId]; return next; });
  }

  function add() {
    const faq = blankFaq();
    commit([...rows, faq]);
    if (productId) setDirtyRows((current) => ({ ...current, [faq.clientId]: true }));
  }

  async function persist(row: FaqDraft, index: number, refresh: boolean): Promise<boolean> {
    const validationError = validateFaqDraft(row);
    if (validationError) { setRowErrors((current) => ({ ...current, [row.clientId]: validationError })); showToast(validationError, "error"); return false; }
    if (!productId) return false;
    try {
      const input = faqToInput(row, index);
      const saved = row.id
        ? await updateAdminFaq(productId, row.id, input)
        : await createAdminFaq(productId, input);
      const authoritative = { ...fromFaq(saved), clientId: row.clientId };
      setRows((current) => current.map((item) => item.clientId === row.clientId ? authoritative : item));
      setDirtyRows((current) => { const next = { ...current }; delete next[row.clientId]; return next; });
      setRowErrors((current) => { const next = { ...current }; delete next[row.clientId]; return next; });
      if (refresh) await onChanged?.();
      return true;
    } catch (cause) {
      const message = describeAdminError(cause, "Could not save FAQ.");
      setRowErrors((current) => ({ ...current, [row.clientId]: message }));
      showToast(message, "error");
      return false;
    }
  }

  async function save(row: FaqDraft) {
    const index = rows.findIndex((item) => item.clientId === row.clientId);
    if (index < 0) return;
    setBusyId(row.clientId);
    try {
      if (await persist(row, index, true)) showToast(row.id ? "FAQ updated." : "FAQ created.");
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
    if (next.some((row) => !row.id)) { showToast("Save new FAQs before reordering.", "info"); return; }
    setBusyId("reorder");
    try {
      await reorderAdminFaqs(productId, next.map((row) => row.id!));
      showToast("FAQ order updated."); await onChanged?.();
    } catch (cause) { commit(previous); showToast(describeAdminError(cause, "Could not reorder FAQs."), "error"); }
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
      await deleteAdminFaq(productId, deleteTarget.id);
      setDirtyRows((current) => { const next = { ...current }; delete next[deleteTarget.clientId]; return next; });
      showToast("FAQ deleted."); setDeleteTarget(null); await onChanged?.();
    } catch (cause) { showToast(describeAdminError(cause, "Could not delete FAQ."), "error"); }
    finally { setBusyId(null); }
  }

  return <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Product FAQs</h2><p className="mt-1 text-xs text-text-primary/50">Add frequently asked questions shown to customers on the Product page.</p></div><button type="button" onClick={add} disabled={Boolean(busyId)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-orange disabled:opacity-50"><PlusIcon width={13} /> Add FAQ</button></div>
    {rows.length === 0 && <p className="rounded-lg bg-cream-bg/60 p-4 text-sm text-text-primary/60">No FAQs yet. This section stays hidden on the Product page until at least one FAQ is added.</p>}
    <div className="flex flex-col gap-2">{rows.map((row, index) => <div key={row.clientId} className="flex items-start gap-2 rounded-lg border border-border-subtle p-2">
      <div className="flex flex-1 flex-col gap-2">
        <div><input aria-label={`FAQ ${index + 1} question`} maxLength={200} value={row.question} onChange={(e) => patchRow(row.clientId, { question: e.target.value })} disabled={busyId !== null} className={ADMIN_INPUT_CLASS} placeholder="e.g. Is this machine washable?" /></div>
        <div><textarea aria-label={`FAQ ${index + 1} answer`} maxLength={2000} rows={2} value={row.answer} onChange={(e) => patchRow(row.clientId, { answer: e.target.value })} disabled={busyId !== null} className={ADMIN_INPUT_CLASS} placeholder="e.g. Yes, hand wash with mild detergent." /></div>
        {rowErrors[row.clientId] && <p role="alert" className="text-xs font-medium text-terracotta">{rowErrors[row.clientId]}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={() => move(index,-1)} disabled={index===0 || Boolean(busyId)} aria-label="Move FAQ up" className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} className="rotate-180" /></button>
        <button type="button" onClick={() => move(index,1)} disabled={index===rows.length-1 || Boolean(busyId)} aria-label="Move FAQ down" className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} /></button>
        {productId && <button type="button" onClick={() => save(row)} disabled={Boolean(busyId)} className="rounded-lg bg-primary-orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{row.id ? "Save" : "Create"}</button>}
        <button type="button" onClick={() => setDeleteTarget(row)} aria-label="Delete FAQ" className="rounded p-2 text-terracotta hover:bg-terracotta/10"><TrashIcon width={14} /></button>
      </div>
    </div>)}</div>
    <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Delete FAQ?" description="This FAQ will be removed from the Product." confirmLabel="Delete FAQ" loading={Boolean(deleteTarget && busyId === deleteTarget.clientId)} />
  </section>;
});
