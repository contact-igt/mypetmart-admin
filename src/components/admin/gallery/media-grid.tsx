/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteAdminMediaAsset,
  describeAdminError,
  listAdminMediaAssets,
  updateAdminMediaAsset,
  uploadAdminMediaAsset,
  MEDIA_ASSET_ALL_TYPES,
  MEDIA_ASSET_MAX_BYTES,
  MEDIA_ASSET_VIDEO_MAX_BYTES,
  type MediaAsset,
  type MediaAssetListResult,
  type MediaAssetType,
} from "@/lib/api/admin-media-api";
import { AdminApiError } from "@/lib/api/admin-api-client";
import { ADMIN_INPUT_CLASS, FormField } from "../ui/form-field";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { Dialog } from "../ui/dialog";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { Pagination } from "../ui/pagination";
import { useToast } from "../ui/toast";
import { CopyIcon, PencilIcon, SearchIcon, TrashIcon, UploadIcon } from "@/components/icons";

const PAGE_SIZE = 24;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Shared Media Gallery browsing surface. "manage" mode (the /admin/gallery
 * page) exposes upload, edit alt/title, and delete. "pick" mode (embedded in
 * Product Create/Edit's "Choose From Gallery" drawer) is read-only browsing
 * that reuses the exact same grid, search, pagination and upload — clicking
 * an asset calls onSelect instead of opening its edit/delete controls.
 */
export function MediaGrid({
  mode,
  onSelect,
  allowedTypes,
}: {
  mode: "manage" | "pick";
  onSelect?: (asset: MediaAsset) => void;
  /** Omit for the full Media Gallery (All/Images/Videos filter shown). Pass a single
   * type to lock a picker to that type only (no filter UI) — see MediaPickerDrawer. */
  allowedTypes?: MediaAssetType[];
}) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const locked = allowedTypes && allowedTypes.length === 1 ? allowedTypes[0] : undefined;
  const [typeFilter, setTypeFilter] = useState<MediaAssetType | undefined>(locked);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MediaAssetListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [editTarget, setEditTarget] = useState<MediaAsset | null>(null);
  const [editDrafts, setEditDrafts] = useState({ title: "", altText: "" });
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let live = true;
    Promise.resolve().then(() => {
      if (!live) return;
      setLoading(true);
      setError("");
    });
    listAdminMediaAssets({ page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, type: typeFilter })
      .then((result) => {
        if (!live) return;
        if (page > Math.max(1, result.totalPages)) {
          setPage(Math.max(1, result.totalPages));
          return;
        }
        setData(result);
      })
      .catch((cause) => {
        if (live) setError(describeAdminError(cause, "Could not load the Media Gallery."));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [page, debouncedSearch, typeFilter, reloadKey]);

  function reload() {
    setReloadKey((value) => value + 1);
  }

  function changeTypeFilter(next: MediaAssetType | undefined) {
    setTypeFilter(next);
    setPage(1);
  }

  async function handleUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadAdminMediaAsset(file, { onStage: setUploadStage });
      showToast("Uploaded to the Media Gallery.");
      setPage(1);
      reload();
    } catch (cause) {
      showToast(describeAdminError(cause, "Upload failed."), "error");
    } finally {
      setUploading(false);
      setUploadStage("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function openEdit(asset: MediaAsset) {
    setEditTarget(asset);
    setEditDrafts({ title: asset.title ?? "", altText: asset.altText ?? "" });
  }

  async function saveEdit() {
    if (!editTarget) return;
    setBusy(true);
    try {
      await updateAdminMediaAsset(editTarget.id, { title: editDrafts.title.trim() || null, altText: editDrafts.altText.trim() || null });
      showToast("Media details updated.");
      setEditTarget(null);
      reload();
    } catch (cause) {
      showToast(describeAdminError(cause, "Could not update media details."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteAdminMediaAsset(deleteTarget.id);
      showToast("Deleted from the Media Gallery.");
      setDeleteTarget(null);
      reload();
    } catch (cause) {
      showToast(
        cause instanceof AdminApiError && cause.code === "MEDIA_ASSET_IN_USE"
          ? cause.message
          : describeAdminError(cause, "Could not delete this asset."),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl(asset: MediaAsset) {
    try {
      await navigator.clipboard.writeText(asset.url);
      showToast("Image URL copied.");
    } catch {
      showToast("Could not copy the URL.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative w-full max-w-sm">
          <span className="sr-only">Search media</span>
          <SearchIcon className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-text-primary/40" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search filename or title"
            className="h-11 w-full rounded-lg border border-border-subtle bg-white pl-10 pr-3 text-sm outline-none transition focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/10"
          />
        </label>
        {!locked && (
          <div className="inline-flex rounded-lg border border-border-subtle bg-white p-0.5 text-xs font-semibold">
            {([[undefined, "All"], ["image", "Images"], ["video", "Videos"]] as const).map(([value, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => changeTypeFilter(value)}
                aria-pressed={typeFilter === value}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  typeFilter === value ? "bg-primary-orange text-white" : "text-text-primary/60 hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <UploadIcon width={14} /> {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={(locked === "video" ? MEDIA_ASSET_ALL_TYPES.filter((type) => type.startsWith("video/")) : locked === "image" ? MEDIA_ASSET_ALL_TYPES.filter((type) => type.startsWith("image/")) : MEDIA_ASSET_ALL_TYPES).join(",")}
          onChange={(event) => void handleUpload(event.target.files)}
          className="sr-only"
          aria-label="Upload to Media Gallery"
        />
      </div>
      <p className="text-xs text-text-primary/45">
        {locked === "video"
          ? `MP4 video, up to ${Math.round(MEDIA_ASSET_VIDEO_MAX_BYTES / (1024 * 1024))} MB.`
          : locked === "image"
            ? `JPEG, PNG, or WebP, up to ${Math.round(MEDIA_ASSET_MAX_BYTES / (1024 * 1024))} MB.`
            : `Images: JPEG, PNG, or WebP, up to ${Math.round(MEDIA_ASSET_MAX_BYTES / (1024 * 1024))} MB. MP4 video: up to ${Math.round(MEDIA_ASSET_VIDEO_MAX_BYTES / (1024 * 1024))} MB.`}
      </p>
      {uploading && uploadStage && (
        <p role="status" className="rounded-lg border border-primary-orange/30 bg-primary-orange/5 p-3 text-xs font-medium text-primary-orange">
          {uploadStage}…
        </p>
      )}

      {loading && <LoadingState label="Loading Media Gallery…" />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data?.items.length === 0 && (
        <EmptyState
          title={debouncedSearch ? "No matches" : "Media Gallery is empty"}
          description={debouncedSearch ? "Try a different search." : "Upload an image to reuse it across Products."}
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {data.items.map((asset) => (
              <article key={asset.id} className="group relative overflow-hidden rounded-lg border border-border-subtle bg-white">
                <button
                  type="button"
                  onClick={() => (mode === "pick" ? onSelect?.(asset) : openEdit(asset))}
                  className="relative block w-full text-left"
                >
                  {asset.mediaType === "video" ? (
                    <video
                      src={asset.url}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="aspect-square w-full bg-cream-bg object-cover"
                    />
                  ) : (
                    <img src={asset.url} alt={asset.altText ?? asset.originalName} className="aspect-square w-full bg-cream-bg object-cover" />
                  )}
                  {asset.mediaType === "video" && (
                    <span className="pointer-events-none absolute left-1.5 top-1.5 inline-flex items-center rounded-full bg-deep-brown/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Video
                    </span>
                  )}
                </button>
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-text-primary" title={asset.originalName}>
                    {asset.title || asset.originalName}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-text-primary/50">
                    {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
                    {formatBytes(asset.fileSize)} · {formatDate(asset.createdAt)}
                  </p>
                  {asset.usageCount > 0 && (
                    <p className="mt-1 inline-flex rounded-full bg-cream-bg px-2 py-0.5 text-[10px] font-semibold text-text-primary/60">
                      Used in {asset.usageCount} Product{asset.usageCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
                {mode === "manage" && (
                  <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      title="Copy URL"
                      onClick={() => void copyUrl(asset)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-text-primary/70 shadow hover:text-primary-orange"
                    >
                      <CopyIcon width={13} />
                    </button>
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => openEdit(asset)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-text-primary/70 shadow hover:text-primary-orange"
                    >
                      <PencilIcon width={13} />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => setDeleteTarget(asset)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-terracotta shadow hover:bg-terracotta/10"
                    >
                      <TrashIcon width={13} />
                    </button>
                  </div>
                )}
                {mode === "pick" && (
                  <button
                    type="button"
                    onClick={() => onSelect?.(asset)}
                    className="absolute inset-0 flex items-center justify-center bg-deep-brown/0 text-sm font-semibold text-white opacity-0 transition-all hover:bg-deep-brown/45 hover:opacity-100"
                  >
                    Select
                  </button>
                )}
              </article>
            ))}
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}

      {mode === "manage" && (
        <>
          <Dialog open={Boolean(editTarget)} onClose={() => setEditTarget(null)} title="Edit media details" maxWidthClassName="max-w-sm">
            <div className="flex flex-col gap-4">
              <FormField label="Title" htmlFor="media-title" optional hint="Shown in the Media Gallery grid.">
                <input
                  id="media-title"
                  value={editDrafts.title}
                  onChange={(event) => setEditDrafts((current) => ({ ...current, title: event.target.value }))}
                  className={ADMIN_INPUT_CLASS}
                />
              </FormField>
              <FormField label="Alt text" htmlFor="media-alt" optional hint="Used as the default alt text when this image is attached to a Product.">
                <input
                  id="media-alt"
                  value={editDrafts.altText}
                  onChange={(event) => setEditDrafts((current) => ({ ...current, altText: event.target.value }))}
                  className={ADMIN_INPUT_CLASS}
                />
              </FormField>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out hover:bg-cream-bg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveEdit()}
                  className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </Dialog>
          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={confirmDelete}
            title="Delete from Media Gallery?"
            description={
              deleteTarget && deleteTarget.usageCount > 0
                ? `This asset is used by ${deleteTarget.usageCount} Product${deleteTarget.usageCount === 1 ? "" : "s"} and cannot be deleted until it is removed from all of them.`
                : "This permanently removes the file from Cloudflare R2. This cannot be undone."
            }
            confirmLabel="Delete"
            loading={busy}
          />
        </>
      )}
    </div>
  );
}
