import { adminApiRequest } from "@/lib/api/admin-api-client";
import type { Shipment } from "@/lib/api/admin-shipment-api";

/**
 * Production Return + Refund types — mirror
 * backend/src/models/ReturnModels/return.types.ts and
 * backend/src/models/RefundModels/refund.types.ts field-for-field.
 * Deliberately NOT the demo-only ReturnRequest shape in @/data/admin/types.ts
 * (string ids, no Refund concept at all — see the Returns + Refunds report).
 */

export type ReturnStatus = "requested" | "approved" | "rejected" | "resolved" | "cancelled";
export type RefundStatus = "pending" | "processing" | "succeeded" | "failed";
export type ReturnResolution = "refund" | "replacement";
export type ReplacementStatus = "stock_unavailable" | "processing" | "completed";

export type ReplacementSummary = {
  id: number;
  replacementNumber: string;
  status: ReplacementStatus;
  productId: number;
  productVariantId: number | null;
  quantity: number;
  stockConsumedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  shipment?: Shipment | null;
};

export type ReturnShipmentStatus = "pending" | "approved" | "pickup_scheduled" | "picked_up" | "in_transit" | "delivered" | "failed" | "cancelled";

export type ReturnShipmentFailureReason = {
  provider: string;
  errorCode: string;
  message: string;
  failedAt: string;
} | null;

export type ReturnShipmentTrackingEvent = {
  id: number;
  status: ReturnShipmentStatus;
  providerStatus: string;
  providerStatusCode: string | null;
  location: string | null;
  message: string | null;
  eventAt: string;
};

// Mirrors backend/src/models/ReturnShipmentModels/return-shipment.types.ts's
// ReturnShipmentJSON field-for-field — deliberately its own type, not a
// reuse of admin-shipment-api.ts's Shipment (a reverse pickup is a
// different business entity from a forward Shipment; see the Phase F.1
// report's Architecture Decision).
export type ReturnShipment = {
  id: number;
  returnRequestId: number;
  shipmentNumber: string;
  provider: string;
  carrier: string | null;
  awbNumber: string | null;
  serviceType: string | null;
  status: ReturnShipmentStatus;
  providerStatus: string | null;
  providerStatusCode: string | null;
  failureReason: ReturnShipmentFailureReason;
  trackingUrl: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  trackingEvents: ReturnShipmentTrackingEvent[];
};

export type ReturnRefundSummary = {
  id: number;
  refundNumber: string;
  status: RefundStatus;
  amount: string;
  currency: string;
  initiatedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  failureMessage: string | null;
};

export type ReturnNote = {
  id: number;
  message: string;
  authorName: string;
  createdAt: string;
};

export type AdminReturnListItem = {
  id: number;
  returnNumber: string;
  orderId: number;
  orderNumber: string;
  orderItemId: number;
  productName: string;
  variantName: string | null;
  purchasedQuantity: number;
  quantity: number;
  resolution: ReturnResolution;
  status: ReturnStatus;
  reason: string;
  resolutionNote: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancellationSource: "customer" | "admin" | null;
  itemReceivedAt: string | null;
  refunds: ReturnRefundSummary[];
  replacement: ReplacementSummary | null;
  // null when no reverse pickup has been created yet for this return —
  // never fabricated.
  returnShipment: ReturnShipment | null;
};

export type AdminReturnDetail = AdminReturnListItem & {
  notes: ReturnNote[];
  maxRefundableAmount: string;
  currency: string;
  paymentProvider: string | null;
  paymentMethod: string | null;
  canCancel: boolean;
};

export type ListAdminReturnsParams = {
  status?: ReturnStatus;
  resolution?: ReturnResolution;
  page?: number;
  pageSize?: number;
};

export type ListAdminReturnsResult = {
  items: AdminReturnListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type InitiateRefundResult = {
  id: number;
  refundNumber: string;
  status: RefundStatus;
  amount: string;
  currency: string;
};

function returnPath(returnId: number | string): string {
  return `/admin/returns/${encodeURIComponent(String(returnId))}`;
}

export function listAdminReturns(params: ListAdminReturnsParams): Promise<ListAdminReturnsResult> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.resolution) query.set("resolution", params.resolution);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();
  return adminApiRequest<ListAdminReturnsResult>(`/admin/returns${qs ? `?${qs}` : ""}`);
}

export function getAdminReturn(returnId: number | string): Promise<AdminReturnDetail> {
  return adminApiRequest<AdminReturnDetail>(returnPath(returnId));
}

export function reviewAdminReturn(returnId: number | string, action: "approve" | "reject", note?: string): Promise<AdminReturnDetail> {
  return adminApiRequest<AdminReturnDetail>(`${returnPath(returnId)}/review`, {
    method: "PATCH",
    body: JSON.stringify(note ? { action, note } : { action })
  });
}

/**
 * Warehouse-side confirmation that the physical item is actually back —
 * required before a "replacement" request can be approved, and before a
 * "refund" request's refund can be initiated (see RETURN_ITEM_NOT_RECEIVED
 * on the backend). An operational fact, not a money movement, so open to
 * any admin, not just super_admin.
 */
export function markReturnItemReceived(returnId: number | string): Promise<AdminReturnDetail> {
  return adminApiRequest<AdminReturnDetail>(`${returnPath(returnId)}/receive`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function addAdminReturnNote(returnId: number | string, message: string): Promise<AdminReturnDetail> {
  return adminApiRequest<AdminReturnDetail>(`${returnPath(returnId)}/notes`, {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

/**
 * Real-money PayU refund initiation — super_admin only server-side
 * (authenticate("admin") + authorize("super_admin") on the backend route).
 * The amount is entirely backend-derived; nothing here can influence it.
 */
export function initiateAdminRefund(returnId: number | string): Promise<InitiateRefundResult> {
  return adminApiRequest<InitiateRefundResult>(`/admin/returns/${encodeURIComponent(String(returnId))}/refunds`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function recheckAdminRefund(refundId: number | string): Promise<InitiateRefundResult> {
  return adminApiRequest<InitiateRefundResult>(`/admin/refunds/${encodeURIComponent(String(refundId))}/recheck`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function updateAdminReplacement(returnId: number | string, status: "processing"): Promise<ReplacementSummary> {
  return adminApiRequest<ReplacementSummary>(`${returnPath(returnId)}/replacement`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

/**
 * Books a reverse pickup with the courier for an approved return request.
 * Backend-gated (RETURN_SHIPMENT_NOT_ELIGIBLE unless the return is already
 * "approved"; RETURN_SHIPMENT_ALREADY_EXISTS on a repeat call) — this is a
 * thin passthrough, no client-side eligibility duplicated here.
 */
export function createReturnShipment(returnId: number | string): Promise<ReturnShipment> {
  return adminApiRequest<ReturnShipment>(`${returnPath(returnId)}/create-shipment`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function cancelAdminReturn(returnId: number | string, reason?: string): Promise<AdminReturnDetail> {
  return adminApiRequest<AdminReturnDetail>(`${returnPath(returnId)}/cancel`, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {})
  });
}

export function refreshReturnShipment(shipmentId: number | string): Promise<ReturnShipment> {
  return adminApiRequest<ReturnShipment>(`/admin/return-shipments/${encodeURIComponent(String(shipmentId))}/refresh`, {
    method: "POST",
    body: JSON.stringify({})
  });
}
