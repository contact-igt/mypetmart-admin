"use client";

import { useCallback, useState } from "react";
import { adminRepository } from "@/data/admin/mock-repository";
import type { Category } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { useToast } from "../ui/toast";
import { CategoryFormDialog } from "./category-form-dialog";
import { ChevronDownIcon, PencilIcon, PlusIcon } from "@/components/icons";

export function CategoriesView() {
  const { showToast } = useToast();
  const fetcher = useCallback(() => adminRepository.listCategories(), []);
  const { data: categories, loading, error, reload } = useAdminData(fetcher);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setDialogOpen(true);
  }

  async function handleSubmit(input: { name: string; active: boolean }) {
    setSaving(true);
    try {
      if (editing) {
        await adminRepository.updateCategory(editing.id, input);
        showToast("Category updated.");
      } else {
        await adminRepository.createCategory(input);
        showToast("Category added.");
      }
      setDialogOpen(false);
      reload();
    } catch {
      showToast("Could not save the category.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    setBusyId(id);
    try {
      await adminRepository.reorderCategory(id, direction);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(category: Category) {
    setBusyId(category.id);
    try {
      await adminRepository.setCategoryActive(category.id, !category.active);
      showToast(category.active ? `"${category.name}" deactivated.` : `"${category.name}" activated.`);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingState label="Loading categories…" />;
  if (error || !categories) return <ErrorState message={error ?? "Could not load categories."} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Categories</h1>
          <p className="mt-1 text-sm text-text-primary/60">Reorder with the arrows — order controls Shop display order.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90"
        >
          <PlusIcon width={14} height={14} /> Add category
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-white">
        <ul>
          {categories.map((category, index) => (
            <li
              key={category.id}
              className="flex items-center gap-3 border-b border-border-subtle/70 px-4 py-3 last:border-b-0"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => handleReorder(category.id, "up")}
                  disabled={index === 0 || busyId === category.id}
                  aria-label={`Move ${category.name} up`}
                  className="text-text-primary/50 transition-colors duration-150 ease-out hover:text-text-primary disabled:opacity-25"
                >
                  <ChevronDownIcon width={14} height={14} className="rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => handleReorder(category.id, "down")}
                  disabled={index === categories.length - 1 || busyId === category.id}
                  aria-label={`Move ${category.name} down`}
                  className="text-text-primary/50 transition-colors duration-150 ease-out hover:text-text-primary disabled:opacity-25"
                >
                  <ChevronDownIcon width={14} height={14} />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-primary">{category.name}</p>
                <p className="text-xs text-text-primary/50">/{category.slug}</p>
              </div>

              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                  category.active ? "bg-mint-sage text-text-primary" : "bg-cream-bg text-text-primary/50 border border-border-subtle"
                }`}
              >
                {category.active ? "Active" : "Inactive"}
              </span>

              <button
                type="button"
                onClick={() => handleToggleActive(category)}
                disabled={busyId === category.id}
                className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg disabled:opacity-50"
              >
                {category.active ? "Deactivate" : "Activate"}
              </button>

              <button
                type="button"
                onClick={() => openEdit(category)}
                aria-label={`Edit ${category.name}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-primary/60 hover:bg-cream-bg hover:text-text-primary"
              >
                <PencilIcon width={15} height={15} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <CategoryFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        category={editing}
        saving={saving}
      />
    </div>
  );
}
