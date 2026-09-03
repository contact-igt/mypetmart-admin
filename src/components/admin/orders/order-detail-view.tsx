"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useAdminAuth } from "@/context/admin-auth-context";
import { addAdminOrderNote, getAdminOrder, updateAdminOrderShippingAddress, updateAdminOrderStatus, type OrderStatus, type UpdateOrderShippingAddressInput } from "@/lib/api/admin-order-api";
import { getValidNextOrderStatuses, isDestructiveOrderTransition } from "@/data/admin/order-status-rules";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { StatusBadge } from "../ui/status-badge";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { ReturnIcon } from "@/components/icons";
import { ShipmentPanel } from "@/components/admin/shipments/shipment-panel";
import { CourierSelectionDialog } from "@/components/admin/shipments/courier-selection-dialog";
import { EditShippingAddressDialog } from "@/components/admin/orders/edit-shipping-address-dialog";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatMoney(amount: string, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(Number(amount));
  } catch {
    return `${currencyCode} ${amount}`;
  }
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const { showToast } = useToast();
  const { user } = useAdminAuth();
  const fetcher = useCallback(() => getAdminOrder(orderId), [orderId]);
  const { data: order, loading, error, reload } = useAdminData(fetcher);

  // ---- order status ----
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [confirmingStatus, setConfirmingStatus] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  function requestStatusUpdate() {
    if (!nextStatus) return;
    if (isDestructiveOrderTransition(nextStatus)) {
      setConfirmingStatus(true);
    } else {
      applyStatusUpdate();
    }
  }

  async function applyStatusUpdate() {
    if (!nextStatus || !order) return;
    setUpdatingStatus(true);
    try {
      await updateAdminOrderStatus(order.id, nextStatus);
      showToast(`Order marked as ${nextStatus.replace(/_/g, " ")}.`);
      setNextStatus("");
      setConfirmingStatus(false);
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update the order status.", "error");
    } finally {
      setUpdatingStatus(false);
    }
  }

  // ---- internal notes ----
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  // Courier Selection Dialog owns the quote → select → confirm → book flow
  // itself (see courier-selection-dialog.tsx); this page just opens it.
  const [selectingCourier, setSelectingCourier] = useState(false);

  // ---- delivery address (Order's own shipping snapshot — never the
  // customer's saved Address book) ----
  const [editingAddress, setEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  async function handleUpdateAddress(input: UpdateOrderShippingAddressInput) {
    if (!order) return;
    setSavingAddress(true);
    try {
      await updateAdminOrderShippingAddress(order.id, input);
      setEditingAddress(false);
      showToast("Address updated successfully. You can now retry shipment.");
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update the delivery address.", "error");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleAddNote(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim() || !order) return;
    setAddingNote(true);
    try {
      await addAdminOrderNote(order.id, note.trim());
      setNote("");
      reload();
    } catch {
      showToast("Could not add the note.", "error");
    } finally {
      setAddingNote(false);
    }
  }

  if (loading) return <LoadingState label="Loading order…" />;
  if (error || !order) return <ErrorState message={error ?? "Order not found."} onRetry={reload} />;

  const hasCodPayment = order.payments.some((payment) => payment.provider.toLowerCase() === "cod");
  const paymentPendingForOnlineOrder = order.paymentStatus !== "paid" && !hasCodPayment;
  const paidCancellationRestricted = order.paymentStatus === "paid" && user?.role !== "super_admin" && getValidNextOrderStatuses(order.status).includes("cancelled");
  const statusOptions = getValidNextOrderStatuses(order.status).filter((next) => {
    if (next === "cancelled" && order.paymentStatus === "paid" && user?.role !== "super_admin") return false;
    if (["confirmed", "processing", "shipped", "delivered"].includes(next) && paymentPendingForOnlineOrder) return false;
    return true;
  });
  const paymentAttempts = [...order.payments].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  // Derived purely from real persisted timestamps — no synthetic/fabricated
  // history. Payment/fulfilment/shipment milestones will extend this once
  // those modules exist.
  const timeline = [
    { id: "placed", label: "Order placed", at: order.placedAt },
    ...(order.cancelledAt ? [{ id: "cancelled", label: "Order cancelled", at: order.cancelledAt }] : [])
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-xs font-semibold text-primary-orange hover:underline">
            &larr; Back to orders
          </Link>
          <h1 className="mt-1 text-xl font-bold text-text-primary">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-text-primary/60">Placed {formatDateTime(order.placedAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.fulfilmentStatus} />
          <StatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {paymentPendingForOnlineOrder && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-50 px-4 py-3 text-sm text-text-primary" role="status">
          <p className="font-semibold">Pending {paymentAttempts[0]?.provider ?? "online"} payment</p>
          <p className="mt-1 text-xs text-text-primary/70">Fulfilment cannot start until payment is confirmed. The backend will enforce this rule as well.</p>
        </div>
      )}

      {order.returns.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-sm">
          <ReturnIcon width={15} height={15} className="shrink-0 text-terracotta" />
          <span className="text-text-primary">
            {order.returns.length} return/replacement request{order.returns.length === 1 ? "" : "s"} linked to this order:
          </span>
          {order.returns.map((r) => (
            <Link key={r.id} href={`/admin/returns/${r.id}`} className="font-semibold text-terracotta hover:underline">
              {r.type === "return" ? "Return" : "Replacement"} — {r.status}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Items</h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">{item.productName}</p>
                    <p className="truncate text-xs text-text-primary/50">
                      SKU {item.variantSku ?? item.productSku}
                      {item.variantName ? ` · ${item.variantName}` : ""} · Qty {item.quantity} · {formatMoney(item.unitPrice, order.currency)} each
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-text-primary">{formatMoney(item.lineTotal, order.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-1 border-t border-border-subtle pt-3 text-sm">
              <div className="flex justify-between text-text-primary/70">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between text-text-primary/70">
                <span>Shipping</span>
                <span>{Number(order.shippingFee) === 0 ? "Free (V1 fixed rate — pending shipping integration)" : formatMoney(order.shippingFee, order.currency)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-text-primary">
                <span>Total</span>
                <span>{formatMoney(order.total, order.currency)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-border-subtle bg-white p-5">
              <h2 className="text-sm font-semibold text-text-primary">Customer</h2>
              {order.customer ? (
                <div className="mt-2">
                  <Link href={`/admin/customers/${order.customer.id}`} className="block text-sm font-medium text-primary-orange hover:underline">
                    {order.customer.name}
                  </Link>
                  <p className="mt-1 text-xs text-text-primary/55">{order.customer.email}</p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-sm font-medium text-text-primary/70">Guest order</p>
                  <p className="mt-1 text-xs text-text-primary/55">{order.contactEmail || "No contact email provided"}</p>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">Delivery address</p>
                <button type="button" onClick={() => setEditingAddress(true)} className="text-xs font-semibold text-primary-orange hover:underline">
                  Edit
                </button>
              </div>
              <p className="mt-1 text-sm text-text-primary/80">{order.shippingAddress.recipientName}</p>
              <p className="text-sm text-text-primary/80">{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p className="text-sm text-text-primary/80">{order.shippingAddress.line2}</p>}
              <p className="mt-1 text-xs text-text-primary/50">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}, {order.shippingAddress.country}
              </p>
              <p className="mt-1 text-xs text-text-primary/50">{order.shippingAddress.phone}</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-white p-5">
              <h2 className="text-sm font-semibold text-text-primary">Payment attempts</h2>
              {order.commerceException && (
                <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  Payment captured, but this order needs manual review ({order.commerceException.replace(/_/g, " ")}) before it can
                  be confirmed for fulfilment.
                </p>
              )}
              {order.payments.length === 0 ? (
                <p className="mt-2 text-sm text-text-primary/55">No payment recorded yet.</p>
              ) : (
                <div className="mt-2 flex flex-col gap-3 text-sm">
                  {paymentAttempts.map((payment, index) => (
                    <div key={payment.id} className="rounded-lg border border-border-subtle p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary">
                          {payment.provider === "cod" ? "Cash on Delivery" : payment.provider}
                          {payment.method && payment.method !== "cod" ? ` · ${payment.method}` : ""}
                          {index === 0 ? " · Latest attempt" : ""}
                        </span>
                        <StatusBadge status={payment.status} />
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-text-primary/70">
                        <dt>Amount</dt>
                        <dd className="text-right">{formatMoney(payment.amount, payment.currency)}</dd>
                        <dt>Merchant txnid</dt>
                        <dd className="text-right font-mono">{payment.providerOrderId ?? "—"}</dd>
                        <dt>Provider payment ID</dt>
                        <dd className="text-right font-mono">{payment.providerPaymentId ?? "—"}</dd>
                        <dt>Created</dt>
                        <dd className="text-right">{formatDateTime(payment.createdAt)}</dd>
                        {payment.paidAt && (
                          <>
                            <dt>Paid</dt>
                            <dd className="text-right">{formatDateTime(payment.paidAt)}</dd>
                          </>
                        )}
                        {payment.failedAt && (
                          <>
                            <dt>Failed</dt>
                            <dd className="text-right">{formatDateTime(payment.failedAt)}</dd>
                          </>
                        )}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">Order payment status</span>
                <StatusBadge status={order.paymentStatus} />
              </div>
              {hasCodPayment && order.paymentStatus !== "paid" && (
                <p className="mt-2 text-xs font-semibold text-text-primary/70">Cash on Delivery · Payment due on delivery.</p>
              )}
              <p className="mt-2 text-xs text-text-primary/50">
                Read-only — payment status is provider-authoritative (verified via PayU webhook/Verify Payment API, or set at Cash
                on Delivery confirmation); it cannot be hand-set here.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Shipping &amp; fulfilment</h2>
            <div className="mt-3"><ShipmentPanel shipment={order.shipment ?? order.shipments.find((shipment) => shipment.sourceType === "order")} onChanged={reload} onEditAddress={() => setEditingAddress(true)} /></div>
            {!order.shipment && !order.shipments.some((shipment) => shipment.sourceType === "order") && (order.paymentStatus === "paid" || order.payments.some((payment) => payment.provider === "cod")) && order.status === "confirmed" && !order.commerceException && (
              <button type="button" onClick={() => setSelectingCourier(true)} className="mt-3 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50">Create shipment</button>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">Fulfilment status</span>
              <StatusBadge status={order.fulfilmentStatus} />
            </div>
          </div>

          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Order status</h2>
            {paidCancellationRestricted && (
              <p className="mt-2 text-xs text-text-primary/60">Cancelling a paid order requires a super admin because it initiates a refund.</p>
            )}
            {statusOptions.length === 0 ? (
              <p className="mt-2 text-sm text-text-primary/55">
                {order.status === "cancelled" ? "This order is cancelled — no further changes are possible." : "This order has an open return request — no further status changes are possible here."}
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                  aria-label="New order status"
                  className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
                >
                  <option value="">Choose a status…</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={requestStatusUpdate}
                  disabled={!nextStatus || updatingStatus}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {updatingStatus ? "Updating…" : "Update"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Timeline</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {timeline.map((event) => (
                <li key={event.id} className="flex gap-2.5 text-sm">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-orange" />
                  <div>
                    <p className="font-medium text-text-primary">{event.label}</p>
                    <p className="text-xs text-text-primary/50">{formatDateTime(event.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Internal notes</h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {order.notes.length === 0 && <li className="text-sm text-text-primary/50">No notes yet.</li>}
              {order.notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-cream-bg px-3 py-2 text-sm">
                  <p className="text-text-primary">{n.message}</p>
                  <p className="mt-1 text-xs text-text-primary/45">
                    {n.authorName} · {formatDateTime(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddNote} className="mt-3 flex flex-col gap-2">
              <label htmlFor="order-note" className="sr-only">
                Add internal note
              </label>
              <textarea
                id="order-note"
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

      <ConfirmDialog
        open={confirmingStatus}
        onClose={() => setConfirmingStatus(false)}
        onConfirm={applyStatusUpdate}
        title={nextStatus === "cancelled" ? "Cancel this order?" : "Mark as return requested?"}
        description={
          nextStatus === "cancelled"
            ? "This marks the order as cancelled. Stock, refund, and shipment cancellation are not yet automated — handle those manually until the Payment/Shipping stages exist."
            : "This marks the order as return requested and records it on the timeline."
        }
        confirmLabel={nextStatus === "cancelled" ? "Cancel order" : "Confirm"}
        loading={updatingStatus}
      />

      <EditShippingAddressDialog
        open={editingAddress}
        onClose={() => setEditingAddress(false)}
        onSubmit={handleUpdateAddress}
        address={order.shippingAddress}
        saving={savingAddress}
      />

      <CourierSelectionDialog
        open={selectingCourier}
        onClose={() => setSelectingCourier(false)}
        orderId={order.id}
        onCreated={() => {
          showToast("Shipment created.");
          reload();
        }}
      />
    </div>
  );
}
