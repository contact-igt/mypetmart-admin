import { adminApiRequest } from "@/lib/api/admin-api-client";

export type ShipmentStatus = "pending" | "provider_status_unknown" | "created" | "awb_assigned" | "pickup_pending" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "delivery_exception" | "ndr" | "rto_initiated" | "rto_in_transit" | "rto_delivered" | "cancelled" | "failed";
export type ShipmentSourceType = "order" | "replacement";
export type TrackingEvent = { id: number; status: ShipmentStatus; providerStatus: string; providerStatusCode: string | null; location: string | null; message: string | null; eventAt: string };
export type Shipment = {
  id: number; shipmentNumber: string; sourceType: ShipmentSourceType; sourceId: number; orderId: number; replacementId: number | null;
  provider: string; providerOrderId: string | null; carrier: string | null; awbNumber: string | null; serviceType: string | null;
  status: ShipmentStatus; providerStatus: string | null; providerStatusCode: string | null; providerCost: string | null; currency: string;
  package: { weightGrams: number; lengthCm: string; widthCm: string; heightCm: string };
  shippedAt: string | null; deliveredAt: string | null; cancelledAt: string | null; rtoAt: string | null; lastSyncedAt: string | null;
  createdAt: string; trackingEvents: TrackingEvent[];
};
export type ShipmentListItem = Shipment & { sourceReference: string; customerName: string };
export type ShipmentListResult = { items: ShipmentListItem[]; total: number; page: number; pageSize: number; totalPages: number };
export type ShippingConfig = { provider: string; configured: boolean; warehouseId: string | null; environment: "staging" | "production" };

export function listShipments(params: { page?: number; pageSize?: number; status?: ShipmentStatus; sourceType?: ShipmentSourceType; courier?: string }): Promise<ShipmentListResult> {
  const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value) query.set(key, String(value)); });
  return adminApiRequest<ShipmentListResult>(`/admin/shipments?${query.toString()}`);
}
export const getShipment = (id: number | string) => adminApiRequest<Shipment>(`/admin/shipments/${encodeURIComponent(String(id))}`);
export const getShippingConfig = () => adminApiRequest<ShippingConfig>("/admin/shipments/config");
export const createOrderShipment = (orderId: number | string) => adminApiRequest<Shipment>(`/admin/shipments/orders/${encodeURIComponent(String(orderId))}`, { method: "POST", body: "{}" });
export const createReplacementShipment = (replacementId: number | string) => adminApiRequest<Shipment>(`/admin/shipments/replacements/${encodeURIComponent(String(replacementId))}`, { method: "POST", body: "{}" });
export const refreshShipment = (id: number | string) => adminApiRequest<Shipment>(`/admin/shipments/${encodeURIComponent(String(id))}/refresh-tracking`, { method: "POST", body: "{}" });
export const cancelShipment = (id: number | string) => adminApiRequest<Shipment>(`/admin/shipments/${encodeURIComponent(String(id))}/cancel`, { method: "POST", body: "{}" });
export const reattemptShipment = (id: number | string, date: string, time: string) => adminApiRequest<Shipment>(`/admin/shipments/${encodeURIComponent(String(id))}/reattempt`, { method: "POST", body: JSON.stringify({ date, time }) });
export const requestShipmentRto = (id: number | string, reason: string) => adminApiRequest<Shipment>(`/admin/shipments/${encodeURIComponent(String(id))}/rto`, { method: "POST", body: JSON.stringify({ reason }) });
