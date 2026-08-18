"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAdminCategories } from "@/lib/api/admin-category-api";
import { AdminApiError } from "@/lib/api/admin-api-client";
import type { Category } from "@/data/admin/types";
import {
  createAdminProduct,
  describeAdminError,
  duplicateAdminProduct,
  firstValidationErrors,
  getAdminProduct,
  setAdminProductStatus,
  slugifyProductName,
  updateAdminProduct,
  uploadAdminProductImage,
  type PendingProductImage,
  type PetType,
  type ProductDetail,
  type ProductStatus,
} from "@/lib/api/admin-product-api";
import { FormField, ADMIN_INPUT_CLASS } from "../ui/form-field";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ErrorState, LoadingState } from "../ui/empty-state";
import { useToast } from "../ui/toast";
import { ProductImageManager } from "./product-image-manager";
import { VariantManager, blankVariant, validateVariantDraft, variantToInput, type VariantDraft, type VariantManagerHandle } from "./variant-manager";
import { CloseIcon, CopyIcon } from "@/components/icons";

type FormState = {
  productType: "simple" | "variant";
  name: string; slug: string; sku: string; description: string; categoryId: string;
  petType: PetType; status: ProductStatus; featured: boolean;
  price: string; compareAtPrice: string; stock: string;
  weightGrams: string; lengthCm: string; widthCm: string; heightCm: string;
  tags: string[]; metaTitle: string; metaDescription: string;
};

const EMPTY_FORM: FormState = {
  productType: "simple", name: "", slug: "", sku: "", description: "", categoryId: "",
  petType: "all", status: "draft", featured: false, price: "", compareAtPrice: "", stock: "0",
  weightGrams: "", lengthCm: "", widthCm: "", heightCm: "", tags: [], metaTitle: "", metaDescription: "",
};

function fromProduct(product: ProductDetail): FormState {
  return {
    productType: product.hasVariants ? "variant" : "simple", name: product.name ?? "", slug: product.slug ?? "",
    sku: product.sku ?? "", description: product.description ?? "", categoryId: String(product.categoryId), petType: product.petType,
    status: product.status, featured: Boolean(product.featured), price: product.price ?? "", compareAtPrice: product.compareAtPrice ?? "",
    stock: String(product.stock ?? 0), weightGrams: product.weightGrams == null ? "" : String(product.weightGrams),
    lengthCm: product.lengthCm ?? "", widthCm: product.widthCm ?? "", heightCm: product.heightCm ?? "",
    tags: Array.isArray(product.tags) ? product.tags : [], metaTitle: product.metaTitle ?? "", metaDescription: product.metaDescription ?? "",
  };
}

const nullableDecimal = (value: string) => value.trim() || null;
const nullableInteger = (value: string) => value.trim() ? Number(value) : null;
const MONEY_PATTERN = /^\d{1,8}(?:\.\d{1,2})?$/;
const SHIPPING_PATTERN = /^\d{1,6}(?:\.\d{1,2})?$/;

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditing = productId !== undefined;
  const parsedProductId = productId === undefined ? undefined : Number(productId);
  const numericProductId = parsedProductId !== undefined && Number.isSafeInteger(parsedProductId) && parsedProductId > 0 ? parsedProductId : undefined;
  const invalidProductId = isEditing && numericProductId === undefined;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoryLoadError, setCategoryLoadError] = useState("");
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [loading, setLoading] = useState(isEditing && !invalidProductId);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [variantsDirty, setVariantsDirty] = useState(false);
  const variantManagerRef = useRef<VariantManagerHandle>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const loadProduct = useCallback(async () => {
    if (!numericProductId) return;
    const next = await getAdminProduct(numericProductId);
    setProduct(next); setForm(fromProduct(next));
  }, [numericProductId]);

  const refreshRelatedData = useCallback(async () => {
    if (!numericProductId) return;
    setProduct(await getAdminProduct(numericProductId));
  }, [numericProductId]);

  useEffect(() => {
    if (invalidProductId) return;
    let live = true;
    Promise.allSettled([fetchAdminCategories(), numericProductId ? getAdminProduct(numericProductId) : Promise.resolve(null)])
      .then(([categoryResult, productResult]) => {
        if (!live) return;
        if (categoryResult.status === "fulfilled") {
          setCategories(categoryResult.value);
          setCategoriesLoaded(true);
        } else {
          setCategoryLoadError(describeAdminError(categoryResult.reason, "Category choices could not be loaded."));
        }
        if (productResult.status === "rejected") throw productResult.reason;
        if (productResult.value) { setProduct(productResult.value); setForm(fromProduct(productResult.value)); }
      })
      .catch((cause) => live && setLoadError(describeAdminError(cause, "Could not load Product data.")))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [invalidProductId, numericProductId]);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value })); setDirty(true);
    setErrors((current) => { const next = { ...current }; delete next[field]; return next; });
  }

  function addTag() {
    const tag = tagDraft.trim().replace(/,$/, "");
    if (tag && !form.tags.includes(tag)) update("tags", [...form.tags, tag]);
    setTagDraft("");
  }

  function validate(requestedStatus: ProductStatus): Record<string, string> {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Product name is required.";
    if (!form.sku.trim()) next.sku = "SKU is required.";
    if (!form.description.trim()) next.description = "Description is required.";
    if (!form.categoryId) next.categoryId = "Select a real category.";
    else if (categoriesLoaded && !categories.some((category) => category.id === form.categoryId)) next.categoryId = "This Category is deleted or unavailable. Select an available Category.";
    if (form.productType === "simple") {
      if (!MONEY_PATTERN.test(form.price.trim())) next.price = "Use a non-negative price with no more than 2 decimal places.";
      else if (requestedStatus === "active" && Number(form.price) <= 0) next.price = "An active Product needs a positive selling price.";
      if (form.compareAtPrice.trim() && !MONEY_PATTERN.test(form.compareAtPrice.trim())) next.compareAtPrice = "Use no more than 2 decimal places.";
      else if (form.compareAtPrice.trim() && Number(form.compareAtPrice) < Number(form.price)) next.compareAtPrice = "Compare-at price must be greater than or equal to the selling price.";
      if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) next.stock = "Enter a non-negative whole number.";
    }
    if (form.productType === "variant" && !isEditing) {
      variantDrafts.forEach((variant, index) => {
        const message = validateVariantDraft(variant, requestedStatus === "active" && variant.active);
        if (message && !next.variants) next.variants = `Variant ${index + 1}: ${message}`;
      });
    }
    const requireShipping = requestedStatus === "active" && form.productType === "simple";
    if (requireShipping && !form.weightGrams.trim()) next.weightGrams = "Weight is required before activation.";
    else if (form.weightGrams.trim() && (!Number.isInteger(Number(form.weightGrams)) || Number(form.weightGrams) <= 0)) next.weightGrams = "Weight must be a positive whole number.";
    (["lengthCm", "widthCm", "heightCm"] as const).forEach((field) => {
      if (requireShipping && !form[field].trim()) next[field] = "Required before activation.";
      else if (form[field].trim() && (!SHIPPING_PATTERN.test(form[field].trim()) || Number(form[field]) <= 0)) next[field] = "Use a positive value with no more than 2 decimal places.";
    });
    if (pendingImages.some((image) => !image.alt.trim())) next.images = "Alt text is required for every selected image.";
    return next;
  }

  function payload() {
    return {
      categoryId: Number(form.categoryId), name: form.name.trim(),
      sku: form.sku.trim(), description: form.description.trim(), petType: form.petType,
      ...(form.productType === "simple" ? { price: form.price, compareAtPrice: nullableDecimal(form.compareAtPrice), stock: Number(form.stock) } : {}),
      featured: form.featured, tags: form.tags, metaTitle: nullableDecimal(form.metaTitle), metaDescription: nullableDecimal(form.metaDescription),
      weightGrams: nullableInteger(form.weightGrams), lengthCm: nullableDecimal(form.lengthCm), widthCm: nullableDecimal(form.widthCm), heightCm: nullableDecimal(form.heightCm),
    };
  }

  async function save(requestedStatus = form.status) {
    const localErrors = validate(requestedStatus);
    if (Object.keys(localErrors).length) { setErrors(localErrors); setGeneralError("Review the highlighted fields before saving."); return; }
    setSaving(true); setErrors({}); setGeneralError("");
    try {
      if (numericProductId && product) {
        if (form.productType === "variant" && !(await variantManagerRef.current?.savePending())) {
          setGeneralError("Product fields were not saved because one or more Variant changes were rejected.");
          return;
        }
        await updateAdminProduct(numericProductId, payload());
        if (requestedStatus !== product.status) {
          try { await setAdminProductStatus(numericProductId, requestedStatus); }
          catch (cause) {
            await loadProduct(); setDirty(false);
            const statusError = describeAdminError(cause, "Status rejected.");
            setGeneralError(`Product fields were saved, but the status change failed: ${statusError}`);
            showToast(statusError, "error"); return;
          }
        }
        await loadProduct(); setDirty(false); showToast("Product saved to the production catalog.");
      } else {
        const created = await createAdminProduct({ ...payload(), status: requestedStatus, hasVariants: form.productType === "variant", variants: form.productType === "variant" ? variantDrafts.map(variantToInput) : undefined });
        let failedUploads = 0;
        for (const image of pendingImages) {
          try { await uploadAdminProductImage(created.id, image.file, { alt: image.alt, isPrimary: image.isPrimary }); URL.revokeObjectURL(image.previewUrl); }
          catch (cause) { failedUploads += 1; showToast(`Product created, but “${image.file.name}” was not attached: ${describeAdminError(cause, "upload failed")}`, "error"); }
        }
        if (failedUploads) {
          showToast(`Product created. ${failedUploads} image upload${failedUploads === 1 ? "" : "s"} need retry from Edit.`, "error");
          router.push(`/admin/products/${created.id}/edit`);
        } else {
          showToast(requestedStatus === "active" ? "Product created and published." : "Product saved as draft.");
          router.push("/admin/products");
        }
      }
    } catch (cause) {
      const nextErrors = firstValidationErrors(cause);
      if (cause instanceof AdminApiError && cause.code === "PRODUCT_SLUG_CONFLICT") nextErrors.name = "A Product using this generated URL slug already exists. Use a different Product name.";
      if (cause instanceof AdminApiError && (cause.code === "PRODUCT_SKU_CONFLICT" || cause.code === "PRODUCT_VARIANT_SKU_CONFLICT")) nextErrors.sku = cause.message;
      setErrors(nextErrors);
      setGeneralError(describeAdminError(cause, "Could not save the Product."));
      showToast(describeAdminError(cause, "Could not save the Product."), "error");
    } finally { setSaving(false); }
  }

  async function duplicate() {
    if (!numericProductId) return;
    setDuplicating(true);
    try { const copy = await duplicateAdminProduct(numericProductId); showToast(`Duplicated as “${copy.name}”.`); router.push(`/admin/products/${copy.id}/edit`); }
    catch (cause) { showToast(describeAdminError(cause, "Could not duplicate Product."), "error"); }
    finally { setDuplicating(false); }
  }

  const slugPreview = useMemo(() => (isEditing ? form.slug.trim() : slugifyProductName(form.name)) || "product-slug", [form.slug, form.name, isEditing]);
  const availableCategories = useMemo(() => {
    const available = categories.filter((category) => category.active || (isEditing && category.id === form.categoryId));
    if (isEditing && product && !available.some((category) => category.id === form.categoryId)) {
      return [{
        id: String(product.categoryId), name: product.category?.name ?? "Current Category", slug: product.category?.slug ?? "",
        description: "", petType: product.category?.petType ?? product.petType, order: -1, active: false,
      }, ...available];
    }
    return available;
  }, [categories, form.categoryId, isEditing, product]);
  const selectedCategory = useMemo(() => categories.find((category) => category.id === form.categoryId), [categories, form.categoryId]);
  if (invalidProductId) return <ErrorState message="Product ID must be a positive whole number." />;
  if (loading) return <LoadingState label="Loading production Product…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => window.location.reload()} />;

  return <form onSubmit={(event) => { event.preventDefault(); void save(); }} noValidate className="flex flex-col gap-5 pb-24" aria-busy={saving}>
    {generalError && <div role="alert" className="rounded-lg border border-terracotta/30 bg-terracotta/5 p-3 text-sm font-medium text-terracotta">{generalError}</div>}
    {categoryLoadError && <div role="alert" className="rounded-lg border border-yellow-500/30 bg-yellow-50 p-3 text-sm text-text-primary">{categoryLoadError} The current Product still loaded; retry the page before changing its Category.</div>}
    <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5"><h2 className="mb-4 text-sm font-semibold">Product type</h2>{isEditing ? <div className="rounded-lg bg-cream-bg/60 p-3"><strong>{form.productType === "variant" ? "Variant Product" : "Simple Product"}</strong><p className="mt-1 text-xs text-text-primary/55">Product type is immutable after creation.</p></div> : <div className="grid gap-3 sm:grid-cols-2">{([['simple','Simple Product','One price and inventory value.'],['variant','Variant Product','Price, stock, and optional shipping overrides per Variant.']] as const).map(([value,label,hint]) => <label key={value} className={`rounded-lg border p-4 ${form.productType === value ? "border-primary-orange bg-primary-orange/5" : "border-border-subtle"}`}><input type="radio" name="productType" value={value} checked={form.productType === value} onChange={() => { update("productType", value); if (value === "variant" && variantDrafts.length === 0) setVariantDrafts([blankVariant()]); }} className="mr-2" /><strong className="text-sm">{label}</strong><p className="ml-6 mt-1 text-xs text-text-primary/55">{hint}</p></label>)}</div>}</section>
    <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5"><h2 className="mb-4 text-sm font-semibold">Basic information</h2><div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormField label="Product name" htmlFor="p-name" error={errors.name} hint="Enter the customer-facing Product name manually."><input id="p-name" value={form.name} onChange={(e) => update("name",e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "p-name-error" : "p-name-hint"} className={ADMIN_INPUT_CLASS} /></FormField></div>
      <FormField label="Slug" htmlFor="p-slug" hint={isEditing ? "Existing Product URLs remain stable when the name changes." : "Generated automatically from the Product name."}><input id="p-slug" value={slugPreview} readOnly aria-readonly="true" className={`${ADMIN_INPUT_CLASS} cursor-not-allowed bg-cream-bg/60 text-text-primary/65`} /></FormField>
      <FormField label={form.productType === "variant" ? "Master SKU" : "SKU"} htmlFor="p-sku" error={errors.sku} hint={form.productType === "variant" ? "Enter the business-controlled master SKU manually. Purchasable SKUs belong to Variants." : "Enter the business-controlled SKU manually. It must be unique."}><input id="p-sku" maxLength={100} value={form.sku} onChange={(e) => update("sku",e.target.value)} aria-invalid={Boolean(errors.sku)} aria-describedby={errors.sku ? "p-sku-error" : "p-sku-hint"} className={ADMIN_INPUT_CLASS} /></FormField>
      <div className="sm:col-span-2"><FormField label="Description" htmlFor="p-description" error={errors.description}><textarea id="p-description" rows={4} value={form.description} onChange={(e) => update("description",e.target.value)} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "p-description-error" : undefined} className={`${ADMIN_INPUT_CLASS} resize-y`} /></FormField></div>
      <FormField label="Category" htmlFor="p-category" error={errors.categoryId}><select id="p-category" value={form.categoryId} onChange={(e) => { const value = e.target.value; update("categoryId", value); const category = categories.find((item) => item.id === value); if (category?.petType === "dog" && form.petType === "cat") update("petType", "dog"); if (category?.petType === "cat" && form.petType === "dog") update("petType", "cat"); }} aria-invalid={Boolean(errors.categoryId)} aria-describedby={errors.categoryId ? "p-category-error" : undefined} className={ADMIN_INPUT_CLASS}><option value="">Select category</option>{availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.active ? "" : categories.some((item) => item.id === category.id) ? " (inactive)" : " (deleted or unavailable)"} · {category.petType}</option>)}</select></FormField>
      <FormField label="Pet compatibility" htmlFor="p-pet"><select id="p-pet" value={form.petType} onChange={(e) => update("petType",e.target.value as PetType)} className={ADMIN_INPUT_CLASS}><option value="dog" disabled={selectedCategory?.petType === "cat"}>Dogs</option><option value="cat" disabled={selectedCategory?.petType === "dog"}>Cats</option><option value="all">All pets</option></select></FormField>
      <FormField label="Status" htmlFor="p-status" hint="Activation is validated for sellability and shipping readiness by the Backend."><select id="p-status" value={form.status} onChange={(e) => update("status",e.target.value as ProductStatus)} className={ADMIN_INPUT_CLASS}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></FormField>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => update("featured",e.target.checked)} /> Featured Product</label>
      <div className="sm:col-span-2"><FormField label="Tags" htmlFor="p-tags" optional hint="Press Enter or comma to add."><div className="flex flex-wrap gap-1.5 rounded-lg border border-border-subtle p-2">{form.tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-cream-bg px-2 py-1 text-xs">{tag}<button type="button" onClick={() => update("tags",form.tags.filter((item) => item!==tag))} aria-label={`Remove ${tag}`}><CloseIcon width={10} /></button></span>)}<input id="p-tags" value={tagDraft} onChange={(e) => { if (e.target.value.endsWith(",")) { setTagDraft(e.target.value.slice(0,-1)); addTag(); } else setTagDraft(e.target.value); }} onKeyDown={(e) => { if(e.key==="Enter"){e.preventDefault();addTag();} }} onBlur={addTag} className="min-w-32 flex-1 border-0 bg-transparent text-sm outline-none" /></div></FormField></div>
    </div></section>
    {form.productType === "simple" ? <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5"><h2 className="mb-4 text-sm font-semibold">Pricing and inventory</h2><div className="grid gap-4 sm:grid-cols-3"><FormField label="Price (₹)" htmlFor="p-price" error={errors.price}><input id="p-price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => update("price",e.target.value)} aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? "p-price-error" : undefined} className={ADMIN_INPUT_CLASS} /></FormField><FormField label="Compare-at price (₹)" htmlFor="p-compare" optional error={errors.compareAtPrice}><input id="p-compare" type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(e) => update("compareAtPrice",e.target.value)} aria-invalid={Boolean(errors.compareAtPrice)} aria-describedby={errors.compareAtPrice ? "p-compare-error" : undefined} className={ADMIN_INPUT_CLASS} /></FormField><FormField label="Stock" htmlFor="p-stock" error={errors.stock}><input id="p-stock" type="number" min="0" step="1" value={form.stock} onChange={(e) => update("stock",e.target.value)} aria-invalid={Boolean(errors.stock)} aria-describedby={errors.stock ? "p-stock-error" : undefined} className={ADMIN_INPUT_CLASS} /></FormField></div></section> : <VariantManager ref={variantManagerRef} key={product ? `variants-${product.updatedAt}-${product.variants.map((variant) => variant.updatedAt).join("-")}` : "new-variants"} productId={numericProductId} productStatus={form.status} variants={product?.variants} drafts={isEditing ? undefined : variantDrafts} onDraftsChange={(next) => { setVariantDrafts(next); setDirty(true); }} onDirtyChange={setVariantsDirty} onChanged={refreshRelatedData} />}
    <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5"><h2 className="mb-1 text-sm font-semibold">Shipping defaults</h2><p className="mb-4 text-xs text-text-primary/50">Required before activation. Variants inherit these values when their override is blank.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><FormField label="Weight (g)" htmlFor="p-weight" optional error={errors.weightGrams}><input id="p-weight" type="number" min="1" step="1" value={form.weightGrams} onChange={(e) => update("weightGrams",e.target.value)} aria-invalid={Boolean(errors.weightGrams)} aria-describedby={errors.weightGrams ? "p-weight-error" : undefined} className={ADMIN_INPUT_CLASS} /></FormField>{([['lengthCm','Length (cm)'],['widthCm','Width (cm)'],['heightCm','Height (cm)']] as const).map(([field,label]) => <FormField key={field} label={label} htmlFor={`p-${field}`} optional error={errors[field]}><input id={`p-${field}`} type="number" min="0.01" step="0.01" value={form[field]} onChange={(e) => update(field,e.target.value)} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `p-${field}-error` : undefined} className={ADMIN_INPUT_CLASS} /></FormField>)}</div></section>
    <ProductImageManager key={product ? `images-${product.updatedAt}-${product.images.map((image) => `${image.id}-${image.sortOrder}-${image.alt}-${image.isPrimary}`).join("-")}` : "new-images"} productId={numericProductId} images={product?.images} pending={pendingImages} onPendingChange={(next) => { setPendingImages(next); setDirty(true); }} onChanged={refreshRelatedData} />{errors.images && <p role="alert" className="text-sm font-medium text-terracotta">{errors.images}</p>}
    <section className="rounded-xl border border-border-subtle bg-white p-4 sm:p-5"><h2 className="mb-4 text-sm font-semibold">SEO</h2><div className="grid gap-4 sm:grid-cols-2"><FormField label="Meta title" htmlFor="p-meta-title" optional><input id="p-meta-title" maxLength={70} value={form.metaTitle} onChange={(e) => update("metaTitle",e.target.value)} className={ADMIN_INPUT_CLASS} /></FormField><FormField label="Meta description" htmlFor="p-meta-description" optional><textarea id="p-meta-description" maxLength={160} rows={2} value={form.metaDescription} onChange={(e) => update("metaDescription",e.target.value)} className={ADMIN_INPUT_CLASS} /></FormField></div><div className="mt-4 rounded-lg bg-cream-bg/60 p-3"><p className="truncate text-sm font-medium text-primary-orange">{form.metaTitle || form.name || "Product name"}</p><p className="truncate text-xs text-text-primary/50">mypetmart.com/product/{slugPreview}</p><p className="mt-1 line-clamp-2 text-xs text-text-primary/70">{form.metaDescription || form.description || "Product description"}</p></div></section>
    {isEditing && <button type="button" onClick={duplicate} disabled={duplicating} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"><CopyIcon width={14} /> {duplicating ? "Duplicating…" : "Duplicate as new draft"}</button>}
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-subtle bg-white/95 px-4 py-3 backdrop-blur lg:left-64"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><p className="hidden text-xs text-text-primary/50 sm:block">{dirty || variantsDirty ? "You have unsaved Product or Variant fields." : "Product and Variant fields are saved."}</p><div className="ml-auto flex gap-2"><button type="button" onClick={() => dirty || variantsDirty ? setDiscardOpen(true) : router.push("/admin/products")} className="rounded-lg border border-border-subtle px-4 py-2 text-sm">Cancel</button>{form.status === "draft" && <button type="button" disabled={saving} onClick={() => save("active")} className="rounded-lg border border-primary-orange px-4 py-2 text-sm font-semibold text-primary-orange disabled:opacity-50">Publish</button>}<button type="submit" disabled={saving} className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : form.status === "draft" ? "Save draft" : "Save Product"}</button></div></div></div>
    <ConfirmDialog open={discardOpen} onClose={() => setDiscardOpen(false)} onConfirm={() => router.push("/admin/products")} title="Discard unsaved changes?" description="Saved Variant and image operations will remain. Unsaved Product and Variant fields will be discarded." confirmLabel="Discard" />
  </form>;
}
