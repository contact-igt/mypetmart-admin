"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminRepository } from "@/data/admin/mock-repository";
import {
  getValidNextFulfilmentStatuses,
  getValidNextOrderStatuses,
  getValidNextPaymentStatuses,
  isDestructiveOrderTransition,
} from "@/data/admin/order-status-rules";
import type { FulfilmentStatus, Order, OrderStatus, PaymentStatus, ReturnRequest, ShippingMethod } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { StatusBadge } from "../ui/status-badge";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ADMIN_INPUT_CLASS } from "../ui/form-field";
import { useToast } from "../ui/toast";
import { ArrowRightIcon, MailIcon, PhoneIcon, ReturnIcon } from "@/components/icons";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const CARRIERS = ["Blue Dart", "Delhivery", "India Post", "Ecom Express"];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const { showToast } = useToast();
  const fetcher = useCallback(() => adminRepository.getOrder(orderId), [orderId]);
  const { data: order, loading, error, reload } = useAdminData(fetcher);

  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  useEffect(() => {
    adminRepository.getReturnsForOrder(orderId).then(setReturns);
  }, [orderId]);

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
      await adminRepository.updateOrderStatus(order.id, nextStatus);
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

  // ---- fulfilment status ----
  const [nextFulfilment, setNextFulfilment] = useState<FulfilmentStatus | "">("");
  const [updatingFulfilment, setUpdatingFulfilment] = useState(false);

  async function applyFulfilmentUpdate() {
    if (!nextFulfilment || !order) return;
    setUpdatingFulfilment(true);
    try {
      await adminRepository.updateOrderFulfilmentStatus(order.id, nextFulfilment);
      showToast(`Fulfilment marked as ${nextFulfilment}.`);
      setNextFulfilment("");
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update fulfilment.", "error");
    } finally {
      setUpdatingFulfilment(false);
    }
  }

  // ---- payment status ----
  const [nextPayment, setNextPayment] = useState<PaymentStatus | "">("");
  const [updatingPayment, setUpdatingPayment] = useState(false);

  async function applyPaymentUpdate() {
    if (!nextPayment || !order) return;
    setUpdatingPayment(true);
    try {
      await adminRepository.updateOrderPaymentStatus(order.id, nextPayment);
      showToast(`Payment marked as ${nextPayment}.`);
      setNextPayment("");
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update payment status.", "error");
    } finally {
      setUpdatingPayment(false);
    }
  }

  // ---- internal notes ----
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  async function handleAddNote(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim() || !order) return;
    setAddingNote(true);
    try {
      await adminRepository.addOrderNote(order.id, note.trim());
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

  const statusOptions = getValidNextOrderStatuses(order.status);
  const fulfilmentOptions = getValidNextFulfilmentStatuses(order.fulfilmentStatus);
  const paymentOptions = getValidNextPaymentStatuses(order.paymentStatus);

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

      {returns.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-sm">
          <ReturnIcon width={15} height={15} className="shrink-0 text-terracotta" />
          <span className="text-text-primary">
            {returns.length} return/replacement request{returns.length === 1 ? "" : "s"} linked to this order:
          </span>
          {returns.map((r) => (
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
                <li key={`${item.productId}-${item.sku}`} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">{item.name}</p>
                    <p className="truncate text-xs text-text-primary/50">
                      SKU {item.sku}
                      {item.variantLabel ? ` · ${item.variantLabel}` : ""} · Qty {item.quantity} · {currency.format(item.price)} each
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-text-primary">{currency.format(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-1 border-t border-border-subtle pt-3 text-sm">
              <div className="flex justify-between text-text-primary/70">
                <span>Subtotal</span>
                <span>{currency.format(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-text-primary/70">
                <span>Shipping</span>
                <span>{order.shippingFee === 0 ? "Free" : currency.format(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-text-primary">
                <span>Total</span>
                <span>{currency.format(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-border-subtle bg-white p-5">
              <h2 className="text-sm font-semibold text-text-primary">Customer</h2>
              <Link href={`/admin/customers/${order.customerId}`} className="mt-2 block text-sm font-medium text-primary-orange hover:underline">
                {order.customerName}
              </Link>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-primary/50">Delivery address</p>
              <p className="mt-1 text-sm text-text-primary/80">{order.shippingAddress}</p>
              <p className="mt-1 text-xs text-text-primary/50">
                {order.city}, {order.state}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border-subtle pt-3">
                <button
                  type="button"
                  onClick={() => showToast("Email integration required — not connected yet.", "info")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg"
                >
                  <MailIcon width={13} height={13} /> Email customer
                </button>
                <button
                  type="button"
                  onClick={() => showToast("SMS/WhatsApp integration required — not connected yet.", "info")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg"
                >
                  <PhoneIcon width={13} height={13} /> SMS customer
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-border-subtle bg-white p-5">
              <h2 className="text-sm font-semibold text-text-primary">Payment</h2>
              <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-primary/60">Method</dt>
                  <dd className="font-medium text-text-primary">{order.paymentMethod}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-primary/60">Status</dt>
                  <dd>
                    <StatusBadge status={order.paymentStatus} />
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-text-primary/50">Demo status only — no live payment capture or refund is triggered.</p>
              {paymentOptions.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
                  <select
                    value={nextPayment}
                    onChange={(e) => setNextPayment(e.target.value as PaymentStatus)}
                    aria-label="New payment status"
                    className={`${ADMIN_INPUT_CLASS} h-9 flex-1`}
                  >
                    <option value="">Change payment status…</option>
                    {paymentOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={applyPaymentUpdate}
                    disabled={!nextPayment || updatingPayment}
                    className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-primary hover:bg-cream-bg disabled:opacity-50"
                  >
                    {updatingPayment ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Shipping &amp; fulfilment</h2>
            <p className="mt-1 text-xs text-text-primary/50">Carrier and tracking are demo fields — no live courier API is connected.</p>
            <ShippingDetailsForm order={order} onSaved={reload} />

            {fulfilmentOptions.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">Fulfilment</span>
                <select
                  value={nextFulfilment}
                  onChange={(e) => setNextFulfilment(e.target.value as FulfilmentStatus)}
                  aria-label="New fulfilment status"
                  className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
                >
                  <option value="">Choose a status…</option>
                  {fulfilmentOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={applyFulfilmentUpdate}
                  disabled={!nextFulfilment || updatingFulfilment}
                  className="rounded-lg bg-primary-orange px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {updatingFulfilment ? "Updating…" : "Update"}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Order status</h2>
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
                  {updatingStatus ? "Updating…" : "Update"} <ArrowRightIcon width={13} height={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Timeline</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {order.timeline.map((event) => (
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
                    {n.author} · {formatDateTime(n.createdAt)}
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
            ? "This marks the order as cancelled. This can't be undone in the demo."
            : "This marks the order as return requested and records it on the timeline."
        }
        confirmLabel={nextStatus === "cancelled" ? "Cancel order" : "Confirm"}
        loading={updatingStatus}
      />
    </div>
  );
}

/**
 * Owns its own form state, initialised directly from `order` — safe because
 * this only ever mounts after OrderDetailView's loading/error guards have
 * already confirmed `order` is loaded, and the only thing that changes
 * shippingMethod/carrier/trackingNumber is this form's own save action. No
 * reset effect needed (see category-form-dialog.tsx for the same pattern).
 */
function ShippingDetailsForm({ order, onSaved }: { order: Order; onSaved: () => void }) {
  const { showToast } = useToast();
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>(order.shippingMethod);
  const [carrier, setCarrier] = useState(order.carrier);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await adminRepository.updateOrderShippingDetails(order.id, { shippingMethod, carrier, trackingNumber });
      showToast("Shipping details saved.");
      onSaved();
    } catch {
      showToast("Could not save shipping details.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary/60">
        Method
        <select value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value as ShippingMethod)} className={ADMIN_INPUT_CLASS}>
          <option value="standard">Standard</option>
          <option value="express">Express</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary/60">
        Carrier
        <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className={ADMIN_INPUT_CLASS}>
          <option value="">Not assigned</option>
          {CARRIERS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary/60">
        Tracking number
        <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. AWB1234IN" className={ADMIN_INPUT_CLASS} />
      </label>
      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg border border-border-subtle px-3.5 py-2 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save shipping details"}
        </button>
      </div>
    </form>
  );
}
