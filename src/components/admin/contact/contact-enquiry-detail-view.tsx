"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { fetchAdminContactEnquiry, updateAdminContactEnquiry, type ContactEnquiry, type ContactEnquiryStatus } from "@/lib/api/admin-contact-api";
import { AdminApiError } from "@/lib/api/admin-api-client";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { StatusBadge } from "../ui/status-badge";
import { useToast } from "../ui/toast";

const STATUSES: ContactEnquiryStatus[] = ["new", "in_progress", "resolved", "closed"];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ContactEnquiryDetailView({ enquiryId }: { enquiryId: string }) {
  const { showToast } = useToast();
  const fetcher = useCallback(() => fetchAdminContactEnquiry(enquiryId), [enquiryId]);
  const { data: enquiry, loading, error, reload } = useAdminData(fetcher);

  const [status, setStatus] = useState<ContactEnquiryStatus>("new");
  const [note, setNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Synchronous render-phase sync when the fetched enquiry (re)loads —
  // avoids the cascading-render effect pattern for deriving local edit
  // state from fetched data (same pattern used in product-form.tsx).
  const [prevEnquiry, setPrevEnquiry] = useState<ContactEnquiry | null>(null);
  if (enquiry && enquiry !== prevEnquiry) {
    setPrevEnquiry(enquiry);
    setStatus(enquiry.status);
    setNote(enquiry.adminNote ?? "");
  }

  async function handleStatusChange(next: ContactEnquiryStatus) {
    if (!enquiry || savingStatus || next === status) return;
    setSavingStatus(true);
    const previous = status;
    setStatus(next);
    try {
      await updateAdminContactEnquiry(enquiryId, { status: next });
      showToast("Status updated.");
      reload();
    } catch (err) {
      setStatus(previous);
      showToast(err instanceof AdminApiError ? err.message : "Could not update the status.", "error");
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSaveNote() {
    if (!enquiry || savingNote) return;
    setSavingNote(true);
    try {
      await updateAdminContactEnquiry(enquiryId, { adminNote: note.trim() });
      showToast("Internal note saved.");
      reload();
    } catch (err) {
      showToast(err instanceof AdminApiError ? err.message : "Could not save the note.", "error");
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) return <LoadingState label="Loading enquiry…" />;
  if (error || !enquiry) return <ErrorState message={error ?? "Enquiry not found."} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/contact-enquiries" className="text-xs font-semibold text-primary-orange hover:underline">
            &larr; Back to contact enquiries
          </Link>
          <h1 className="mt-1 text-xl font-bold text-text-primary">{enquiry.enquiryNumber}</h1>
          <p className="mt-1 text-sm text-text-primary/60">Received {formatDateTime(enquiry.createdAt)}</p>
        </div>
        <StatusBadge status={enquiry.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Customer</h2>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-text-primary/50">Name</dt>
                <dd className="text-text-primary">{enquiry.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-primary/50">Email</dt>
                <dd className="text-text-primary">{enquiry.email}</dd>
              </div>
              {enquiry.phone && (
                <div>
                  <dt className="text-xs text-text-primary/50">Phone</dt>
                  <dd className="text-text-primary">{enquiry.phone}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Enquiry</h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-text-primary/50">Subject</dt>
                <dd className="text-text-primary">{enquiry.subject}</dd>
              </div>
              {enquiry.orderNumber && (
                <div>
                  <dt className="text-xs text-text-primary/50">Order #</dt>
                  <dd className="font-mono text-text-primary">{enquiry.orderNumber}</dd>
                </div>
              )}
            </dl>
            <div className="mt-3">
              <dt className="text-xs text-text-primary/50">Message</dt>
              <dd className="mt-1 whitespace-pre-line text-sm text-text-primary">{enquiry.message}</dd>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Status</h2>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as ContactEnquiryStatus)}
              disabled={savingStatus}
              aria-label="Update enquiry status"
              className="mt-3 h-9 w-full rounded-lg border border-border-subtle bg-white px-3 text-sm capitalize focus-visible:border-primary-orange disabled:opacity-50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Internal note</h2>
            <p className="mt-1 text-xs text-text-primary/50">Never shown to the customer.</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="Add an internal note…"
              className="mt-3 w-full resize-none rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm focus-visible:border-primary-orange"
            />
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={savingNote || note === (enquiry.adminNote ?? "")}
              className="mt-2 self-end rounded-lg border border-border-subtle px-3.5 py-1.5 text-xs font-semibold text-text-primary hover:bg-cream-bg disabled:opacity-50"
            >
              {savingNote ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
