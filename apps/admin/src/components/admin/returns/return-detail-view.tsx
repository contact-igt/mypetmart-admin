"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { adminRepository } from "@/data/admin/mock-repository";
import type { ReturnStatus } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { StatusBadge } from "../ui/status-badge";
import { useToast } from "../ui/toast";
import { ImagePlaceholder } from "@/components/image-placeholder";
import { ArrowRightIcon } from "@/components/icons";

const STATUSES: ReturnStatus[] = ["requested", "approved", "rejected", "resolved"];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ReturnDetailView({ returnId }: { returnId: string }) {
  const { showToast } = useToast();
  const fetcher = useCallback(() => adminRepository.getReturn(returnId), [returnId]);
  const { data: request, loading, error, reload } = useAdminData(fetcher);

  const [nextStatus, setNextStatus] = useState<ReturnStatus | "">("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  async function handleUpdate() {
    if (!nextStatus || !request) return;
    setUpdating(true);
    try {
      await adminRepository.updateReturnStatus(request.id, nextStatus, resolutionNote.trim() || undefined);
      showToast(`Marked as ${nextStatus}.`);
      setNextStatus("");
      setResolutionNote("");
      reload();
    } catch {
      showToast("Could not update this request.", "error");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddNote(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim() || !request) return;
    setAddingNote(true);
    try {
      await adminRepository.addReturnNote(request.id, note.trim());
      setNote("");
      reload();
    } catch {
      showToast("Could not add the note.", "error");
    } finally {
      setAddingNote(false);
    }
  }

  if (loading) return <LoadingState label="Loading request…" />;
  if (error || !request) return <ErrorState message={error ?? "Request not found."} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/returns" className="text-xs font-semibold text-primary-orange hover:underline">
            &larr; Back to returns
          </Link>
          <h1 className="mt-1 text-xl font-bold text-text-primary capitalize">
            {request.type} — {request.productName}
          </h1>
          <p className="mt-1 text-sm text-text-primary/60">
            Order{" "}
            <Link href={`/admin/orders/${request.orderId}`} className="font-medium text-primary-orange hover:underline">
              {request.orderNumber}
            </Link>{" "}
            · {request.customerName} · requested {formatDateTime(request.requestedAt)}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Reason</h2>
            <p className="mt-2 text-sm text-text-primary/80">{request.reason}</p>
          </div>

          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Evidence</h2>
            {request.evidenceImageLabel ? (
              <div className="mt-3 max-w-xs">
                <ImagePlaceholder label={request.evidenceImageLabel} tone="cream" className="aspect-square w-full" />
              </div>
            ) : (
              <p className="mt-2 text-sm text-text-primary/50">No photo evidence was submitted with this request.</p>
            )}
          </div>

          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Resolution</h2>
            <p className="mt-1 text-xs text-text-primary/50">
              Manual review only — approving or resolving here does not trigger a refund or pickup; those remain
              outside this demo&apos;s scope.
            </p>
            {request.resolutionNote && (
              <p className="mt-3 rounded-lg bg-cream-bg px-3 py-2 text-sm text-text-primary">{request.resolutionNote}</p>
            )}
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as ReturnStatus)}
                  aria-label="New request status"
                  className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
                >
                  <option value="">Choose a status…</option>
                  {STATUSES.filter((s) => s !== request.status).map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={!nextStatus || updating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {updating ? "Updating…" : "Update"} <ArrowRightIcon width={13} height={13} />
                </button>
              </div>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={2}
                placeholder="Resolution note (optional, shown to future reviewers)…"
                className="resize-none rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm focus-visible:border-primary-orange"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-5">
          <h2 className="text-sm font-semibold text-text-primary">Internal notes</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {request.notes.length === 0 && <li className="text-sm text-text-primary/50">No notes yet.</li>}
            {request.notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-cream-bg px-3 py-2 text-sm">
                <p className="text-text-primary">{n.message}</p>
                <p className="mt-1 text-xs text-text-primary/45">
                  {n.author} · {formatDateTime(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddNote} className="mt-3 flex flex-col gap-2">
            <label htmlFor="return-note" className="sr-only">
              Add internal note
            </label>
            <textarea
              id="return-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add an internal note…"
              className="resize-none rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm focus-visible:border-primary-orange"
            />
            <button
              type="submit"
              disabled={!note.trim() || addingNote}
              className="self-end rounded-lg border border-border-subtle px-3.5 py-1.5 text-xs font-semibold text-text-primary hover:bg-cream-bg disabled:opacity-50"
            >
              {addingNote ? "Adding…" : "Add note"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
