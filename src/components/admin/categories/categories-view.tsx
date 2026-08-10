"use client";

import { useCallback, useState } from "react";
import type { Category, CategoryInput, PetType } from "@/data/admin/types";
import {
  createAdminCategory,
  deleteAdminCategory,
  fetchAdminCategories,
  fetchAdminCategory,
  reorderAdminCategories,
  setAdminCategoryActive,
  updateAdminCategory,
} from "@/lib/api/admin-category-api";
import { AdminApiError } from "@/lib/api/admin-api-client";
import { useAdminData } from "../ui/use-admin-data";
import { EmptyState, ErrorState, LoadingState } from "../ui/empty-state";
import { useToast } from "../ui/toast";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { Dialog } from "../ui/dialog";
import { CategoryFormDialog } from "./category-form-dialog";
import {
  ChevronDownIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";

const PET_TYPE_LABELS: Record<PetType, string> = {
  dog: "Dogs",
  cat: "Cats",
  all: "All pets",
};

const DELETE_BLOCKED_MESSAGE =
  "This category cannot be removed because products are still assigned to it. Move those products first or deactivate the category instead.";

function mutationMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) {
    const firstValidationMessage = error.errors
      ? Object.values(error.errors).flat()[0]
      : undefined;
    return firstValidationMessage ?? error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort(
    (left, right) => left.order - right.order || Number(left.id) - Number(right.id),
  );
}

export function CategoriesView() {
  const { showToast } = useToast();
  const fetcher = useCallback(() => fetchAdminCategories(), []);
  const { data, loading, error, reload } = useAdminData(fetcher);
  const [categoryState, setCategoryState] = useState<Category[] | null>(null);
  const categories = categoryState ?? sortCategories(data ?? []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [blockedTarget, setBlockedTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function openEdit(category: Category) {
    setBusyId(category.id);
    try {
      const detail = await fetchAdminCategory(category.id);
      setEditing(detail);
      setDialogOpen(true);
    } catch (requestError) {
      showToast(mutationMessage(requestError, "Could not load the category."), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmit(input: CategoryInput) {
    setSaving(true);
    try {
      if (editing) {
        let updated = await updateAdminCategory(editing.id, {
          name: input.name,
          slug: input.slug,
          description: input.description,
          petType: input.petType,
        });
        if (updated.active !== input.active) {
          updated = await setAdminCategoryActive(editing.id, input.active);
        }
        setCategoryState((currentState) => {
          const current = currentState ?? categories;
          return sortCategories(
            current.map((category) =>
              category.id === updated.id ? updated : category,
            ),
          );
        });
        showToast("Category updated.");
      } else {
        const created = await createAdminCategory(input);
        setCategoryState((currentState) =>
          sortCategories([...(currentState ?? categories), created]),
        );
        showToast("Category added.");
      }
      setDialogOpen(false);
    } catch (requestError) {
      showToast(mutationMessage(requestError, "Could not save the category."), "error");
      if (editing) {
        setCategoryState(null);
        reload();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const prior = [...categories];
    const index = prior.findIndex((category) => category.id === id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= prior.length) return;

    const reordered = [...prior];
    [reordered[index], reordered[swapIndex]] = [
      reordered[swapIndex],
      reordered[index],
    ];
    const normalized = reordered.map((category, displayOrder) => ({
      ...category,
      order: displayOrder,
    }));

    setBusyId(id);
    setCategoryState(normalized);
    try {
      setCategoryState(sortCategories(await reorderAdminCategories(normalized)));
      showToast("Category order updated.");
    } catch (requestError) {
      setCategoryState(prior);
      showToast(mutationMessage(requestError, "Could not reorder categories."), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(category: Category) {
    setBusyId(category.id);
    try {
      const updated = await setAdminCategoryActive(category.id, !category.active);
      setCategoryState((currentState) =>
        (currentState ?? categories).map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );
      showToast(
        category.active
          ? `"${category.name}" deactivated.`
          : `"${category.name}" activated.`,
      );
    } catch (requestError) {
      showToast(mutationMessage(requestError, "Could not update category status."), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminCategory(deleteTarget.id);
      setCategoryState((currentState) =>
        (currentState ?? categories).filter(
          (category) => category.id !== deleteTarget.id,
        ),
      );
      showToast(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
    } catch (requestError) {
      if (
        requestError instanceof AdminApiError &&
        requestError.code === "CATEGORY_DELETE_BLOCKED"
      ) {
        setBlockedTarget(deleteTarget);
        setDeleteTarget(null);
        showToast(DELETE_BLOCKED_MESSAGE, "error");
      } else {
        showToast(mutationMessage(requestError, "Could not delete the category."), "error");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function deactivateFromBlocked() {
    if (!blockedTarget) return;
    setBusyId(blockedTarget.id);
    try {
      const updated = await setAdminCategoryActive(blockedTarget.id, false);
      setCategoryState((currentState) =>
        (currentState ?? categories).map((category) =>
          category.id === updated.id ? updated : category,
        ),
      );
      showToast(`"${blockedTarget.name}" deactivated.`);
      setBlockedTarget(null);
    } catch (requestError) {
      showToast(mutationMessage(requestError, "Could not deactivate the category."), "error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingState label="Loading categories…" />;
  if (error || !data) {
    return (
      <ErrorState
        message={error ?? "Could not load categories."}
        onRetry={reload}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Categories</h1>
          <p className="mt-1 text-sm text-text-primary/60">
            Reorder with the arrows — order controls Shop display order.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={saving || busyId !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90 disabled:opacity-60"
        >
          <PlusIcon width={14} height={14} /> Add category
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Add the first category to start organizing the catalog."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white"
            >
              Add category
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-white">
          <ul>
            {categories.map((category, index) => (
              <li
                key={category.id}
                className="flex flex-wrap items-center gap-3 border-b border-border-subtle/70 px-4 py-3 last:border-b-0"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleReorder(category.id, "up")}
                    disabled={index === 0 || busyId !== null}
                    aria-label={`Move ${category.name} up`}
                    className="text-text-primary/50 transition-colors duration-150 ease-out hover:text-text-primary disabled:opacity-25"
                  >
                    <ChevronDownIcon width={14} height={14} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(category.id, "down")}
                    disabled={index === categories.length - 1 || busyId !== null}
                    aria-label={`Move ${category.name} down`}
                    className="text-text-primary/50 transition-colors duration-150 ease-out hover:text-text-primary disabled:opacity-25"
                  >
                    <ChevronDownIcon width={14} height={14} />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary">{category.name}</p>
                  <p className="truncate text-xs text-text-primary/50">
                    /{category.slug} · {PET_TYPE_LABELS[category.petType]}
                    {category.description ? ` · ${category.description}` : ""}
                  </p>
                </div>

                <span className="shrink-0 text-xs font-medium text-text-primary/60">
                  {category.productCount ?? 0} product
                  {(category.productCount ?? 0) === 1 ? "" : "s"}
                </span>

                <span
                  className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    category.active
                      ? "bg-mint-sage text-text-primary"
                      : "border border-border-subtle bg-cream-bg text-text-primary/50"
                  }`}
                >
                  {category.active ? "Active" : "Inactive"}
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleActive(category)}
                  disabled={busyId !== null}
                  className="shrink-0 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg disabled:opacity-50"
                >
                  {category.active ? "Deactivate" : "Activate"}
                </button>

                <button
                  type="button"
                  onClick={() => void openEdit(category)}
                  disabled={busyId !== null}
                  aria-label={`Edit ${category.name}`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-primary/60 hover:bg-cream-bg hover:text-text-primary disabled:opacity-50"
                >
                  <PencilIcon width={15} height={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(category)}
                  disabled={busyId !== null}
                  aria-label={`Delete ${category.name}`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-primary/60 hover:bg-terracotta/10 hover:text-terracotta disabled:opacity-50"
                >
                  <TrashIcon width={15} height={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        category={editing}
        saving={saving}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete category?"
        description={
          (deleteTarget?.productCount ?? 0) > 0
            ? `"${deleteTarget?.name}" currently has products assigned. The server will verify whether deletion is safe.`
            : `Permanently remove "${deleteTarget?.name}"? This cannot be undone.`
        }
        confirmLabel="Delete"
        loading={deleting}
      />

      <Dialog
        open={Boolean(blockedTarget)}
        onClose={() => setBlockedTarget(null)}
        title="Can't delete this category"
        maxWidthClassName="max-w-sm"
      >
        <p className="text-sm text-text-primary/80">{DELETE_BLOCKED_MESSAGE}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setBlockedTarget(null)}
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg"
          >
            Close
          </button>
          {blockedTarget?.active && (
            <button
              type="button"
              onClick={() => void deactivateFromBlocked()}
              disabled={busyId === blockedTarget.id}
              className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90 disabled:opacity-60"
            >
              Deactivate instead
            </button>
          )}
        </div>
      </Dialog>
    </div>
  );
}
