"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  createAdminContentBlock,
  deleteAdminContentBlock,
  describeAdminError,
  reorderAdminContentBlocks,
  updateAdminContentBlock,
  type ContentBlockInput,
  type ProductContentBlock,
  type ProductContentLayout,
} from "@/lib/api/admin-product-api";
import { MediaPickerDrawer } from "../gallery/media-picker-drawer";
import type { MediaAsset } from "@/lib/api/admin-media-api";
import { ADMIN_INPUT_CLASS } from "../ui/form-field";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "@/components/icons";

export type ContentBlockDraft = {
  clientId: string;
  id?: number;
  mediaAssetId: number | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  mediaLabel: string;
  heading: string;
  description: string;
  layout: ProductContentLayout;
  active: boolean;
};

export type ContentBlockManagerHandle = {
  savePending: () => Promise<boolean>;
};

type ContentBlockManagerProps = {
  productId?: number;
  blocks?: ProductContentBlock[];
  drafts?: ContentBlockDraft[];
  onDraftsChange?: (drafts: ContentBlockDraft[]) => void;
  onChanged?: () => Promise<void> | void;
  onDirtyChange?: (dirty: boolean) => void;
};

const LAYOUT_OPTIONS: { value: ProductContentLayout; label: string }[] = [
  { value: "media_left", label: "Media Left" },
  { value: "media_right", label: "Media Right" },
  { value: "media_full", label: "Media Full Width" },
];

export function blankContentBlock(): ContentBlockDraft {
  return { clientId: crypto.randomUUID(), mediaAssetId: null, mediaUrl: null, mediaType: null, mediaLabel: "", heading: "", description: "", layout: "media_left", active: true };
}

export function contentBlockToInput(block: ContentBlockDraft, displayOrder: number): ContentBlockInput {
  return {
    mediaAssetId: block.mediaAssetId,
    heading: block.heading.trim() || null,
    description: block.description.trim() || null,
    layout: block.layout,
    displayOrder,
    active: block.active,
  };
}

export function validateContentBlockDraft(block: ContentBlockDraft): string | null {
  if (block.mediaAssetId == null && !block.heading.trim() && !block.description.trim()) {
    return "A content block needs at least one of: media, heading, or description.";
  }
  if (block.heading.trim().length > 160) return "Heading max 160 characters.";
  if (block.description.trim().length > 5000) return "Description max 5000 characters.";
  return null;
}

function fromBlock(block: ProductContentBlock): ContentBlockDraft {
  return {
    clientId: String(block.id),
    id: block.id,
    mediaAssetId: block.mediaAssetId,
    mediaUrl: block.media?.publicUrl ?? null,
    mediaType: block.media?.mediaType ?? null,
    mediaLabel: block.media ? block.media.title || block.media.originalName : "",
    heading: block.heading ?? "",
    description: block.description ?? "",
    layout: block.layout,
    active: block.active,
  };
}

export const ContentBlockManager = forwardRef<ContentBlockManagerHandle, ContentBlockManagerProps>(function ContentBlockManager(
  { productId, blocks, drafts, onDraftsChange, onChanged, onDirtyChange },
  ref,
) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ContentBlockDraft[]>(drafts ?? blocks?.map(fromBlock) ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentBlockDraft | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [dirtyRows, setDirtyRows] = useState<Record<string, true>>({});
  const [pickerTargetClientId, setPickerTargetClientId] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange?.(Object.keys(dirtyRows).length > 0);
  }, [dirtyRows, onDirtyChange]);

  function commit(next: ContentBlockDraft[]) {
    setRows(next);
    if (!productId) onDraftsChange?.(next);
  }

  function patchRow(clientId: string, patch: Partial<ContentBlockDraft>) {
    commit(rows.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row)));
    if (productId) setDirtyRows((current) => ({ ...current, [clientId]: true }));
    setRowErrors((current) => { const next = { ...current }; delete next[clientId]; return next; });
  }

  function add() {
    const block = blankContentBlock();
    commit([...rows, block]);
    if (productId) setDirtyRows((current) => ({ ...current, [block.clientId]: true }));
  }

  function selectMediaForRow(asset: MediaAsset) {
    if (!pickerTargetClientId) return;
    patchRow(pickerTargetClientId, { mediaAssetId: asset.id, mediaUrl: asset.url, mediaType: asset.mediaType, mediaLabel: asset.title || asset.originalName });
    setPickerTargetClientId(null);
  }

  async function persist(row: ContentBlockDraft, index: number, refresh: boolean): Promise<boolean> {
    const validationError = validateContentBlockDraft(row);
    if (validationError) { setRowErrors((current) => ({ ...current, [row.clientId]: validationError })); showToast(validationError, "error"); return false; }
    if (!productId) return false;
    try {
      const input = contentBlockToInput(row, index);
      const saved = row.id
        ? await updateAdminContentBlock(productId, row.id, input)
        : await createAdminContentBlock(productId, input);
      const authoritative = { ...fromBlock(saved), clientId: row.clientId };
      setRows((current) => current.map((item) => (item.clientId === row.clientId ? authoritative : item)));
      setDirtyRows((current) => { const next = { ...current }; delete next[row.clientId]; return next; });
      setRowErrors((current) => { const next = { ...current }; delete next[row.clientId]; return next; });
      if (refresh) await onChanged?.();
      return true;
    } catch (cause) {
      const message = describeAdminError(cause, "Could not save content block.");
      setRowErrors((current) => ({ ...current, [row.clientId]: message }));
      showToast(message, "error");
      return false;
    }
  }

  async function save(row: ContentBlockDraft) {
    const index = rows.findIndex((item) => item.clientId === row.clientId);
    if (index < 0) return;
    setBusyId(row.clientId);
    try {
      if (await persist(row, index, true)) showToast(row.id ? "Content block updated." : "Content block added.");
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
    if (next.some((row) => !row.id)) { showToast("Save new content blocks before reordering.", "info"); return; }
    setBusyId("reorder");
    try {
      await reorderAdminContentBlocks(productId, next.map((row) => row.id!));
      showToast("Content block order updated."); await onChanged?.();
    } catch (cause) { commit(previous); showToast(describeAdminError(cause, "Could not reorder content blocks."), "error"); }
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
      await deleteAdminContentBlock(productId, deleteTarget.id);
      setDirtyRows((current) => { const next = { ...current }; delete next[deleteTarget.clientId]; return next; });
      showToast("Content block removed."); setDeleteTarget(null); await onChanged?.();
    } catch (cause) { showToast(describeAdminError(cause, "Could not remove content block."), "error"); }
    finally { setBusyId(null); }
  }

  return <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Enhanced Product Content</h2><p className="mt-1 text-xs text-text-primary/50">Optional storytelling blocks — image or video from the Media Library, a heading, and description, shown below Specifications on the Product page.</p></div><button type="button" onClick={add} disabled={Boolean(busyId)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-orange disabled:opacity-50"><PlusIcon width={13} /> Add Content Block</button></div>
    {rows.length === 0 && <p className="rounded-lg bg-cream-bg/60 p-4 text-sm text-text-primary/60">No content blocks yet. This section stays hidden on the Product page until at least one is added.</p>}
    <div className="flex flex-col gap-3">{rows.map((row, index) => <div key={row.clientId} className="flex flex-col gap-3 rounded-lg border border-border-subtle p-3 sm:flex-row">
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-48">
        {row.mediaUrl ? (
          row.mediaType === "video" ? (
            <video src={row.mediaUrl} controls playsInline preload="metadata" className="aspect-video w-full rounded-md bg-cream-bg object-cover" />
          ) : (
            <img src={row.mediaUrl} alt={row.mediaLabel} className="aspect-video w-full rounded-md bg-cream-bg object-cover" />
          )
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-md bg-cream-bg text-xs text-text-primary/40">No media</div>
        )}
        <div className="flex gap-1">
          <button type="button" onClick={() => setPickerTargetClientId(row.clientId)} disabled={busyId !== null} className="flex-1 rounded-lg border border-border-subtle px-2 py-1.5 text-xs font-semibold disabled:opacity-50">{row.mediaAssetId ? "Change" : "Choose from Media Library"}</button>
          {row.mediaAssetId && <button type="button" onClick={() => patchRow(row.clientId, { mediaAssetId: null, mediaUrl: null, mediaType: null, mediaLabel: "" })} disabled={busyId !== null} aria-label={`Remove media from content block ${index + 1}`} className="rounded-lg border border-border-subtle px-2 py-1.5 text-xs font-semibold text-terracotta disabled:opacity-50">Remove</button>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <label className="text-xs font-medium">Heading <span className="font-normal text-text-primary/45">(optional)</span><input aria-label={`Content block ${index + 1} heading`} maxLength={160} value={row.heading} onChange={(e) => patchRow(row.clientId, { heading: e.target.value })} disabled={busyId !== null} className={`${ADMIN_INPUT_CLASS} mt-1`} placeholder="e.g. Built for Everyday Comfort" /></label>
        <label className="text-xs font-medium">Description <span className="font-normal text-text-primary/45">(optional)</span><textarea aria-label={`Content block ${index + 1} description`} rows={3} maxLength={5000} value={row.description} onChange={(e) => patchRow(row.clientId, { description: e.target.value })} disabled={busyId !== null} className={`${ADMIN_INPUT_CLASS} mt-1 resize-y`} /></label>
        <label className="text-xs font-medium">Layout<select aria-label={`Content block ${index + 1} layout`} value={row.layout} onChange={(e) => patchRow(row.clientId, { layout: e.target.value as ProductContentLayout })} disabled={busyId !== null} className={`${ADMIN_INPUT_CLASS} mt-1`}>{LAYOUT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        {rowErrors[row.clientId] && <p role="alert" className="text-xs font-medium text-terracotta">{rowErrors[row.clientId]}</p>}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={row.active} onChange={(e) => patchRow(row.clientId, { active: e.target.checked })} /> Active</label>
          <div className="flex gap-1">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0 || Boolean(busyId)} aria-label={`Move content block ${index + 1} up`} className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} className="rotate-180" /></button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1 || Boolean(busyId)} aria-label={`Move content block ${index + 1} down`} className="rounded p-2 hover:bg-cream-bg disabled:opacity-30"><ChevronDownIcon width={14} /></button>
            {productId && <button type="button" onClick={() => save(row)} disabled={Boolean(busyId)} className="rounded-lg bg-primary-orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{row.id ? "Save" : "Add"}</button>}
            <button type="button" onClick={() => setDeleteTarget(row)} aria-label={`Remove content block ${index + 1}`} className="rounded p-2 text-terracotta hover:bg-terracotta/10"><TrashIcon width={14} /></button>
          </div>
        </div>
      </div>
    </div>)}</div>
    <MediaPickerDrawer open={pickerTargetClientId !== null} onClose={() => setPickerTargetClientId(null)} onSelect={selectMediaForRow} allowedTypes={["image", "video"]} />
    <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Remove content block?" description="This removes the block from the Product only — any referenced Media Library file stays in the Media Library and can be reused." confirmLabel="Remove content block" loading={Boolean(deleteTarget && busyId === deleteTarget.clientId)} />
  </section>;
});
