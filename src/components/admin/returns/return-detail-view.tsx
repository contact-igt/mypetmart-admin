"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { addAdminReturnNote, getAdminReturn, initiateAdminRefund, recheckAdminRefund, reviewAdminReturn, updateAdminReplacement } from "@/lib/api/admin-return-api";
import { useAdminAuth } from "@/context/admin-auth-context";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { StatusBadge } from "../ui/status-badge";
import { useToast } from "../ui/toast";
import { ArrowRightIcon } from "@/components/icons";
import { createReplacementShipment } from "@/lib/api/admin-shipment-api";
import { ShipmentPanel } from "@/components/admin/shipments/shipment-panel";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const REFUND_STATUS_COPY: Record<string, string> = {
  pending: "Refund initiated — awaiting confirmation from PayU.",
  processing: "PayU has queued this refund for processing.",
  succeeded: "Refund completed and confirmed by PayU.",
  failed: "Refund attempt failed — see failure detail below."
};

export function ReturnDetailView({ returnId }: { returnId: string }) {
  const { showToast } = useToast();
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const fetcher = useCallback(() => getAdminReturn(returnId), [returnId]);
  const { data: request, loading, error, reload } = useAdminData(fetcher);

  const [reviewing, setReviewing] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [initiatingRefund, setInitiatingRefund] = useState(false);
  const [recheckingRefundId, setRecheckingRefundId] = useState<number | null>(null);
  const [updatingReplacement, setUpdatingReplacement] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(false);

  async function handleReview(action: "approve" | "reject") {
    if (!request) return;
    setReviewing(true);
    try {
      await reviewAdminReturn(request.id, action, reviewNote.trim() || undefined);
      showToast(action === "approve" ? "Return approved." : "Return rejected.");
      setReviewNote("");
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update this request.", "error");
    } finally {
      setReviewing(false);
    }
  }

  async function handleAddNote(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim() || !request) return;
    setAddingNote(true);
    try {
      await addAdminReturnNote(request.id, note.trim());
      setNote("");
      reload();
    } catch {
      showToast("Could not add the note.", "error");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleInitiateRefund() {
    if (!request) return;
    setInitiatingRefund(true);
    try {
      await initiateAdminRefund(request.id);
      showToast("Refund initiated with PayU.");
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not initiate the refund.", "error");
    } finally {
      setInitiatingRefund(false);
    }
  }

  async function handleRecheckRefund(refundId: number) {
    setRecheckingRefundId(refundId);
    try {
      const result = await recheckAdminRefund(refundId);
      showToast(`Refund status: ${result.status}.`);
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not re-check this refund.", "error");
    } finally {
      setRecheckingRefundId(null);
    }
  }

  async function handleReplacementStatus(status: "processing") {
    if (!request) return;
    setUpdatingReplacement(true);
    try {
      await updateAdminReplacement(request.id, status);
      showToast("Replacement inventory allocated.");
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update the replacement.", "error");
    } finally {
      setUpdatingReplacement(false);
    }
  }

  async function handleCreateReplacementShipment() {
    if (!request?.replacement) return;
    setCreatingShipment(true);
    try { await createReplacementShipment(request.replacement.id); showToast("Replacement shipment creation started."); }
    catch (err) { showToast(err instanceof Error ? err.message : "Could not create the replacement shipment.", "error"); }
    finally { reload(); setCreatingShipment(false); }
  }

  if (loading) return <LoadingState label="Loading request…" />;
  if (error || !request) return <ErrorState message={error ?? "Request not found."} onRetry={reload} />;

  const canReview = request.status === "requested";
  const canInitiateRefund = request.resolution === "refund" && request.status === "approved" && !request.refunds.some((r) => r.status === "pending" || r.status === "processing" || r.status === "succeeded");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/returns" className="text-xs font-semibold text-primary-orange hover:underline">
            &larr; Back to returns
          </Link>
          <h1 className="mt-1 text-xl font-bold text-text-primary">
            {request.returnNumber} — {request.productName}
          </h1>
          <p className="mt-1 text-sm text-text-primary/60">
            Order{" "}
            <Link href={`/admin/orders/${request.orderId}`} className="font-medium text-primary-orange hover:underline">
              {request.orderNumber}
            </Link>{" "}
            · {request.variantName ? `${request.variantName} · ` : ""}Purchased {request.purchasedQuantity} · Requested {request.quantity} · {request.resolution} · {formatDateTime(request.requestedAt)}
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
            <h2 className="text-sm font-semibold text-text-primary">Review</h2>
            <p className="mt-1 text-xs text-text-primary/50">
              {request.resolution === "replacement"
                ? "Approving allocates the same product/variant from inventory. It never creates a refund or calls PayU."
                : "Approving does not trigger a refund by itself — refund initiation is a separate, deliberate action below."}
            </p>
            {request.resolutionNote && <p className="mt-3 rounded-lg bg-cream-bg px-3 py-2 text-sm text-text-primary">{request.resolutionNote}</p>}
            {canReview ? (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={2}
                  placeholder="Review note (optional, shown to the customer)…"
                  className="resize-none rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm focus-visible:border-primary-orange"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReview("approve")}
                    disabled={reviewing}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {reviewing ? "Working…" : request.resolution === "replacement" ? "Approve Replacement" : "Approve Refund Request"} <ArrowRightIcon width={13} height={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview("reject")}
                    disabled={reviewing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3.5 py-2 text-sm font-semibold text-text-primary hover:bg-cream-bg disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-text-primary/50">This request has already been reviewed and cannot be reviewed again.</p>
            )}
          </div>

          {request.resolution === "refund" && <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Refund</h2>
            <p className="mt-1 text-xs text-text-primary/50">Maximum refundable amount: ₹{request.maxRefundableAmount}</p>

            {request.refunds.length === 0 && !canInitiateRefund && (
              <p className="mt-3 text-xs text-text-primary/50">
                {!isSuperAdmin ? "Only a Super Admin can initiate a refund." : "The return must be approved before a refund can be initiated."}
              </p>
            )}

            {request.refunds.map((refund) => (
              <div key={refund.id} className="mt-3 rounded-lg border border-border-subtle bg-cream-bg p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-medium">{refund.refundNumber}</span>
                  <StatusBadge status={refund.status} />
                </div>
                <p className="mt-1 text-sm text-text-primary">₹{refund.amount}</p>
                <p className="mt-1 text-xs text-text-primary/60">{REFUND_STATUS_COPY[refund.status]}</p>
                {refund.failureMessage && <p className="mt-1 text-xs text-terracotta">{refund.failureMessage}</p>}
                <p className="mt-1 text-[11px] text-text-primary/45">
                  Initiated {formatDateTime(refund.initiatedAt)}
                  {refund.completedAt ? ` · Completed ${formatDateTime(refund.completedAt)}` : ""}
                </p>
                {(refund.status === "pending" || refund.status === "processing") && isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRecheckRefund(refund.id)}
                    disabled={recheckingRefundId === refund.id}
                    className="mt-2 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-white disabled:opacity-50"
                  >
                    {recheckingRefundId === refund.id ? "Checking…" : "Check Again"}
                  </button>
                )}
              </div>
            ))}
            {isSuperAdmin && canInitiateRefund && (
              <button
                type="button"
                onClick={handleInitiateRefund}
                disabled={initiatingRefund}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {initiatingRefund ? "Initiating…" : request.refunds.length > 0 ? "Retry Refund" : "Initiate Refund"} <ArrowRightIcon width={13} height={13} />
              </button>
            )}
          </div>}

          {request.resolution === "replacement" && (
            <div className="rounded-xl border border-border-subtle bg-white p-5">
              <h2 className="text-sm font-semibold text-text-primary">Replacement</h2>
              {!request.replacement && <p className="mt-2 text-xs text-text-primary/50">Approve this request to check and allocate replacement inventory.</p>}
              {request.replacement && (
                <div className="mt-3 rounded-lg border border-border-subtle bg-cream-bg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium">{request.replacement.replacementNumber}</span>
                    <StatusBadge status={request.replacement.status} />
                  </div>
                  <p className="mt-2 text-xs text-text-primary/60">Same product and variant · Qty {request.replacement.quantity}</p>
                  {request.replacement.status === "stock_unavailable" && (
                    <button
                      type="button"
                      onClick={() => handleReplacementStatus("processing")}
                      disabled={updatingReplacement}
                      className="mt-3 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {updatingReplacement ? "Checking…" : "Retry Stock Allocation"}
                    </button>
                  )}
                  <div className="mt-3"><ShipmentPanel shipment={request.replacement.shipment} onChanged={reload} /></div>
                  {request.replacement.status === "processing" && !request.replacement.shipment && (
                    <button type="button" onClick={handleCreateReplacementShipment} disabled={creatingShipment} className="mt-3 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50">{creatingShipment ? "Creating shipment…" : "Create Replacement Shipment"}</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-5">
          <h2 className="text-sm font-semibold text-text-primary">Internal notes</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {request.notes.length === 0 && <li className="text-sm text-text-primary/50">No notes yet.</li>}
            {request.notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-cream-bg px-3 py-2 text-sm">
                <p className="text-text-primary">{n.message}</p>
                <p className="mt-1 text-xs text-text-primary/45">
                  {n.authorName} · {formatDateTime(n.createdAt)}
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
