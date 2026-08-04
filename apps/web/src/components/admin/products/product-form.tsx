"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminRepository } from "@/data/admin/mock-repository";
import type { Category, Product, ProductInput, ProductStatus, ProductVariant } from "@/data/admin/types";
import { ImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import { FormField, ADMIN_INPUT_CLASS } from "../ui/form-field";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { useToast } from "../ui/toast";
import { PlusIcon, TrashIcon, UploadIcon } from "@/components/icons";

const TONES: PlaceholderTone[] = ["peach", "orange", "mint", "terracotta", "brown", "yellow", "cream"];
const STATUSES: ProductStatus[] = ["active", "draft", "archived"];

type FormState = {
  name: string;
  description: string;
  categoryId: string;
  status: ProductStatus;
  price: string;
  originalPrice: string;
  stock: string;
  imageLabel: string;
  tone: PlaceholderTone;
  variants: ProductVariant[];
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  categoryId: "",
  status: "draft",
  price: "",
  originalPrice: "",
  stock: "0",
  imageLabel: "",
  tone: "peach",
  variants: [],
};

function toFormState(product: Product): FormState {
  return {
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    status: product.status,
    price: String(product.price),
    originalPrice: product.originalPrice ? String(product.originalPrice) : "",
    stock: String(product.stock),
    imageLabel: product.imageLabel,
    tone: product.tone,
    variants: product.variants,
  };
}

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditing = Boolean(productId);

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
            setForm(toFormState(product));
          }
        } else if (cats[0]) {
          setForm((prev) => ({ ...prev, categoryId: cats[0].id }));
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

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
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
    if (!form.description.trim()) next.description = "A short description is required.";
    if (!form.categoryId) next.categoryId = "Choose a category.";
    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price <= 0) next.price = "Enter a price greater than 0.";
    const stock = Number(form.stock);
    if (form.stock === "" || Number.isNaN(stock) || stock < 0) next.stock = "Enter a stock quantity of 0 or more.";
    if (!form.imageLabel.trim()) next.imageLabel = "Describe the product photo for the placeholder.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const input: ProductInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
      status: form.status,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      stock: Number(form.stock),
      imageLabel: form.imageLabel.trim(),
      tone: form.tone,
      variants: form.variants,
    } as ProductInput;

    try {
      if (isEditing && productId) {
        await adminRepository.updateProduct(productId, input);
        showToast("Product updated.");
      } else {
        await adminRepository.createProduct(input);
        showToast("Product created.");
      }
      router.push("/admin/products");
    } catch {
      showToast("Could not save the product. Try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading product…" />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex-1 rounded-xl border border-border-subtle bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Product name" htmlFor="p-name" error={errors.name}>
              <input
                id="p-name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={ADMIN_INPUT_CLASS}
              />
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField label="Description" htmlFor="p-desc" error={errors.description}>
              <textarea
                id="p-desc"
                rows={3}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className={`${ADMIN_INPUT_CLASS} resize-none`}
              />
            </FormField>
          </div>

          <FormField label="Category" htmlFor="p-category" error={errors.categoryId}>
            <select
              id="p-category"
              value={form.categoryId}
              onChange={(e) => updateField("categoryId", e.target.value)}
              className={ADMIN_INPUT_CLASS}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Status" htmlFor="p-status">
            <select
              id="p-status"
              value={form.status}
              onChange={(e) => updateField("status", e.target.value as ProductStatus)}
              className={ADMIN_INPUT_CLASS}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Price (₹)" htmlFor="p-price" error={errors.price}>
            <input
              id="p-price"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => updateField("price", e.target.value)}
              className={ADMIN_INPUT_CLASS}
            />
          </FormField>

          <FormField label="Original price (₹)" htmlFor="p-original-price" optional>
            <input
              id="p-original-price"
              type="number"
              min={0}
              value={form.originalPrice}
              onChange={(e) => updateField("originalPrice", e.target.value)}
              className={ADMIN_INPUT_CLASS}
            />
          </FormField>

          <FormField label="Stock" htmlFor="p-stock" error={errors.stock}>
            <input
              id="p-stock"
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => updateField("stock", e.target.value)}
              className={ADMIN_INPUT_CLASS}
            />
          </FormField>
        </div>

        <div className="mt-6 border-t border-border-subtle pt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Variants</p>
            <button
              type="button"
              onClick={addVariant}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-orange hover:underline"
            >
              <PlusIcon width={12} height={12} /> Add variant
            </button>
          </div>
          {form.variants.length === 0 && (
            <p className="text-sm text-text-primary/50">No variants — this product sells as a single item.</p>
          )}
          <div className="flex flex-col gap-2">
            {form.variants.map((variant, index) => (
              <div key={variant.id} className="grid grid-cols-[1fr_1fr_5.5rem_5.5rem_auto] items-center gap-2">
                <input
                  aria-label="Variant label"
                  placeholder="Label (e.g. Small)"
                  value={variant.label}
                  onChange={(e) => updateVariant(index, { label: e.target.value })}
                  className={ADMIN_INPUT_CLASS}
                />
                <input
                  aria-label="Variant SKU"
                  placeholder="SKU"
                  value={variant.sku}
                  onChange={(e) => updateVariant(index, { sku: e.target.value })}
                  className={ADMIN_INPUT_CLASS}
                />
                <input
                  aria-label="Variant price"
                  type="number"
                  min={0}
                  value={variant.price}
                  onChange={(e) => updateVariant(index, { price: Number(e.target.value) })}
                  className={ADMIN_INPUT_CLASS}
                />
                <input
                  aria-label="Variant stock"
                  type="number"
                  min={0}
                  value={variant.stock}
                  onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })}
                  className={ADMIN_INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  aria-label="Remove variant"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-primary/50 hover:bg-cream-bg hover:text-terracotta"
                >
                  <TrashIcon width={15} height={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border-subtle pt-5">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : isEditing ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>

      <div className="w-full shrink-0 lg:w-72">
        <div className="rounded-xl border border-border-subtle bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-text-primary">Product image</p>
          <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border-subtle p-4 text-center">
            <UploadIcon width={20} height={20} className="text-text-primary/40" />
            <p className="text-xs text-text-primary/55">
              Image upload requires R2 storage (M3) — not wired up yet. Preview below uses a
              placeholder block from the description you enter.
            </p>
          </div>

          <div className="mt-4">
            <ImagePlaceholder
              label={form.imageLabel || "Describe the product photo below"}
              tone={form.tone}
              className="aspect-square w-full"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <FormField label="Image description" htmlFor="p-image-label" error={errors.imageLabel} hint="Used as the placeholder's accessible label.">
              <input
                id="p-image-label"
                value={form.imageLabel}
                onChange={(e) => updateField("imageLabel", e.target.value)}
                className={ADMIN_INPUT_CLASS}
              />
            </FormField>
            <FormField label="Placeholder tone" htmlFor="p-tone">
              <select
                id="p-tone"
                value={form.tone}
                onChange={(e) => updateField("tone", e.target.value as PlaceholderTone)}
                className={ADMIN_INPUT_CLASS}
              >
                {TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone[0].toUpperCase() + tone.slice(1)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </div>
      </div>
    </form>
  );
}
