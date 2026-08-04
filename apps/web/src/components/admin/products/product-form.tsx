"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminRepository } from "@/data/admin/mock-repository";
import type { Category, PetType, Product, ProductImage, ProductInput, ProductStatus, ProductVariant } from "@/data/admin/types";
import { ImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import { FormField, ADMIN_INPUT_CLASS } from "../ui/form-field";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { ChevronDownIcon, CloseIcon, CopyIcon, PlusIcon, TrashIcon, UploadIcon } from "@/components/icons";

const TONES: PlaceholderTone[] = ["peach", "orange", "mint", "terracotta", "brown", "yellow", "cream"];
const STATUSES: ProductStatus[] = ["active", "draft", "archived"];
const PET_TYPES: { value: PetType; label: string }[] = [
  { value: "dog", label: "Dogs" },
  { value: "cat", label: "Cats" },
  { value: "all", label: "Works for all pets" },
];
const MAX_IMAGES = 6;

function slugPreview(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type FormState = {
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  petType: PetType;
  tags: string[];
  featured: boolean;
  status: ProductStatus;
  price: string;
  originalPrice: string;
  stock: string;
  images: ProductImage[];
  variants: ProductVariant[];
  metaTitle: string;
  metaDescription: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  sku: "",
  description: "",
  categoryId: "",
  petType: "all",
  tags: [],
  featured: false,
  status: "draft",
  price: "",
  originalPrice: "",
  stock: "0",
  images: [],
  variants: [],
  metaTitle: "",
  metaDescription: "",
};

function toFormState(product: Product): FormState {
  return {
    name: product.name,
    sku: product.sku,
    description: product.description,
    categoryId: product.categoryId,
    petType: product.petType,
    tags: product.tags,
    featured: product.featured,
    status: product.status,
    price: String(product.price),
    originalPrice: product.originalPrice ? String(product.originalPrice) : "",
    stock: String(product.stock),
    images: product.images,
    variants: product.variants,
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
  };
}

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditing = Boolean(productId);

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState<string>(JSON.stringify(EMPTY_FORM));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cats, product] = await Promise.all([
          adminRepository.listCategories(),
          productId ? adminRepository.getProduct(productId) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setCategories(cats);
        if (productId) {
          if (!product) {
            setLoadError("Product not found.");
          } else {
            const next = toFormState(product);
            setForm(next);
            setInitialSnapshot(JSON.stringify(next));
          }
        } else if (cats[0]) {
          setForm((prev) => {
            const next = { ...prev, categoryId: cats[0].id };
            setInitialSnapshot(JSON.stringify(next));
            return next;
          });
        }
      } catch {
        if (!cancelled) setLoadError("Could not load the product form.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const isDirty = JSON.stringify(form) !== initialSnapshot;

  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function addTag() {
    const tag = tagDraft.trim().toLowerCase();
    if (!tag || form.tags.includes(tag)) {
      setTagDraft("");
      return;
    }
    updateField("tags", [...form.tags, tag]);
    setTagDraft("");
  }

  function removeTag(tag: string) {
    updateField("tags", form.tags.filter((t) => t !== tag));
  }

  function addImage() {
    setForm((prev) => ({
      ...prev,
      images: [...prev.images, { id: `img-${Date.now()}`, label: "", tone: "peach", alt: "" }],
    }));
    setErrors((prev) => ({ ...prev, images: undefined }));
  }

  function updateImage(index: number, patch: Partial<ProductImage>) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => (i === index ? { ...img, ...patch } : img)),
    }));
  }

  function removeImage(index: number) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  }

  function moveImage(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    setForm((prev) => {
      if (target < 0 || target >= prev.images.length) return prev;
      const next = [...prev.images];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, images: next };
    });
  }

  function setPrimaryImage(index: number) {
    setForm((prev) => {
      if (index === 0) return prev;
      const next = [...prev.images];
      const [chosen] = next.splice(index, 1);
      next.unshift(chosen);
      return { ...prev, images: next };
    });
  }

  function updateVariant(index: number, patch: Partial<ProductVariant>) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  }

  function addVariant() {
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { id: `v-${Date.now()}`, label: "", sku: "", price: Number(prev.price) || 0, stock: 0 },
      ],
    }));
  }

  function removeVariant(index: number) {
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Product name is required.";
    if (!form.sku.trim()) next.sku = "SKU is required.";
    if (!form.description.trim()) next.description = "A short description is required.";
    if (!form.categoryId) next.categoryId = "Choose a category.";
    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price <= 0) next.price = "Enter a price greater than 0.";
    const stock = Number(form.stock);
    if (form.stock === "" || Number.isNaN(stock) || stock < 0) next.stock = "Enter a stock quantity of 0 or more.";
    if (form.images.length === 0) {
      next.images = "Add at least one product image.";
    } else if (form.images.some((img) => !img.label.trim() || !img.alt.trim())) {
      next.images = "Every image needs a description and alt text.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(status: ProductStatus) {
    if (!validate()) {
      showToast("Fix the highlighted fields before saving.", "error");
      return;
    }
    setSaving(true);
    const input: ProductInput = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
      petType: form.petType,
      tags: form.tags,
      featured: form.featured,
      status,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      stock: Number(form.stock),
      images: form.images,
      variants: form.variants,
      metaTitle: form.metaTitle.trim() || undefined,
      metaDescription: form.metaDescription.trim() || undefined,
    };

    try {
      if (isEditing && productId) {
        await adminRepository.updateProduct(productId, input);
        showToast("Product updated.");
      } else {
        await adminRepository.createProduct(input);
        showToast(status === "draft" ? "Saved as draft." : "Product published.");
      }
      setInitialSnapshot(JSON.stringify(form));
      router.push("/admin/products");
    } catch {
      showToast("Could not save the product. Try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    save(form.status);
  }

  function handleCancel() {
    if (isDirty) {
      setDiscardOpen(true);
    } else {
      router.push("/admin/products");
    }
  }

  async function handleDuplicate() {
    if (!productId) return;
    setDuplicating(true);
    try {
      const copy = await adminRepository.duplicateProduct(productId);
      showToast(`Duplicated as "${copy.name}".`);
      router.push(`/admin/products/${copy.id}/edit`);
    } catch {
      showToast("Could not duplicate the product.", "error");
    } finally {
      setDuplicating(false);
    }
  }

  if (loading) return <LoadingState label="Loading product…" />;
  if (loadError) return <ErrorState message={loadError} />;

  const previewTitle = form.metaTitle.trim() || form.name || "Product name";
  const previewDescription = form.metaDescription.trim() || form.description || "Product description appears here.";
  const previewSlug = slugPreview(form.name) || "product-slug";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 pb-24 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-5">
        <div className="rounded-xl border border-border-subtle bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-text-primary">Basic information</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Product name" htmlFor="p-name" error={errors.name}>
                <input id="p-name" value={form.name} onChange={(e) => updateField("name", e.target.value)} className={ADMIN_INPUT_CLASS} />
              </FormField>
            </div>

            <FormField label="SKU" htmlFor="p-sku" error={errors.sku}>
              <input id="p-sku" value={form.sku} onChange={(e) => updateField("sku", e.target.value)} className={ADMIN_INPUT_CLASS} />
            </FormField>

            <FormField label="Status" htmlFor="p-status" hint="Archived hides the product without deleting it.">
              <select id="p-status" value={form.status} onChange={(e) => updateField("status", e.target.value as ProductStatus)} className={ADMIN_INPUT_CLASS}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Description" htmlFor="p-desc" error={errors.description}>
                <textarea id="p-desc" rows={3} value={form.description} onChange={(e) => updateField("description", e.target.value)} className={`${ADMIN_INPUT_CLASS} resize-none`} />
              </FormField>
            </div>

            <FormField label="Category" htmlFor="p-category" error={errors.categoryId}>
              <select id="p-category" value={form.categoryId} onChange={(e) => updateField("categoryId", e.target.value)} className={ADMIN_INPUT_CLASS}>
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Pet type" htmlFor="p-pet-type">
              <select id="p-pet-type" value={form.petType} onChange={(e) => updateField("petType", e.target.value as PetType)} className={ADMIN_INPUT_CLASS}>
                {PET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Tags" htmlFor="p-tags" optional hint="Press Enter or comma to add a tag.">
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border-subtle bg-white p-2">
                  {form.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-cream-bg px-2 py-1 text-xs font-medium text-text-primary">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`} className="text-text-primary/50 hover:text-terracotta">
                        <CloseIcon width={9} height={9} />
                      </button>
                    </span>
                  ))}
                  <input
                    id="p-tags"
                    value={tagDraft}
                    onChange={(e) => {
                      if (e.target.value.endsWith(",")) {
                        setTagDraft(e.target.value.slice(0, -1));
                        addTag();
                      } else {
                        setTagDraft(e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    onBlur={addTag}
                    placeholder={form.tags.length === 0 ? "e.g. bestseller, grooming" : "Add another…"}
                    className="min-w-[8rem] flex-1 border-none bg-transparent text-sm outline-none"
                  />
                </div>
              </FormField>
            </div>

            <label className="flex items-center gap-2 text-sm text-text-primary sm:col-span-2">
              <input type="checkbox" checked={form.featured} onChange={(e) => updateField("featured", e.target.checked)} className="h-4 w-4 accent-primary-orange" />
              Featured — highlight this product in featured placements
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-text-primary">Pricing &amp; inventory</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Price (₹)" htmlFor="p-price" error={errors.price}>
              <input id="p-price" type="number" min={0} value={form.price} onChange={(e) => updateField("price", e.target.value)} className={ADMIN_INPUT_CLASS} />
            </FormField>
            <FormField label="Compare-at price (₹)" htmlFor="p-original-price" optional hint="Shown struck through when higher than price.">
              <input id="p-original-price" type="number" min={0} value={form.originalPrice} onChange={(e) => updateField("originalPrice", e.target.value)} className={ADMIN_INPUT_CLASS} />
            </FormField>
            <FormField label="Stock" htmlFor="p-stock" error={errors.stock}>
              <input id="p-stock" type="number" min={0} value={form.stock} onChange={(e) => updateField("stock", e.target.value)} className={ADMIN_INPUT_CLASS} />
            </FormField>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Variants</p>
            <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-orange hover:underline">
              <PlusIcon width={12} height={12} /> Add variant
            </button>
          </div>
          {form.variants.length === 0 && <p className="text-sm text-text-primary/50">No variants — this product sells as a single item.</p>}
          <div className="flex flex-col gap-2">
            {form.variants.map((variant, index) => (
              <div key={variant.id} className="grid grid-cols-[1fr_1fr_5.5rem_5.5rem_auto] items-center gap-2">
                <input aria-label="Variant label" placeholder="Label (e.g. Small)" value={variant.label} onChange={(e) => updateVariant(index, { label: e.target.value })} className={ADMIN_INPUT_CLASS} />
                <input aria-label="Variant SKU" placeholder="SKU" value={variant.sku} onChange={(e) => updateVariant(index, { sku: e.target.value })} className={ADMIN_INPUT_CLASS} />
                <input aria-label="Variant price" type="number" min={0} value={variant.price} onChange={(e) => updateVariant(index, { price: Number(e.target.value) })} className={ADMIN_INPUT_CLASS} />
                <input aria-label="Variant stock" type="number" min={0} value={variant.stock} onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })} className={ADMIN_INPUT_CLASS} />
                <button type="button" onClick={() => removeVariant(index)} aria-label="Remove variant" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-primary/50 hover:bg-cream-bg hover:text-terracotta">
                  <TrashIcon width={15} height={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-5">
          <p className="mb-1 text-sm font-semibold text-text-primary">Search engine preview</p>
          <p className="mb-4 text-xs text-text-primary/55">Optional — falls back to the product name and description when left blank.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Meta title" htmlFor="p-meta-title" optional>
              <input id="p-meta-title" value={form.metaTitle} onChange={(e) => updateField("metaTitle", e.target.value)} className={ADMIN_INPUT_CLASS} maxLength={70} />
            </FormField>
            <FormField label="Meta description" htmlFor="p-meta-desc" optional>
              <input id="p-meta-desc" value={form.metaDescription} onChange={(e) => updateField("metaDescription", e.target.value)} className={ADMIN_INPUT_CLASS} maxLength={160} />
            </FormField>
          </div>
          <div className="mt-4 rounded-lg border border-border-subtle bg-cream-bg/40 p-3">
            <p className="truncate text-sm font-medium text-primary-orange">{previewTitle}</p>
            <p className="truncate text-xs text-text-primary/50">mypetmart.com/product/{previewSlug}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-text-primary/70">{previewDescription}</p>
          </div>
        </div>
      </div>

      <div className="w-full shrink-0 lg:w-80">
        <div className="rounded-xl border border-border-subtle bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Product images</p>
            <button
              type="button"
              onClick={addImage}
              disabled={form.images.length >= MAX_IMAGES}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-orange hover:underline disabled:opacity-40"
            >
              <PlusIcon width={12} height={12} /> Add image
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border-subtle p-3 text-center">
            <UploadIcon width={18} height={18} className="shrink-0 text-text-primary/40" />
            <p className="text-left text-xs text-text-primary/55">Storage integration required — real uploads need Cloudflare R2 (M3). Each slot below is a labelled placeholder.</p>
          </div>
          {errors.images && (
            <p role="alert" className="mt-2 text-xs font-medium text-terracotta">
              {errors.images}
            </p>
          )}

          {form.images.length === 0 ? (
            <p className="mt-4 text-sm text-text-primary/50">No images yet — add at least one.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {form.images.map((image, index) => (
                <div key={image.id} className="rounded-lg border border-border-subtle p-3">
                  <div className="flex gap-3">
                    <ImagePlaceholder label={image.label || "Untitled image"} tone={image.tone} className="h-16 w-16 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-semibold ${index === 0 ? "text-primary-orange" : "text-text-primary/45"}`}>
                          {index === 0 ? "Primary image" : `Image ${index + 1}`}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => moveImage(index, "up")} disabled={index === 0} aria-label="Move image up" className="rounded p-1 text-text-primary/45 hover:bg-cream-bg hover:text-text-primary disabled:opacity-25">
                            <ChevronDownIcon width={13} height={13} className="rotate-180" />
                          </button>
                          <button type="button" onClick={() => moveImage(index, "down")} disabled={index === form.images.length - 1} aria-label="Move image down" className="rounded p-1 text-text-primary/45 hover:bg-cream-bg hover:text-text-primary disabled:opacity-25">
                            <ChevronDownIcon width={13} height={13} />
                          </button>
                          <button type="button" onClick={() => removeImage(index)} aria-label="Remove image" className="rounded p-1 text-text-primary/45 hover:bg-terracotta/10 hover:text-terracotta">
                            <TrashIcon width={13} height={13} />
                          </button>
                        </div>
                      </div>
                      <input
                        aria-label="Image description"
                        placeholder="Describe the photo"
                        value={image.label}
                        onChange={(e) => updateImage(index, { label: e.target.value })}
                        className={`${ADMIN_INPUT_CLASS} mb-1.5 text-xs`}
                      />
                      <input
                        aria-label="Image alt text"
                        placeholder="Alt text"
                        value={image.alt}
                        onChange={(e) => updateImage(index, { alt: e.target.value })}
                        className={`${ADMIN_INPUT_CLASS} mb-1.5 text-xs`}
                      />
                      <div className="flex items-center gap-2">
                        <select value={image.tone} onChange={(e) => updateImage(index, { tone: e.target.value as PlaceholderTone })} className={`${ADMIN_INPUT_CLASS} flex-1 text-xs`}>
                          {TONES.map((tone) => (
                            <option key={tone} value={tone}>
                              {tone[0].toUpperCase() + tone.slice(1)}
                            </option>
                          ))}
                        </select>
                        {index !== 0 && (
                          <button type="button" onClick={() => setPrimaryImage(index)} className="shrink-0 whitespace-nowrap text-xs font-semibold text-primary-orange hover:underline">
                            Set primary
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg disabled:opacity-60"
          >
            <CopyIcon width={14} height={14} /> {duplicating ? "Duplicating…" : "Duplicate as new draft"}
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-subtle bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="hidden text-xs text-text-primary/50 sm:block">{isDirty ? "You have unsaved changes." : "All changes saved."}</p>
          <div className="flex flex-1 items-center justify-end gap-2">
            <button type="button" onClick={handleCancel} className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg">
              Cancel
            </button>
            {form.status === "draft" ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save("draft")}
                  className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save as draft"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save("active")}
                  className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Publishing…" : "Publish"}
                </button>
              </>
            ) : (
              <button type="submit" disabled={saving} className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90 disabled:opacity-60">
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => router.push("/admin/products")}
        title="Discard unsaved changes?"
        description="You have changes that haven't been saved. Leaving now will discard them."
        confirmLabel="Discard"
        destructive
      />
    </form>
  );
}
