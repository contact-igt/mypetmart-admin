"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { adminRepository } from "@/data/admin/mock-repository";
import type { OrderStatus } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { StatusBadge } from "../ui/status-badge";
import { useToast } from "../ui/toast";
import { ArrowRightIcon } from "@/components/icons";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const { showToast } = useToast();
  const fetcher = useCallback(() => adminRepository.getOrder(orderId), [orderId]);
  const { data: order, loading, error, reload } = useAdminData(fetcher);

  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  async function handleStatusUpdate() {
    if (!nextStatus || !order) return;
    setUpdatingStatus(true);
    try {
      await adminRepository.updateOrderStatus(order.id, nextStatus);
      showToast(`Order marked as ${nextStatus}.`);
      setNextStatus("");
      reload();
    } catch {
      showToast("Could not update the order status.", "error");
    } finally {
      setUpdatingStatus(false);
    }
  }

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
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Items</h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {order.items.map((item) => (
                <li key={item.productId} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-text-primary">{item.name}</p>
                    <p className="text-xs text-text-primary/50">Qty {item.quantity}</p>
                  </div>
                  <span className="font-medium text-text-primary">{currency.format(item.price * item.quantity)}</span>
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
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-primary/50">Shipping address</p>
              <p className="mt-1 text-sm text-text-primary/80">{order.shippingAddress}</p>
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
                  <dd className="font-medium capitalize text-text-primary">{order.paymentStatus}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="rounded-xl border border-border-subtle bg-white p-5">
            <h2 className="text-sm font-semibold text-text-primary">Update status</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                aria-label="New order status"
                className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
              >
                <option value="">Choose a status…</option>
                {STATUSES.filter((s) => s !== order.status).map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={!nextStatus || updatingStatus}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {updatingStatus ? "Updating…" : "Update"} <ArrowRightIcon width={13} height={13} />
              </button>
            </div>
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
    </div>
  );
}
