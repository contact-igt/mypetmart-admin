/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { AdminApiError } from "@/lib/api/admin-api-client";
import {
  deleteAdminProductImage,
  describeAdminError,
  reorderAdminProductImages,
  updateAdminProductImage,
  uploadAdminProductImage,
  validateProductImage,
  type PendingProductImage,
  type ProductImage,
} from "@/lib/api/admin-product-api";
import { ADMIN_INPUT_CLASS } from "../ui/form-field";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { ChevronDownIcon, TrashIcon, UploadIcon } from "@/components/icons";

function defaultAlt(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

export function ProductImageManager({ productId, images = [], pending, onPendingChange, onChanged }: {
  productId?: number;
  images?: ProductImage[];
  pending: PendingProductImage[];
  onPendingChange: (images: PendingProductImage[]) => void;
  onChanged?: () => Promise<void> | void;
}) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [ordered, setOrdered] = useState(images);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [retryTask, setRetryTask] = useState<PendingProductImage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductImage | null>(null);
  const [altDrafts, setAltDrafts] = useState<Record<number, string>>(
    () => Object.fromEntries(images.map((image) => [image.id, image.alt])),
  );

  function makeTask(file: File, isPrimary: boolean): PendingProductImage {
    return { key: `${file.name}-${file.lastModified}-${Math.random()}`, file, alt: defaultAlt(file.name), previewUrl: URL.createObjectURL(file), isPrimary };
  }

  async function upload(task: PendingProductImage) {
    if (!productId) return;
    setBusy(true); setRetryTask(null);
    try {
      await uploadAdminProductImage(productId, task.file, { alt: task.alt, isPrimary: task.isPrimary, onStage: setStage });
      URL.revokeObjectURL(task.previewUrl);
      showToast("Image uploaded, verified, and attached from Cloudflare R2.");
      await onChanged?.();
    } catch (cause) {
      setRetryTask(task);
      showToast(describeAdminError(cause, "Image upload failed."), "error");
    } finally { setBusy(false); setStage(""); }
  }

  function selectFiles(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    const invalid = selected.map((file) => validateProductImage(file)).find(Boolean);
    if (invalid) { showToast(invalid, "error"); return; }
    if (productId) {
      const [first] = selected;
      if (first) void upload(makeTask(first, ordered.length === 0));
      if (selected.length > 1) showToast("Upload one image at a time so each file has accurate alt text.", "info");
    } else {
      onPendingChange([...pending, ...selected.map((file, index) => makeTask(file, pending.length === 0 && index === 0))]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function saveAlt(image: ProductImage) {
    const alt = (altDrafts[image.id] ?? "").trim();
    if (!alt) { showToast("Alt text is required.", "error"); return; }
    setBusy(true);
    try { await updateAdminProductImage(productId!, image.id, { alt }); showToast("Image alt text updated."); await onChanged?.(); }
    catch (cause) { showToast(describeAdminError(cause, "Could not update image alt text."), "error"); }
    finally { setBusy(false); }
  }

  async function setPrimary(image: ProductImage) {
    setBusy(true);
    try { await updateAdminProductImage(productId!, image.id, { isPrimary: true }); showToast("Primary image updated."); await onChanged?.(); }
    catch (cause) { showToast(describeAdminError(cause, "Could not set the primary image."), "error"); }
    finally { setBusy(false); }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ordered.length || !productId) return;
    const previous = ordered;
    const next = [...ordered]; [next[index], next[target]] = [next[target], next[index]]; setOrdered(next); setBusy(true);
    try { await reorderAdminProductImages(productId, next.map((image) => image.id)); showToast("Image order updated."); await onChanged?.(); }
    catch (cause) { setOrdered(previous); showToast(describeAdminError(cause, "Could not reorder images."), "error"); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleteTarget || !productId) return;
    setBusy(true);
    try { await deleteAdminProductImage(productId, deleteTarget.id); showToast("Image metadata and R2 object deleted."); setDeleteTarget(null); await onChanged?.(); }
    catch (cause) {
      if (cause instanceof AdminApiError && cause.code === "R2_OPERATION_FAILED") {
        setDeleteTarget(null);
        await onChanged?.();
        showToast("The image was removed from the catalog, but Cloudflare R2 cleanup is still pending.", "error");
      } else {
        showToast(describeAdminError(cause, "Could not delete the image."), "error");
      }
    }
    finally { setBusy(false); }
  }

  function patchPending(key: string, patch: Partial<PendingProductImage>) { onPendingChange(pending.map((image) => image.key === key ? { ...image, ...patch } : image)); }
  function removePending(task: PendingProductImage) { URL.revokeObjectURL(task.previewUrl); onPendingChange(pending.filter((image) => image.key !== task.key)); }

  return <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Product images</h2><p className="mt-1 text-xs text-text-primary/50">JPEG, PNG, or WebP · maximum 5 MB · alt text required</p></div><button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold hover:bg-cream-bg disabled:opacity-50"><UploadIcon width={14} /> Select image</button><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple={!productId} onChange={(event) => selectFiles(event.target.files)} className="sr-only" aria-label="Select Product images" /></div>
    {!productId && <p className="mt-3 rounded-lg bg-cream-bg/60 p-3 text-xs text-text-primary/65">Selected images upload directly to Cloudflare R2 after the Product is created. A Product can still be saved if an upload fails, and you can retry from Edit.</p>}
    {busy && stage && <p role="status" className="mt-3 rounded-lg border border-primary-orange/30 bg-primary-orange/5 p-3 text-xs font-medium text-primary-orange">{stage}…</p>}
    {retryTask && <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-terracotta/30 bg-terracotta/5 p-3 text-xs"><span>Upload failed before attachment. The Product remains unchanged.</span><button type="button" onClick={() => upload(retryTask)} className="font-semibold text-terracotta">Retry upload</button></div>}
    {ordered.length === 0 && pending.length === 0 && <p className="mt-4 rounded-lg border border-dashed border-border-subtle p-6 text-center text-sm text-text-primary/50">No Product images yet.</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{ordered.map((image,index) => <article key={image.id} className="rounded-lg border border-border-subtle p-3">
      <img src={image.url} alt={image.alt} className="aspect-square w-full rounded-lg bg-cream-bg object-cover" />
      <div className="mt-2 flex items-center justify-between gap-2"><span className={`text-xs font-semibold ${image.isPrimary ? "text-primary-orange" : "text-text-primary/50"}`}>{image.isPrimary ? "Primary image" : `Image ${index + 1}`}</span><div className="flex"><button type="button" onClick={() => move(index,-1)} disabled={busy || index===0} aria-label="Move image up" className="p-1 disabled:opacity-25"><ChevronDownIcon width={14} className="rotate-180" /></button><button type="button" onClick={() => move(index,1)} disabled={busy || index===ordered.length-1} aria-label="Move image down" className="p-1 disabled:opacity-25"><ChevronDownIcon width={14} /></button><button type="button" onClick={() => setDeleteTarget(image)} aria-label="Delete image" className="p-1 text-terracotta"><TrashIcon width={14} /></button></div></div>
      <label className="mt-2 block text-xs font-medium">Alt text<input value={altDrafts[image.id] ?? ""} onChange={(event) => setAltDrafts((values) => ({ ...values, [image.id]: event.target.value }))} className={`${ADMIN_INPUT_CLASS} mt-1`} /></label>
      <div className="mt-2 flex justify-between gap-2"><button type="button" disabled={busy || image.isPrimary} onClick={() => setPrimary(image)} className="text-xs font-semibold text-primary-orange disabled:text-text-primary/35">Set primary</button><button type="button" disabled={busy || (altDrafts[image.id] ?? "") === image.alt} onClick={() => saveAlt(image)} className="text-xs font-semibold text-primary-orange disabled:text-text-primary/35">Save alt text</button></div>
    </article>)}</div>
    {pending.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{pending.map((image,index) => <article key={image.key} className="rounded-lg border border-dashed border-primary-orange/40 p-3"><img src={image.previewUrl} alt={image.alt || "Pending Product image preview"} className="aspect-square w-full rounded-lg object-cover" /><p className="mt-2 text-xs font-semibold text-primary-orange">Pending upload {index + 1}</p><label className="mt-2 block text-xs font-medium">Alt text<input value={image.alt} onChange={(event) => patchPending(image.key, { alt: event.target.value })} className={`${ADMIN_INPUT_CLASS} mt-1`} /></label><div className="mt-2 flex justify-between"><label className="flex items-center gap-1 text-xs"><input type="radio" name="pending-primary" checked={image.isPrimary} onChange={() => onPendingChange(pending.map((item) => ({ ...item, isPrimary: item.key === image.key })))} /> Primary</label><button type="button" onClick={() => removePending(image)} className="text-xs font-semibold text-terracotta">Remove</button></div></article>)}</div>}
    <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Delete image?" description="This removes the Product image and deletes its Cloudflare R2 object. Deleted image metadata remains preserved by the Backend." confirmLabel="Delete image" loading={busy} />
  </section>;
}
