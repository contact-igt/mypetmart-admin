"use client";

import { useCallback, useState } from "react";
import {
  type AnnouncementBarItem,
  type AnnouncementBarItemInput,
  createAdminAnnouncementBarItem,
  deleteAdminAnnouncementBarItem,
  fetchAdminAnnouncementBarItems,
  reorderAdminAnnouncementBarItems,
  setAdminAnnouncementBarItemActive,
  updateAdminAnnouncementBarItem,
} from "@/lib/api/admin-announcement-bar-api";
import { AdminApiError } from "@/lib/api/admin-api-client";
import { useAdminData } from "../ui/use-admin-data";
import { EmptyState, ErrorState, LoadingState } from "../ui/empty-state";
import { useToast } from "../ui/toast";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ChevronDownIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { AnnouncementBarFormDialog } from "./announcement-bar-form-dialog";

function mutationMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) {
    const firstValidationMessage = error.errors ? Object.values(error.errors).flat()[0] : undefined;
    return firstValidationMessage ?? error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

function sortItems(items: AnnouncementBarItem[]): AnnouncementBarItem[] {
  return [...items].sort((left, right) => left.order - right.order || Number(left.id) - Number(right.id));
}

function formatSchedule(item: AnnouncementBarItem): string | null {
  const formatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  if (item.startsAt && item.endsAt) return `${formatter.format(new Date(item.startsAt))} – ${formatter.format(new Date(item.endsAt))}`;
  if (item.startsAt) return `From ${formatter.format(new Date(item.startsAt))}`;
  if (item.endsAt) return `Until ${formatter.format(new Date(item.endsAt))}`;
  return null;
}

export function AnnouncementBarView() {
  const { showToast } = useToast();
  const fetcher = useCallback(() => fetchAdminAnnouncementBarItems(), []);
  const { data, loading, error, reload } = useAdminData(fetcher);
  const [itemState, setItemState] = useState<AnnouncementBarItem[] | null>(null);
  const items = sortItems(itemState ?? data ?? []);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementBarItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementBarItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openAddForm() {
    setEditingItem(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(item: AnnouncementBarItem) {
    setEditingItem(item);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleFormSubmit(input: AnnouncementBarItemInput) {
    setSaving(true);
    setFormError(null);
    try {
      if (editingItem) {
        const updated = await updateAdminAnnouncementBarItem(editingItem.id, input);
        setItemState((current) => (current ?? items).map((item) => (item.id === updated.id ? updated : item)));
        showToast("Announcement updated.");
      } else {
        const created = await createAdminAnnouncementBarItem(input);
        setItemState((current) => [...(current ?? items), created]);
        showToast("Announcement added.");
      }
      setFormOpen(false);
    } catch (requestError) {
      setFormError(mutationMessage(requestError, "Could not save the announcement."));
    } finally {
      setSaving(false);
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const prior = [...items];
    const index = prior.findIndex((item) => item.id === id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= prior.length) return;

    const reordered = [...prior];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    const normalized = reordered.map((item, order) => ({ ...item, order }));

    setBusyId(id);
    setItemState(normalized);
    try {
      setItemState(sortItems(await reorderAdminAnnouncementBarItems(normalized)));
      showToast("Announcement order updated.");
    } catch (requestError) {
      setItemState(prior);
      showToast(mutationMessage(requestError, "Could not reorder announcements."), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(item: AnnouncementBarItem) {
    setBusyId(item.id);
    try {
      const updated = await setAdminAnnouncementBarItemActive(item.id, !item.active);
      setItemState((current) => (current ?? items).map((existing) => (existing.id === updated.id ? updated : existing)));
      showToast(item.active ? "Announcement deactivated." : "Announcement activated.");
    } catch (requestError) {
      showToast(mutationMessage(requestError, "Could not update the announcement's status."), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminAnnouncementBarItem(deleteTarget.id);
      setItemState((current) => (current ?? items).filter((item) => item.id !== deleteTarget.id));
      showToast("Announcement deleted.");
      setDeleteTarget(null);
    } catch (requestError) {
      showToast(mutationMessage(requestError, "Could not delete the announcement."), "error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div id="announcement-bar-results" role="status" aria-live="polite">
        <LoadingState label="Loading announcement bar items…" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div id="announcement-bar-results" role="alert">
        <ErrorState message={error ?? "Could not load announcement bar items."} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Announcement Bar</h1>
          <p className="mt-1 text-sm text-text-primary/60">
            Messages cycle in the strip above the storefront header, in the order shown below.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90"
        >
          <PlusIcon aria-hidden="true" width={14} height={14} /> Add announcement
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="Add a message to show it in the storefront's top bar."
          action={
            <button
              type="button"
              onClick={openAddForm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90"
            >
              <PlusIcon aria-hidden="true" width={14} height={14} /> Add announcement
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-white">
          <ul>
            {items.map((item, index) => {
              const schedule = formatSchedule(item);
              return (
                <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-3 border-b border-border-subtle/70 px-4 py-3 last:border-b-0">
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => handleReorder(item.id, "up")}
                      disabled={index === 0 || busyId !== null}
                      aria-label={`Move "${item.message}" up`}
                      className="text-text-primary/50 transition-colors duration-150 ease-out hover:text-text-primary disabled:opacity-25"
                    >
                      <ChevronDownIcon aria-hidden="true" width={14} height={14} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(item.id, "down")}
                      disabled={index === items.length - 1 || busyId !== null}
                      aria-label={`Move "${item.message}" down`}
                      className="text-text-primary/50 transition-colors duration-150 ease-out hover:text-text-primary disabled:opacity-25"
                    >
                      <ChevronDownIcon aria-hidden="true" width={14} height={14} />
                    </button>
                  </div>

                  <div className="min-w-48 flex-1">
                    <p className="font-medium text-text-primary">{item.message}</p>
                    <p className="break-words text-xs text-text-primary/50">
                      {item.linkUrl ? (item.linkLabel ? `"${item.linkLabel}" links to ${item.linkUrl}` : `Links to ${item.linkUrl}`) : "No link"}
                      {schedule ? ` · ${schedule}` : ""}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-20 shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.active ? "bg-mint-sage text-text-primary" : "border border-border-subtle bg-cream-bg text-text-primary/50"
                    }`}
                  >
                    {item.active ? "Active" : "Inactive"}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    disabled={busyId !== null}
                    className="w-28 shrink-0 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg disabled:opacity-50"
                  >
                    {item.active ? "Deactivate" : "Activate"}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditForm(item)}
                    aria-label={`Edit "${item.message}"`}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-primary/60 hover:bg-cream-bg hover:text-text-primary"
                  >
                    <PencilIcon aria-hidden="true" width={15} height={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    disabled={busyId !== null}
                    aria-label={`Delete "${item.message}"`}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-primary/60 hover:bg-terracotta/10 hover:text-terracotta disabled:opacity-50"
                  >
                    <TrashIcon aria-hidden="true" width={15} height={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AnnouncementBarFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        item={editingItem}
        saving={saving}
        errorMessage={formError}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete this announcement?"
        description={`"${deleteTarget?.message}" will stop showing on the storefront immediately. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
