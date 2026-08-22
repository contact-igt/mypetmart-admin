"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  createAdminMediaAssignment,
  deleteAdminMediaAssignment,
  describeAdminError,
  reorderAdminMediaAssignments,
  updateAdminMediaAssignment,
  type MediaAssignmentInput,
  type ProductMediaAssignment,
  type ProductMediaRole,
} from "@/lib/api/admin-product-api";
import { MediaPickerDrawer } from "../gallery/media-picker-drawer";
import type { MediaAsset } from "@/lib/api/admin-media-api";
import { ADMIN_INPUT_CLASS } from "../ui/form-field";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "@/components/icons";

export type MediaAssignmentDraft = {
  clientId: string;
  id?: number;
  mediaAssetId: number;
  mediaUrl: string;
  mediaLabel: string;
  title: string;
  caption: string;
  active: boolean;
};

export type ProductVideoManagerHandle = {
  savePending: () => Promise<boolean>;
};

type ProductVideoManagerProps = {
  role: ProductMediaRole;
  heading: string;
  hint: string;
  emptyLabel: string;
  productId?: number;
  assignments?: ProductMediaAssignment[];
  drafts?: MediaAssignmentDraft[];
  onDraftsChange?: (drafts: MediaAssignmentDraft[]) => void;
  onChanged?: () => Promise<void> | void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function blankAssignmentFromAsset(asset: MediaAsset): MediaAssignmentDraft {
  return {
    clientId: crypto.randomUUID(),
    mediaAssetId: asset.id,
    mediaUrl: asset.url,
    mediaLabel: asset.title || asset.originalName,
    title: "",
    caption: "",
    active: true,
  };
}

export function mediaAssignmentToInput(draft: MediaAssignmentDraft, role: ProductMediaRole, displayOrder: number): MediaAssignmentInput {
  return {
    mediaAssetId: draft.mediaAssetId,
    mediaRole: role,
    title: draft.title.trim() || null,
    caption: draft.caption.trim() || null,
    displayOrder,
    active: draft.active,
  };
}

function fromAssignment(assignment: ProductMediaAssignment): MediaAssignmentDraft {
  return {
    clientId: String(assignment.id),
    id: assignment.id,
    mediaAssetId: assignment.mediaAssetId,
    mediaUrl: assignment.media.publicUrl,
    mediaLabel: assignment.media.title || assignment.media.originalName,
    title: assignment.title ?? "",
    caption: assignment.caption ?? "",
    active: assignment.active,
  };
}

export const ProductVideoManager = forwardRef<ProductVideoManagerHandle, ProductVideoManagerProps>(function ProductVideoManager(
  { role, heading, hint, emptyLabel, productId, assignments, drafts, onDraftsChange, onChanged, onDirtyChange },
  ref,
) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<MediaAssignmentDraft[]>(drafts ?? assignments?.map(fromAssignment) ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAssignmentDraft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dirtyRows, setDirtyRows] = useState<Record<string, true>>({});

  useEffect(() => {
    onDirtyChange?.(Object.keys(dirtyRows).length > 0);
  }, [dirtyRows, onDirtyChange]);

  function commit(next: MediaAssignmentDraft[]) {
    setRows(next);
    if (!productId) onDraftsChange?.(next);
  }

  function patchRow(clientId: string, patch: Partial<MediaAssignmentDraft>) {
    commit(rows.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row)));
    if (productId) setDirtyRows((current) => ({ ...current, [clientId]: true }));
  }

  function addFromAsset(asset: MediaAsset) {
    const draft = blankAssignmentFromAsset(asset);
    commit([...rows, draft]);
    if (productId) setDirtyRows((current) => ({ ...current, [draft.clientId]: true }));
  }

  async function persist(row: MediaAssignmentDraft, index: number, refresh: boolean): Promise<boolean> {
    if (!productId) return false;
    try {
      const input = mediaAssignmentToInput(row, role, index);
      const saved = row.id
        ? await updateAdminMediaAssignment(productId, row.id, input)
        : await createAdminMediaAssignment(productId, input);
      const authoritative = { ...fromAssignment(saved), clientId: row.clientId };
      setRows((current) => current.map((item) => (item.clientId === row.clientId ? authoritative : item)));
      setDirtyRows((current) => { const next = { ...current }; delete next[row.clientId]; return next; });
      if (refresh) await onChanged?.();
      return true;
    } catch (cause) {
      showToast(describeAdminError(cause, "Could not save video."), "error");
      return false;
    }
  }

  async function save(row: MediaAssignmentDraft) {
    const index = rows.findIndex((item) => item.clientId === row.clientId);
    if (index < 0) return;
    setBusyId(row.clientId);
    try {
      if (await persist(row, index, true)) showToast(row.id ? "Video updated." : "Video added.");
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
    if (next.some((row) => !row.id)) { showToast("Save new videos before reordering.", "info"); return; }
    setBusyId("reorder");
    try {
      await reorderAdminMediaAssignments(productId, role, next.map((row) => row.id!));
      showToast("Order updated."); await onChanged?.();
    } catch (cause) { commit(previous); showToast(describeAdminError(cause, "Could not reorder."), "error"); }
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
      await deleteAdminMediaAssignment(productId, deleteTarget.id);
      setDirtyRows((current) => { const next = { ...current }; delete next[deleteTarget.clientId]; return next; });
      showToast("Video removed."); setDeleteTarget(null); await onChanged?.();
    } catch (cause) { showToast(describeAdminError(cause, "Could not remove video."), "error"); }
    finally { setBusyId(null); }
  }

  return <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">{heading}</h2><p className="mt-1 text-xs text-text-primary/50">{hint}</p></div><button type="button" onClick={() => setPickerOpen(true)} disabled={Boolean(busyId)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-orange disabled:opacity-50"><PlusIcon width={13} /> Choose from Media Library</button></div>
    {rows.length === 0 && <p className="rounded-lg bg-cream-bg/60 p-4 text-sm text-text-primary/60">{emptyLabel}</p>}
    <div className="flex flex-col gap-3">{rows.map((row, index) => <div key={row.clientId} className="flex flex-col gap-3 rounded-lg border border-border-subtle p-3 sm:flex-row">
      <video src={row.mediaUrl} controls playsInline preload="metadata" className="aspect-video w-full shrink-0 rounded-md bg-cream-bg object-cover sm:w-48" />
      <div className="flex flex-1 flex-col gap-2">
        <p className="truncate text-xs font-medium text-text-primary/60" title={row.mediaLabel}>{row.mediaLabel}</p>
        <label className="text-xs font-medium">Title <span className="font-normal text-text-primary/45">(optional)</span><input aria-label={`Video ${index + 1} title`} maxLength={190} value={row.title} onChange={(e) => patchRow(row.clientId, { title: e.target.value })} disabled={busyId !== null} className={`${ADMIN_INPUT_CLASS} mt-1`} placeholder="e.g. How it works" /></label>
        <label className="text-xs font-medium">Caption <span className="font-normal text-text-primary/45">(optional)</span><textarea aria-label={`Video ${index + 1} caption`} rows={2} maxLength={500} value={row.caption} onChange={(e) => patchRow(row.clientId, { caption: e.target.value })} disabled={busyId !== null} className={`${ADMIN_INPUT_CLASS} mt-1 resize-y`} /></label>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={row.active} onChange={(e) => patchRow(row.clientId, { active: e.target.checked })} /> Active</label>
          <div className="flex gap-1">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0 || Boolean(busyId)} aria-label={`Move video ${index + 1} up`} className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} className="rotate-180" /></button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1 || Boolean(busyId)} aria-label={`Move video ${index + 1} down`} className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} /></button>
            {productId && <button type="button" onClick={() => save(row)} disabled={Boolean(busyId)} className="rounded-lg bg-primary-orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{row.id ? "Save" : "Add"}</button>}
            <button type="button" onClick={() => setDeleteTarget(row)} aria-label={`Remove video ${index + 1}`} className="rounded p-2 text-terracotta hover:bg-terracotta/10"><TrashIcon width={14} /></button>
          </div>
        </div>
      </div>
    </div>)}</div>
    <MediaPickerDrawer open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addFromAsset} allowedTypes={["video"]} />
    <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Remove video?" description="This removes the video from the Product only — the file stays in the Media Library and can be reused." confirmLabel="Remove video" loading={Boolean(deleteTarget && busyId === deleteTarget.clientId)} />
  </section>;
});
