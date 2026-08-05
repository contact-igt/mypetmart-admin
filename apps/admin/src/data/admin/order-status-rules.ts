import type { FulfilmentStatus, OrderStatus, PaymentStatus } from "./types";

/**
 * Single source of truth for which status moves are legal, shared by
 * mock-repository.ts (server-side enforcement — rejects invalid transitions
 * even if a stale client somehow sends one) and the order list/detail views
 * (client-side — only ever offer valid options). Order, fulfilment and
 * payment status are three independent state machines; none of them
 * cascade into or infer another.
 */

const ORDER_RANK: Record<Exclude<OrderStatus, "cancelled" | "return_requested">, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
};
const ORDER_SEQUENCE = Object.keys(ORDER_RANK) as (keyof typeof ORDER_RANK)[];

export function getValidNextOrderStatuses(current: OrderStatus): OrderStatus[] {
  if (current === "cancelled" || current === "return_requested") return [];
  if (current === "delivered") return ["return_requested"];
  const rank = ORDER_RANK[current];
  const forward = ORDER_SEQUENCE.filter((s) => ORDER_RANK[s] > rank) as OrderStatus[];
  return [...forward, "cancelled"];
}

export function isValidOrderStatusTransition(current: OrderStatus, next: OrderStatus): boolean {
  return getValidNextOrderStatuses(current).includes(next);
}

export function isDestructiveOrderTransition(next: OrderStatus): boolean {
  return next === "cancelled" || next === "return_requested";
}

const FULFILMENT_RANK: Record<FulfilmentStatus, number> = {
  unfulfilled: 0,
  processing: 1,
  packed: 2,
  shipped: 3,
  delivered: 4,
};
const FULFILMENT_SEQUENCE = Object.keys(FULFILMENT_RANK) as FulfilmentStatus[];

export function getValidNextFulfilmentStatuses(current: FulfilmentStatus): FulfilmentStatus[] {
  const rank = FULFILMENT_RANK[current];
  return FULFILMENT_SEQUENCE.filter((s) => FULFILMENT_RANK[s] > rank);
}

export function isValidFulfilmentTransition(current: FulfilmentStatus, next: FulfilmentStatus): boolean {
  return getValidNextFulfilmentStatuses(current).includes(next);
}

const PAYMENT_NEXT: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["paid", "failed"],
  failed: ["pending", "paid"],
  paid: ["refunded"],
  refunded: [],
};

export function getValidNextPaymentStatuses(current: PaymentStatus): PaymentStatus[] {
  return PAYMENT_NEXT[current];
}

export function isValidPaymentTransition(current: PaymentStatus, next: PaymentStatus): boolean {
  return PAYMENT_NEXT[current].includes(next);
}
