"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { deleteAdminReview, getAdminReview, updateAdminReview, updateAdminReviewStatus } from "@/lib/api/admin-review-api";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { StatusBadge } from "../ui/status-badge";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ADMIN_INPUT_CLASS } from "../ui/form-field";
import { useToast } from "../ui/toast";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ReviewDetailView({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const fetcher = useCallback(() => getAdminReview(reviewId), [reviewId]);
  const { data: review, loading, error, reload } = useAdminData(fetcher);
  const [updating, setUpdating] = useState<"approved" | "rejected" | "pending" | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ rating: 5, title: "", review: "" });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function startEditing() {
    if (!review) return;
    setDraft({ rating: review.rating, title: review.title ?? "", review: review.review });
    setEditing(true);
  }

  async function handleStatus(status: "approved" | "rejected" | "pending") {
    if (!review) return;
    setUpdating(status);
    try {
      await updateAdminReviewStatus(review.id, status);
      showToast(status === "approved" ? "Review approved." : status === "rejected" ? "Review rejected." : "Review set back to pending.");
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update this review.", "error");
    } finally {
      setUpdating(null);
    }
  }

  async function saveEdits() {
    if (!review) return;
    if (!draft.review.trim()) { showToast("Review content is required.", "error"); return; }
    setSaving(true);
    try {
      await updateAdminReview(review.id, { rating: draft.rating, title: draft.title.trim() || null, review: draft.review.trim() });
      showToast("Review updated.");
      setEditing(false);
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update this review.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!review) return;
    setDeleting(true);
    try {
      await deleteAdminReview(review.id);
      showToast("Review deleted.");
      router.push("/admin/product-reviews");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete this review.", "error");
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState label="Loading review…" />;
  if (error || !review) return <ErrorState message={error ?? "Review not found."} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/product-reviews" className="text-xs font-semibold text-primary-orange hover:underline">
            &larr; Back to reviews
          </Link>
          <h1 className="mt-1 text-xl font-bold text-text-primary">{review.title || "Untitled review"}</h1>
          <p className="mt-1 text-sm text-text-primary/60">
            <Link href={`/admin/products/${review.productId}/edit`} className="font-medium text-primary-orange hover:underline">
              {review.productName}
            </Link>{" "}
            · {review.customerName} · Submitted {formatDateTime(review.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${review.reviewSource === "admin" ? "text-text-primary/70" : "text-text-primary/50"}`}>
            {review.reviewSource === "admin" ? "Admin-created" : "Customer"}
          </span>
          <StatusBadge status={review.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {!editing ? (
            <>
              <div className="rounded-xl border border-border-subtle bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-text-primary">Rating</h2>
                  <button type="button" onClick={startEditing} className="text-xs font-semibold text-primary-orange hover:underline">
                    Edit
                  </button>
                </div>
                <p className="mt-2 text-lg" aria-label={`${review.rating} out of 5 stars`}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </p>
              </div>

              <div className="rounded-xl border border-border-subtle bg-white p-5">
                <h2 className="text-sm font-semibold text-text-primary">Review</h2>
                {review.title && <p className="mt-2 text-sm font-semibold text-text-primary">{review.title}</p>}
                <p className="mt-2 whitespace-pre-line text-sm text-text-primary/80">{review.review}</p>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border-subtle bg-white p-5">
              <h2 className="text-sm font-semibold text-text-primary">Edit review</h2>
              <div className="mt-3 flex flex-col gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold text-text-primary">Rating</span>
                  <select
                    value={draft.rating}
                    onChange={(e) => setDraft((d) => ({ ...d, rating: Number(e.target.value) }))}
                    className={ADMIN_INPUT_CLASS}
                  >
                    {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star{r === 1 ? "" : "s"}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold text-text-primary">Title (optional)</span>
                  <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} maxLength={160} className={ADMIN_INPUT_CLASS} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold text-text-primary">Review</span>
                  <textarea value={draft.review} onChange={(e) => setDraft((d) => ({ ...d, review: e.target.value }))} rows={5} maxLength={5000} className={`${ADMIN_INPUT_CLASS} resize-y`} />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={saveEdits} disabled={saving} className="rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={() => { setEditing(false); setDraft({ rating: review.rating, title: review.title ?? "", review: review.review }); }} disabled={saving} className="rounded-lg border border-border-subtle px-3.5 py-2 text-sm font-semibold text-text-primary hover:bg-cream-bg">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Moderation</h2>
            <p className="mt-1 text-xs text-text-primary/50">
              Moderating changes only whether this review is publicly visible — the customer&apos;s own text is never rewritten here.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleStatus("approved")}
                disabled={updating !== null || review.status === "approved"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {updating === "approved" ? "Approving…" : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => handleStatus("rejected")}
                disabled={updating !== null || review.status === "rejected"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3.5 py-2 text-sm font-semibold text-text-primary hover:bg-cream-bg disabled:opacity-50"
              >
                {updating === "rejected" ? "Rejecting…" : "Reject"}
              </button>
              {review.status !== "pending" && (
                <button
                  type="button"
                  onClick={() => handleStatus("pending")}
                  disabled={updating !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3.5 py-2 text-sm font-semibold text-text-primary hover:bg-cream-bg disabled:opacity-50"
                >
                  {updating === "pending" ? "Reverting…" : "Set back to pending"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Customer</h2>
            <dl className="mt-3 flex flex-col gap-2.5 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">Name</dt>
                <dd className="text-text-primary">{review.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">Email</dt>
                <dd className="text-text-primary">{review.customerEmail ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">Source</dt>
                <dd className="text-text-primary">{review.reviewSource === "admin" ? "Admin-created" : "Customer-submitted"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">Verified Purchase</dt>
                <dd className="text-text-primary">{review.verifiedPurchase ? "Yes — eligibility-verified at submission" : "No"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">Last updated</dt>
                <dd className="text-text-primary">{formatDateTime(review.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-terracotta/30 bg-white p-5">
            <h2 className="text-sm font-semibold text-terracotta">Danger zone</h2>
            <p className="mt-1 text-xs text-text-primary/50">Permanently removes this review. This cannot be undone.</p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="mt-3 rounded-lg border border-terracotta px-3.5 py-2 text-sm font-semibold text-terracotta hover:bg-terracotta/10"
            >
              Delete review
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete review?"
        description="This permanently removes the review. This cannot be undone."
        confirmLabel="Delete review"
        loading={deleting}
      />
    </div>
  );
}
