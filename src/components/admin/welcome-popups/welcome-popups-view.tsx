"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  activateAdminWelcomePopup,
  archiveAdminWelcomePopup,
  deactivateAdminWelcomePopup,
  duplicateAdminWelcomePopup,
  fetchAdminWelcomePopups,
  publishAdminWelcomePopup,
  type WelcomePopup,
  type WelcomePopupStatus,
} from "@/lib/api/admin-welcome-popup-api";
import { AdminApiError } from "@/lib/api/admin-api-client";
import { useAdminData } from "../ui/use-admin-data";
import { EmptyState, ErrorState, LoadingState } from "../ui/empty-state";
import { useToast } from "../ui/toast";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { PencilIcon, PlusIcon } from "@/components/icons";

type StatusFilter = "all" | WelcomePopupStatus;

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const STATUS_LABEL: Record<WelcomePopupStatus, string> = { draft: "Draft", published: "Published", archived: "Archived" };
const STATUS_CLASS: Record<WelcomePopupStatus, string> = {
  draft: "border border-border-subtle bg-cream-bg text-text-primary/60",
  published: "bg-mint-sage text-text-primary",
  archived: "border border-border-subtle bg-cream-bg text-text-primary/40",
};

const TEMPLATE_LABEL: Record<WelcomePopup["template"], string> = {
  template_1: "Template 1 — Rounded modal",
  template_2: "Template 2 — Discount panel",
};

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) {
    const firstValidationMessage = error.errors ? Object.values(error.errors).flat()[0] : undefined;
    return firstValidationMessage ?? error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export function WelcomePopupsView() {
  const [filter, setFilter] = useState<StatusFilter>("all");

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Welcome Popups</h1>
          <p className="mt-1 text-sm text-text-primary/60">Design homepage popups and choose which one, if any, is live. Only one can be active at a time.</p>
        </div>
        <Link href="/admin/welcome-popups/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90">
          <PlusIcon aria-hidden="true" width={14} height={14} /> Add popup
        </Link>
      </div>

      <div aria-label="Popup status filters" className="flex flex-wrap gap-2 border-b border-border-subtle">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            aria-controls="welcome-popup-results"
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
              filter === item.value ? "border-primary-orange text-primary-orange" : "border-transparent text-text-primary/55 hover:text-text-primary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <PopupResults key={filter} filter={filter} />
    </div>
  );
}

function PopupResults({ filter }: { filter: StatusFilter }) {
  const { showToast } = useToast();
  const fetcher = useCallback(() => fetchAdminWelcomePopups(filter === "all" ? undefined : filter), [filter]);
  const { data, loading, error, reload } = useAdminData(fetcher);
  const popups = data ?? [];

  const [busyId, setBusyId] = useState<string | null>(null);
  const [activateTarget, setActivateTarget] = useState<WelcomePopup | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<WelcomePopup | null>(null);
  const [activating, setActivating] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function runAction(id: string, run: () => Promise<WelcomePopup>, successMessage: string) {
    setBusyId(id);
    try {
      await run();
      reload();
      showToast(successMessage);
    } catch (requestError) {
      showToast(errorMessage(requestError, "That action could not be completed."), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmActivate() {
    if (!activateTarget) return;
    setActivating(true);
    try {
      await activateAdminWelcomePopup(activateTarget.id);
      reload();
      showToast(`"${activateTarget.name}" is now live on the homepage.`);
      setActivateTarget(null);
    } catch (requestError) {
      showToast(errorMessage(requestError, "Could not activate this popup."), "error");
    } finally {
      setActivating(false);
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveAdminWelcomePopup(archiveTarget.id);
      reload();
      showToast(`"${archiveTarget.name}" archived.`);
      setArchiveTarget(null);
    } catch (requestError) {
      showToast(errorMessage(requestError, "Could not archive this popup."), "error");
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div id="welcome-popup-results" role="status" aria-live="polite">
        <LoadingState label="Loading welcome popups…" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div id="welcome-popup-results" role="alert">
        <ErrorState message={error ?? "Could not load welcome popups."} onRetry={reload} />
      </div>
    );
  }

  return (
    <div id="welcome-popup-results" className="min-w-0">
      {popups.length === 0 ? (
        <EmptyState title="No welcome popups yet" description="Create one to greet homepage visitors with an offer." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-white">
          <ul>
            {popups.map((popup) => (
              <li key={popup.id} className="flex min-w-0 flex-wrap items-center gap-3 border-b border-border-subtle/70 px-4 py-3 last:border-b-0">
                <div className="min-w-48 flex-1">
                  <Link href={`/admin/welcome-popups/${popup.id}/edit`} className="font-medium text-text-primary hover:text-primary-orange">
                    {popup.name}
                  </Link>
                  <p className="break-words text-xs text-text-primary/50">
                    {TEMPLATE_LABEL[popup.template]} · {popup.heading}
                  </p>
                </div>

                <span className={`inline-flex w-24 shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[popup.status]}`}>
                  {STATUS_LABEL[popup.status]}
                </span>

                {popup.isHomepageActive && (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-primary-orange px-2.5 py-1 text-xs font-semibold text-white">Live</span>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {popup.status === "draft" && (
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => runAction(popup.id, () => publishAdminWelcomePopup(popup.id), `"${popup.name}" published.`)}
                      className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold hover:bg-cream-bg disabled:opacity-50"
                    >
                      Publish
                    </button>
                  )}
                  {popup.status === "published" && !popup.isHomepageActive && (
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => setActivateTarget(popup)}
                      className="rounded-lg bg-primary-orange px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Activate
                    </button>
                  )}
                  {popup.isHomepageActive && (
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => runAction(popup.id, () => deactivateAdminWelcomePopup(popup.id), `"${popup.name}" removed from the homepage.`)}
                      className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold hover:bg-cream-bg disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => runAction(popup.id, () => duplicateAdminWelcomePopup(popup.id), `Duplicated "${popup.name}" as a new draft.`)}
                    className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold hover:bg-cream-bg disabled:opacity-50"
                  >
                    Duplicate
                  </button>
                  {popup.status !== "archived" && (
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => setArchiveTarget(popup)}
                      className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-terracotta hover:bg-terracotta/5 disabled:opacity-50"
                    >
                      Archive
                    </button>
                  )}
                  <Link
                    href={`/admin/welcome-popups/${popup.id}/edit`}
                    aria-label={`Edit ${popup.name}`}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-primary/60 hover:bg-cream-bg hover:text-text-primary"
                  >
                    <PencilIcon aria-hidden="true" width={15} height={15} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(activateTarget)}
        onClose={() => setActivateTarget(null)}
        onConfirm={confirmActivate}
        title="Activate this popup on the homepage?"
        description={`Only one popup can be active at a time. This will immediately replace whichever popup is currently showing on the homepage with "${activateTarget?.name}".`}
        confirmLabel="Activate"
        destructive={false}
        loading={activating}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        title="Archive this popup?"
        description={`"${archiveTarget?.name}" will stop being available to activate. ${archiveTarget?.isHomepageActive ? "It is currently live on the homepage and will be removed immediately." : ""}`}
        confirmLabel="Archive"
        loading={archiving}
      />
    </div>
  );
}
