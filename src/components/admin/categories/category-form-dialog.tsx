"use client";

import { useState } from "react";
import type { Category, CategoryInput, PetType } from "@/data/admin/types";
import { Dialog } from "../ui/dialog";
import { FormField, ADMIN_INPUT_CLASS } from "../ui/form-field";

const PET_TYPES: { value: PetType; label: string }[] = [
  { value: "dog", label: "Dogs" },
  { value: "cat", label: "Cats" },
  { value: "all", label: "Works for all pets" },
];

/**
 * Owns its own form state, initialised once from props. No reset effect
 * needed: Dialog unmounts this component entirely on close (`if (!open)
 * return null`), so reopening always mounts a fresh instance with the
 * current `category` prop already baked into the initial state.
 */
function CategoryFormFields({
  category,
  onSubmit,
  onClose,
  saving,
}: {
  category: Category | null;
  onSubmit: (input: CategoryInput) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [petType, setPetType] = useState<PetType>(category?.petType ?? "all");
  const [active, setActive] = useState(category?.active ?? true);
  const [displayOrder, setDisplayOrder] = useState(category?.order ?? 0);
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    onSubmit({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      petType,
      active,
      displayOrder,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField label="Name" htmlFor="cat-name" error={error}>
        <input
          id="cat-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          className={ADMIN_INPUT_CLASS}
          autoFocus
        />
      </FormField>
      <FormField label="Slug" htmlFor="cat-slug" optional>
        <input
          id="cat-slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="Generated from the name when blank"
          className={ADMIN_INPUT_CLASS}
        />
      </FormField>
      <FormField label="Description" htmlFor="cat-description" optional>
        <textarea
          id="cat-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${ADMIN_INPUT_CLASS} resize-none`}
        />
      </FormField>
      {!category && (
        <FormField label="Display order" htmlFor="cat-display-order">
          <input
            id="cat-display-order"
            type="number"
            min={0}
            step={1}
            value={displayOrder}
            onChange={(event) =>
              setDisplayOrder(Math.max(0, Number.parseInt(event.target.value, 10) || 0))
            }
            className={ADMIN_INPUT_CLASS}
          />
        </FormField>
      )}
      <FormField label="Pet type" htmlFor="cat-pet-type">
        <select id="cat-pet-type" value={petType} onChange={(e) => setPetType(e.target.value as PetType)} className={ADMIN_INPUT_CLASS}>
          {PET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </FormField>
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-primary-orange" />
        Active (visible in the shop)
      </label>
      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-cream-bg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : category ? "Save changes" : "Add category"}
        </button>
      </div>
    </form>
  );
}

export function CategoryFormDialog({
  open,
  onClose,
  onSubmit,
  category,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CategoryInput) => void;
  category: Category | null;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={category ? "Edit category" : "Add category"} maxWidthClassName="max-w-sm">
      <CategoryFormFields category={category} onSubmit={onSubmit} onClose={onClose} saving={saving} />
    </Dialog>
  );
}
