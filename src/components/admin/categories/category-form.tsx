"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, PetType } from "@/data/admin/types";
import {
  createAdminCategory,
  fetchAdminCategory,
  setAdminCategoryActive,
  slugifyCategoryName,
  updateAdminCategory,
} from "@/lib/api/admin-category-api";
import { AdminApiError } from "@/lib/api/admin-api-client";
import { describeAdminError, uploadAdminMediaAsset, validateMediaAssetFile, type MediaAsset } from "@/lib/api/admin-media-api";
import { ArrowRightIcon, GridViewIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ErrorState, LoadingState } from "../ui/empty-state";
import { FormField, ADMIN_INPUT_CLASS } from "../ui/form-field";
import { MediaPickerDrawer } from "../gallery/media-picker-drawer";
import { useToast } from "../ui/toast";

type CategoryFormState = {
  name: string;
  description: string;
  petType: PetType;
  active: boolean;
  showOnHomepage: boolean;
  imageKey: string | null;
  imageUrl: string | null;
  imageAlt: string;
};

const EMPTY_FORM: CategoryFormState = {
  name: "",
  description: "",
  petType: "all",
  active: true,
  showOnHomepage: false,
  imageKey: null,
  imageUrl: null,
  imageAlt: "",
};

const PET_TYPES: Array<{ value: PetType; label: string }> = [
  { value: "dog", label: "Dogs" },
  { value: "cat", label: "Cats" },
  { value: "all", label: "All pets" },
];

function fromCategory(category: Category): CategoryFormState {
  return {
    name: category.name,
    description: category.description,
    petType: category.petType,
    active: category.active,
    showOnHomepage: category.showOnHomepage,
    imageKey: category.imageKey,
    imageUrl: category.imageUrl,
    imageAlt: category.imageAlt ?? "",
  };
}

function validationErrors(error: unknown): Record<string, string> {
  if (!(error instanceof AdminApiError) || !error.errors) return {};
  return Object.fromEntries(
    Object.entries(error.errors).map(([field, messages]) => [
      field,
      messages[0] ?? "Invalid value.",
    ]),
  );
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) {
    return `${error.message}${error.requestId ? ` (request ${error.requestId})` : ""}`;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function CategoryForm({ categoryId }: { categoryId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditing = categoryId !== undefined;
  const [category, setCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [imageStage, setImageStage] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const slug = useMemo(
    () => (isEditing ? category?.slug ?? "" : slugifyCategoryName(form.name)),
    [category?.slug, form.name, isEditing],
  );

  const loadCategory = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    setLoadError("");
    try {
      const nextCategory = await fetchAdminCategory(categoryId);
      setCategory(nextCategory);
      setForm(fromCategory(nextCategory));
      setDirty(false);
    } catch (error) {
      setLoadError(
        error instanceof AdminApiError && error.status === 404
          ? "Category not found. It may have been removed."
          : errorMessage(error, "Could not load the category."),
      );
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    if (!categoryId) return;
    let live = true;
    fetchAdminCategory(categoryId)
      .then((nextCategory) => {
        if (!live) return;
        setCategory(nextCategory);
        setForm(fromCategory(nextCategory));
        setDirty(false);
      })
      .catch((error: unknown) => {
        if (!live) return;
        setLoadError(
          error instanceof AdminApiError && error.status === 404
            ? "Category not found. It may have been removed."
            : errorMessage(error, "Could not load the category."),
        );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [categoryId]);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  function update<K extends keyof CategoryFormState>(
    field: K,
    value: CategoryFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === "name") delete next.slug;
      return next;
    });
    setGeneralError("");
  }

  function selectGalleryAsset(asset: MediaAsset) {
    setForm((current) => ({
      ...current,
      imageKey: asset.storageKey ?? null,
      imageUrl: asset.url,
      imageAlt: asset.altText || asset.title || asset.originalName,
    }));
    setDirty(true);
    setGeneralError("");
  }

  async function uploadImage(file: File) {
    const validationError = validateMediaAssetFile(file);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }
    setImageBusy(true);
    try {
      const asset = await uploadAdminMediaAsset(file, { onStage: setImageStage });
      setForm((current) => ({
        ...current,
        imageKey: asset.storageKey ?? null,
        imageUrl: asset.url,
        imageAlt: current.imageAlt || asset.altText || asset.title || asset.originalName,
      }));
      setDirty(true);
      showToast("Image uploaded to the Media Gallery.");
    } catch (error) {
      showToast(describeAdminError(error, "Image upload failed."), "error");
    } finally {
      setImageBusy(false);
      setImageStage("");
    }
  }

  function selectImageFile(files: FileList | null) {
    const file = files?.[0];
    if (file) void uploadImage(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function removeImage() {
    setForm((current) => ({ ...current, imageKey: null, imageUrl: null, imageAlt: "" }));
    setDirty(true);
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    const name = form.name.trim();
    if (!name) next.name = "Category name is required.";
    else if (name.length > 160) next.name = "Category name cannot exceed 160 characters.";
    if (!slug) next.name = "Use at least one letter or number in the category name.";

    return next;
  }

  async function save() {
    const localErrors = validate();
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setGeneralError("Review the highlighted fields before saving.");
      return;
    }

    setSaving(true);
    setErrors({});
    setGeneralError("");
    try {
      if (categoryId && category) {
        const updated = await updateAdminCategory(categoryId, {
          name: form.name.trim(),
          description: form.description.trim(),
          petType: form.petType,
          showOnHomepage: form.showOnHomepage,
          imageKey: form.imageKey,
          imageUrl: form.imageUrl,
          imageAlt: form.imageAlt.trim() || null,
        });

        if (updated.active !== form.active) {
          try {
            await setAdminCategoryActive(categoryId, form.active);
          } catch (error) {
            await loadCategory();
            setGeneralError(
              `Category fields were saved, but the status change failed: ${errorMessage(error, "Status rejected.")}`,
            );
            showToast("Category fields saved; status change was rejected.", "error");
            return;
          }
        }

        showToast("Category updated.");
      } else {
        await createAdminCategory({
          name: form.name.trim(),
          slug,
          description: form.description.trim(),
          petType: form.petType,
          active: form.active,
          showOnHomepage: form.showOnHomepage,
          imageKey: form.imageKey,
          imageUrl: form.imageUrl,
          imageAlt: form.imageAlt.trim() || null,
        });
        showToast("Category created.");
      }

      setDirty(false);
      router.push("/admin/categories");
    } catch (error) {
      const nextErrors = validationErrors(error);
      let message = errorMessage(error, "Could not save the category.");
      if (error instanceof AdminApiError && error.code === "CATEGORY_SLUG_CONFLICT") {
        message = "A category using this URL slug already exists. Please use a different category name.";
        nextErrors.name = message;
      }
      setErrors(nextErrors);
      setGeneralError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  function leaveForm() {
    if (dirty) setDiscardOpen(true);
    else router.push("/admin/categories");
  }

  const title = isEditing ? "Edit Category" : "Add Category";
  const description = isEditing
    ? "Update this category while keeping its storefront URL stable."
    : "Create a category for organizing the production catalog.";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <button
          type="button"
          onClick={leaveForm}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-primary/65 transition-colors hover:text-text-primary"
        >
          <ArrowRightIcon aria-hidden="true" width={14} height={14} className="rotate-180" />
          Back to Categories
        </button>
        <h1 className="text-xl font-bold text-text-primary">{title}</h1>
        <p className="mt-1 text-sm text-text-primary/60">{description}</p>
      </div>

      {loading ? (
        <div role="status" aria-live="polite">
          <LoadingState label="Loading category…" />
        </div>
      ) : loadError ? (
        <div role="alert">
          <ErrorState message={loadError} onRetry={loadCategory} />
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          noValidate
          aria-busy={saving}
          className="flex min-w-0 flex-col gap-5 pb-24"
        >
          {generalError && (
            <div
              role="alert"
              className="rounded-lg border border-terracotta/30 bg-terracotta/5 p-3 text-sm font-medium text-terracotta"
            >
              {generalError}
            </div>
          )}

          <section className="min-w-0 rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-text-primary">Basic information</h2>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0 sm:col-span-2">
                <FormField label="Name" htmlFor="category-name" error={errors.name}>
                  <input
                    id="category-name"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    maxLength={160}
                    autoFocus={!isEditing}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "category-name-error" : undefined}
                    className={ADMIN_INPUT_CLASS}
                  />
                </FormField>
              </div>

              <div className="min-w-0 sm:col-span-2">
                <FormField
                  label="Slug"
                  htmlFor="category-slug"
                  error={errors.slug}
                  hint="Automatically generated from the category name."
                >
                  <input
                    id="category-slug"
                    value={slug}
                    readOnly
                    aria-readonly="true"
                    aria-invalid={Boolean(errors.slug)}
                    aria-describedby={errors.slug ? "category-slug-error" : "category-slug-hint"}
                    placeholder="category-slug"
                    className={`${ADMIN_INPUT_CLASS} min-w-0 cursor-default bg-cream-bg/60 font-mono text-xs`}
                  />
                </FormField>
              </div>

              <div className="min-w-0 sm:col-span-2">
                <FormField
                  label="Description"
                  htmlFor="category-description"
                  error={errors.description}
                  optional
                >
                  <textarea
                    id="category-description"
                    rows={4}
                    value={form.description}
                    onChange={(event) => update("description", event.target.value)}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={errors.description ? "category-description-error" : undefined}
                    className={`${ADMIN_INPUT_CLASS} resize-y`}
                  />
                </FormField>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-text-primary">Catalog settings</h2>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <FormField
                label="Pet type"
                htmlFor="category-pet-type"
                error={errors.petType}
              >
                <select
                  id="category-pet-type"
                  value={form.petType}
                  onChange={(event) => update("petType", event.target.value as PetType)}
                  aria-invalid={Boolean(errors.petType)}
                  aria-describedby={errors.petType ? "category-pet-type-error" : undefined}
                  className={ADMIN_INPUT_CLASS}
                >
                  {PET_TYPES.map((petType) => (
                    <option key={petType.value} value={petType.value}>
                      {petType.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <div>
                <label className="flex items-start gap-3 rounded-lg border border-border-subtle p-3 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => update("active", event.target.checked)}
                    aria-invalid={Boolean(errors.active)}
                    aria-describedby={errors.active ? "category-active-error" : undefined}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary-orange"
                  />
                  <span>
                    <span className="block font-semibold">Active</span>
                    <span className="mt-0.5 block text-xs text-text-primary/55">
                      Active categories are available to the storefront catalog.
                    </span>
                  </span>
                </label>
                {errors.active && (
                  <p
                    id="category-active-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-terracotta"
                  >
                    {errors.active}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-start gap-3 rounded-lg border border-border-subtle p-3 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={form.showOnHomepage}
                    onChange={(event) => update("showOnHomepage", event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary-orange"
                  />
                  <span>
                    <span className="block font-semibold">Show on Homepage</span>
                    <span className="mt-0.5 block text-xs text-text-primary/55">
                      Display this category in the homepage category section.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-xl border border-border-subtle bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Category image</h2>
                <p className="mt-1 text-xs text-text-primary/50">
                  Optional. JPEG, PNG, or WebP · maximum 5 MB. Used for the homepage category section.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={imageBusy}
                  onClick={() => setGalleryOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold hover:bg-cream-bg disabled:opacity-50"
                >
                  <GridViewIcon width={14} /> Choose from Gallery
                </button>
                <button
                  type="button"
                  disabled={imageBusy}
                  onClick={() => imageInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold hover:bg-cream-bg disabled:opacity-50"
                >
                  <UploadIcon width={14} /> Upload new
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => selectImageFile(event.target.files)}
                  className="sr-only"
                  aria-label="Select Category image"
                />
              </div>
            </div>

            {imageBusy && imageStage && (
              <p role="status" className="mt-3 rounded-lg border border-primary-orange/30 bg-primary-orange/5 p-3 text-xs font-medium text-primary-orange">
                {imageStage}…
              </p>
            )}

            {form.imageUrl ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl}
                  alt={form.imageAlt || "Category image preview"}
                  className="aspect-square w-32 shrink-0 rounded-lg border border-border-subtle bg-cream-bg object-cover"
                />
                <div className="flex-1 space-y-3">
                  <FormField label="Image alt text" htmlFor="category-image-alt" optional>
                    <input
                      id="category-image-alt"
                      value={form.imageAlt}
                      onChange={(event) => update("imageAlt", event.target.value)}
                      className={ADMIN_INPUT_CLASS}
                    />
                  </FormField>
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={imageBusy}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta disabled:opacity-50"
                  >
                    <TrashIcon width={14} /> Remove image
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-border-subtle p-6 text-center text-sm text-text-primary/50">
                No Category image yet.
              </p>
            )}
          </section>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-subtle bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2 sm:justify-between">
              <p className="hidden text-xs text-text-primary/50 sm:block">
                {dirty ? "You have unsaved category changes." : "No unsaved changes."}
              </p>
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={leaveForm}
                  disabled={saving}
                  className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-cream-bg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Saving…" : isEditing ? "Save changes" : "Create Category"}
                </button>
              </div>
            </div>
          </div>

          <ConfirmDialog
            open={discardOpen}
            onClose={() => setDiscardOpen(false)}
            onConfirm={() => router.push("/admin/categories")}
            title="Discard unsaved category changes?"
            description="Your unsaved changes will be lost."
            confirmLabel="Discard"
          />

          <MediaPickerDrawer
            open={galleryOpen}
            onClose={() => setGalleryOpen(false)}
            onSelect={selectGalleryAsset}
          />
        </form>
      )}
    </div>
  );
}
