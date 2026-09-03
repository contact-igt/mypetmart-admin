import { adminApiRequest } from "@/lib/api/admin-api-client";
import type { Shipment } from "@/lib/api/admin-shipment-api";
import { buildAdminOrderActionPath, buildAdminOrderPath, buildAdminOrderQuery, serializeAdminOrderBody } from "./admin-order-contract";

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

export type OrderShipment = Shipment;

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
  // Present for both authenticated customers and guests. Guest orders have
  // no customer record, so this is their primary contact identity.
  contactEmail: string;
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
  shipment?: Shipment | null;
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

// Mirrors backend OrderModels/order.types.ts UpdateOrderShippingAddressInput.
// Full replacement of the Order's own shipping snapshot only — never the
// customer's saved Address book entry.
export type UpdateOrderShippingAddressInput = {
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
};

export function getAdminOrderSummary(): Promise<AdminOrderSummary> {
  return adminApiRequest<AdminOrderSummary>("/admin/orders/summary");
}

export function listAdminOrders(params: ListAdminOrdersParams): Promise<ListAdminOrdersResult> {
  return adminApiRequest<ListAdminOrdersResult>(`/admin/orders?${buildAdminOrderQuery(params)}`);
}

export function getAdminOrder(orderId: number | string): Promise<AdminOrderDetail> {
  return adminApiRequest<AdminOrderDetail>(buildAdminOrderPath(orderId));
}

export function updateAdminOrderStatus(orderId: number | string, status: OrderStatus): Promise<AdminOrderDetail> {
  return adminApiRequest<AdminOrderDetail>(buildAdminOrderActionPath(orderId, "status"), {
    method: "PATCH",
    body: serializeAdminOrderBody({ status })
  });
}

export function updateAdminOrderShippingAddress(orderId: number | string, input: UpdateOrderShippingAddressInput): Promise<AdminOrderDetail> {
  return adminApiRequest<AdminOrderDetail>(buildAdminOrderActionPath(orderId, "shipping-address"), {
    method: "PATCH",
    body: serializeAdminOrderBody(input)
  });
}

export function bulkUpdateAdminOrderStatus(ids: number[], status: OrderStatus): Promise<BulkUpdateOrderStatusResult> {
  return adminApiRequest<BulkUpdateOrderStatusResult>("/admin/orders/bulk-status", {
    method: "PATCH",
    body: serializeAdminOrderBody({ ids, status })
  });
}

export function addAdminOrderNote(orderId: number | string, message: string): Promise<OrderNote> {
  return adminApiRequest<OrderNote>(buildAdminOrderActionPath(orderId, "notes"), {
    method: "POST",
    body: serializeAdminOrderBody({ message })
  });
}

// Deliberately NOT implemented in V1 — no Backend route exists for these yet
// (see backend/src/models/OrderModels/admin-order.routes.ts): payment-status
// and fulfilment/shipment mutation are deferred to the future Payment/
// Shipping stages. Do not add client functions for them until the Backend
// routes exist — see final report §11-§13.
