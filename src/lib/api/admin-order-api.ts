import { adminApiRequest } from "@/lib/api/admin-api-client";

/**
 * Production Order types — mirror backend/src/models/OrderModels/order.types.ts
 * field-for-field. Deliberately NOT the demo-only Order/OrderItem shapes in
 * @/data/admin/types.ts: those use string ids and float money, which do not
 * match the real Backend (numeric ids, 2-decimal money strings, immutable
 * Order Item snapshot fields). Do not introduce float-money handling here.
 */

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "return_requested";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type FulfilmentStatus = "unfulfilled" | "processing" | "packed" | "shipped" | "delivered";

export type OrderItem = {
  id: number;
  productId: number | null;
  variantId: number | null;
  productName: string;
  productSku: string;
  variantName: string | null;
  variantSku: string | null;
  productImage: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type OrderShippingAddress = {
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type OrderCustomer = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
};

export type AdminOrderListItem = {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  subtotal: string;
  shippingFee: string;
  total: string;
  currency: string;
  itemCount: number;
  placedAt: string;
  // null for a guest Order — no authenticated customer placed it.
  customer: OrderCustomer | null;
  shipState: string;
  shipCity: string;
};

export type OrderPayment = {
  id: number;
  provider: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  method: string | null;
  // PayU merchant txnid (our own stable reference) and PayU's own mihpayid —
  // the latter is only ever set once a webhook/Verify Payment API result has
  // actually been verified. Never the hash/salt.
  providerOrderId: string | null;
  providerPaymentId: string | null;
  paidAt: string | null;
  failedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
};

export type OrderShipment = {
  id: number;
  method: string;
  carrier: string | null;
  trackingNumber: string | null;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
};

export type OrderNote = {
  id: number;
  message: string;
  authorId: number;
  authorName: string;
  createdAt: string;
};

export type OrderReturn = {
  id: number;
  returnNumber: string;
  orderItemId: number;
  type: string;
  status: string;
  requestedAt: string;
};

export type AdminOrderDetail = AdminOrderListItem & {
  shippingAddress: OrderShippingAddress;
  items: OrderItem[];
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  // null for a guest Order — no authenticated customer placed it.
  customer: OrderCustomer | null;
  // Set only when a verified-successful payment could not confirm the Order
  // (stock ran out, or the Order was no longer confirmable) — payment was
  // genuinely captured but the Order needs manual review before fulfilment.
  commerceException: string | null;
  payments: OrderPayment[];
  shipments: OrderShipment[];
  notes: OrderNote[];
  returns: OrderReturn[];
};

export type AdminOrderSummary = {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  returnRequested: number;
};

export type ListAdminOrdersParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfilmentStatus?: FulfilmentStatus;
  productId?: number;
  state?: string;
  from?: string;
  to?: string;
  sortBy?: "placedAt" | "total";
  sortDir?: "ASC" | "DESC";
};

export type ListAdminOrdersResult = {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type BulkUpdateOrderStatusResult = {
  updated: number;
  skipped: number;
};

function orderPath(orderId: number | string): string {
  return `/admin/orders/${encodeURIComponent(String(orderId))}`;
}

export function getAdminOrderSummary(): Promise<AdminOrderSummary> {
  return adminApiRequest<AdminOrderSummary>("/admin/orders/summary");
}

export function listAdminOrders(params: ListAdminOrdersParams): Promise<ListAdminOrdersResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return adminApiRequest<ListAdminOrdersResult>(`/admin/orders?${query.toString()}`);
}

export function getAdminOrder(orderId: number | string): Promise<AdminOrderDetail> {
  return adminApiRequest<AdminOrderDetail>(orderPath(orderId));
}

export function updateAdminOrderStatus(orderId: number | string, status: OrderStatus): Promise<AdminOrderDetail> {
  return adminApiRequest<AdminOrderDetail>(`${orderPath(orderId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function bulkUpdateAdminOrderStatus(ids: number[], status: OrderStatus): Promise<BulkUpdateOrderStatusResult> {
  return adminApiRequest<BulkUpdateOrderStatusResult>("/admin/orders/bulk-status", {
    method: "PATCH",
    body: JSON.stringify({ ids, status })
  });
}

export function addAdminOrderNote(orderId: number | string, message: string): Promise<OrderNote> {
  return adminApiRequest<OrderNote>(`${orderPath(orderId)}/notes`, {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

// Deliberately NOT implemented in V1 — no Backend route exists for these yet
// (see backend/src/models/OrderModels/admin-order.routes.ts): payment-status
// and fulfilment/shipment mutation are deferred to the future Payment/
// Shipping stages. Do not add client functions for them until the Backend
// routes exist — see final report §11-§13.
