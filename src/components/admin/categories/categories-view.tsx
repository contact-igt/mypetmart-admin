"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { Category, PetType } from "@/data/admin/types";
import {
  deleteAdminCategory,
  fetchAdminCategories,
  reorderAdminCategories,
  restoreAdminCategory,
  setAdminCategoryActive,
  type CategoryStatusFilter,
} from "@/lib/api/admin-category-api";
import { AdminApiError } from "@/lib/api/admin-api-client";
import { useAdminData } from "../ui/use-admin-data";
import { EmptyState, ErrorState, LoadingState } from "../ui/empty-state";
import { useToast } from "../ui/toast";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { Dialog } from "../ui/dialog";
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

const FILTERS: Array<{ value: CategoryStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "deleted", label: "Deleted" },
];

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

function sortCategories(categories: Category[], filter: CategoryStatusFilter): Category[] {
  if (filter === "deleted") {
    return [...categories].sort((left, right) => {
      const leftTime = left.deletedAt ? new Date(left.deletedAt).getTime() : 0;
      const rightTime = right.deletedAt ? new Date(right.deletedAt).getTime() : 0;
      return rightTime - leftTime || Number(left.id) - Number(right.id);
    });
  }
  return [...categories].sort(
    (left, right) => left.order - right.order || Number(left.id) - Number(right.id),
  );
}

function formatDeletedDate(value: string | null | undefined): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function CategoriesView() {
  const [filter, setFilter] = useState<CategoryStatusFilter>("all");

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Categories</h1>
          <p className="mt-1 text-sm text-text-primary/60">
            Manage catalog categories, storefront visibility, order, and deleted items.
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90"
        >
          <PlusIcon aria-hidden="true" width={14} height={14} /> Add category
        </Link>
      </div>

      <div
        aria-label="Category status filters"
        className="flex flex-wrap gap-2 border-b border-border-subtle"
      >
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            aria-controls="category-results"
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
              filter === item.value
                ? "border-primary-orange text-primary-orange"
                : "border-transparent text-text-primary/55 hover:text-text-primary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <CategoryResults key={filter} filter={filter} />
    </div>
  );
}

function CategoryResults({ filter }: { filter: CategoryStatusFilter }) {
  const { showToast } = useToast();
  const fetcher = useCallback(() => fetchAdminCategories(filter), [filter]);
  const { data, loading, error, reload } = useAdminData(fetcher);
  const [categoryState, setCategoryState] = useState<Category[] | null>(null);
  const categories = sortCategories(categoryState ?? data ?? [], filter);
  const isDeletedView = filter === "deleted";

  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [blockedTarget, setBlockedTarget] = useState<Category | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

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
      setCategoryState(sortCategories(await reorderAdminCategories(normalized), filter));
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
      setCategoryState((currentState) => {
        const current = currentState ?? categories;
        if (
          (filter === "active" && !updated.active) ||
          (filter === "inactive" && updated.active)
        ) {
          return current.filter((item) => item.id !== updated.id);
        }
        return current.map((item) => (item.id === updated.id ? updated : item));
      });
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
      showToast(`Moved "${deleteTarget.name}" to Deleted.`);
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

  async function confirmRestore() {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      await restoreAdminCategory(restoreTarget.id);
      setCategoryState((currentState) =>
        (currentState ?? categories).filter(
          (category) => category.id !== restoreTarget.id,
        ),
      );
      showToast("Category restored. It is currently inactive.");
      setRestoreTarget(null);
    } catch (requestError) {
      showToast(mutationMessage(requestError, "Could not restore the category."), "error");
    } finally {
      setRestoring(false);
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

  if (loading) {
    return (
      <div id="category-results" role="status" aria-live="polite">
        <LoadingState label={`Loading ${filter === "deleted" ? "deleted " : ""}categories…`} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div id="category-results" role="alert">
        <ErrorState message={error ?? "Could not load categories."} onRetry={reload} />
      </div>
    );
  }

  return (
    <div id="category-results" className="min-w-0">
      {categories.length === 0 ? (
        <EmptyState
          title={isDeletedView ? "No deleted categories" : `No ${filter === "all" ? "" : `${filter} `}categories`}
          description={
            isDeletedView
              ? "Deleted categories will appear here and can be restored."
              : "No categories match this status."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-white">
          <ul>
            {categories.map((category, index) => (
              <li
                key={category.id}
                className="flex min-w-0 flex-wrap items-center gap-3 border-b border-border-subtle/70 px-4 py-3 last:border-b-0"
              >
                {!isDeletedView && filter === "all" && (
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => handleReorder(category.id, "up")}
                      disabled={index === 0 || busyId !== null}
                      aria-label={`Move ${category.name} up`}
                      className="text-text-primary/50 transition-colors duration-150 ease-out hover:text-text-primary disabled:opacity-25"
                    >
                      <ChevronDownIcon aria-hidden="true" width={14} height={14} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(category.id, "down")}
                      disabled={index === categories.length - 1 || busyId !== null}
                      aria-label={`Move ${category.name} down`}
                      className="text-text-primary/50 transition-colors duration-150 ease-out hover:text-text-primary disabled:opacity-25"
                    >
                      <ChevronDownIcon aria-hidden="true" width={14} height={14} />
                    </button>
                  </div>
                )}

                <div className="min-w-48 flex-1">
                  {isDeletedView ? (
                    <p className="font-medium text-text-primary">{category.name}</p>
                  ) : (
                    <Link
                      href={`/admin/categories/${category.id}/edit`}
                      className="font-medium text-text-primary hover:text-primary-orange"
                    >
                      {category.name}
                    </Link>
                  )}
                  <p className="break-words text-xs text-text-primary/50">
                    /{category.slug} · {PET_TYPE_LABELS[category.petType]}
                    {!isDeletedView && category.description ? ` · ${category.description}` : ""}
                  </p>
                </div>

                <span className="w-20 shrink-0 text-right text-xs font-medium text-text-primary/60">
                  {category.productCount ?? 0} product
                  {(category.productCount ?? 0) === 1 ? "" : "s"}
                </span>

                {isDeletedView ? (
                  <>
                    <span className="shrink-0 text-xs text-text-primary/60">
                      Deleted {formatDeletedDate(category.deletedAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRestoreTarget(category)}
                      disabled={restoring || busyId !== null}
                      className="shrink-0 rounded-lg border border-primary-orange px-3 py-1.5 text-xs font-semibold text-primary-orange transition-colors hover:bg-primary-orange/5 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`inline-flex w-20 shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
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
                      className="w-28 shrink-0 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg disabled:opacity-50"
                    >
                      {category.active ? "Deactivate" : "Activate"}
                    </button>

                    <Link
                      href={`/admin/categories/${category.id}/edit`}
                      aria-label={`Edit ${category.name}`}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-primary/60 hover:bg-cream-bg hover:text-text-primary"
                    >
                      <PencilIcon aria-hidden="true" width={15} height={15} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(category)}
                      disabled={busyId !== null}
                      aria-label={`Delete ${category.name}`}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-primary/60 hover:bg-terracotta/10 hover:text-terracotta disabled:opacity-50"
                    >
                      <TrashIcon aria-hidden="true" width={15} height={15} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Move category to Deleted?"
        description={
          (deleteTarget?.productCount ?? 0) > 0
            ? `"${deleteTarget?.name}" currently has products assigned. The server will verify whether deletion is safe.`
            : `"${deleteTarget?.name}" will leave the normal category list and can be restored later.`
        }
        confirmLabel="Delete"
        loading={deleting}
      />

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={confirmRestore}
        title="Restore category?"
        description={`Restore "${restoreTarget?.name}" with its original URL slug? It will return as inactive.`}
        confirmLabel="Restore"
        loading={restoring}
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
