"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { getShippingConfig, listShipments, type ShipmentSourceType, type ShipmentStatus } from "@/lib/api/admin-shipment-api";
import { useAdminData } from "@/components/admin/ui/use-admin-data";
import { ErrorState, LoadingState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";

const statuses: ShipmentStatus[] = ["pending", "provider_status_unknown", "created", "awb_assigned", "pickup_pending", "picked_up", "in_transit", "out_for_delivery", "delivered", "delivery_exception", "ndr", "rto_initiated", "rto_in_transit", "rto_delivered", "cancelled", "failed"];
function date(value: string) { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }

export function ShipmentsListView() {
  const [status, setStatus] = useState<ShipmentStatus | "">("");
  const [sourceType, setSourceType] = useState<ShipmentSourceType | "">("");
  const fetcher = useCallback(() => listShipments({ pageSize: 100, status: status || undefined, sourceType: sourceType || undefined }), [status, sourceType]);
  const { data, loading, error, reload } = useAdminData(fetcher);
  const config = useAdminData(useCallback(() => getShippingConfig(), []));
  return <div className="space-y-5">
    <div><h1 className="text-xl font-bold text-text-primary">Shipments</h1><p className="mt-1 text-sm text-text-primary/60">Forward Order and Replacement fulfilment through iThink Logistics.</p></div>
    {config.data && <div className={`rounded-lg border px-4 py-3 text-sm ${config.data.configured ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}>{config.data.provider} · {config.data.environment} · Warehouse {config.data.warehouseId ?? "not configured"} · {config.data.configured ? "Configured" : "Not configured"}</div>}
    <div className="flex flex-wrap gap-2"><select value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus | "")} className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm"><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select><select value={sourceType} onChange={(e) => setSourceType(e.target.value as ShipmentSourceType | "")} className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm"><option value="">All sources</option><option value="order">Orders</option><option value="replacement">Replacements</option></select></div>
    {loading ? <LoadingState label="Loading shipments…" /> : error || !data ? <ErrorState message={error ?? "Could not load shipments."} onRetry={reload} /> : data.items.length === 0 ? <p className="rounded-xl border border-border-subtle bg-white p-8 text-center text-sm text-text-primary/55">No shipments match these filters.</p> : <div className="overflow-x-auto rounded-xl border border-border-subtle bg-white"><table className="w-full text-left text-sm"><thead className="bg-cream-bg text-xs uppercase text-text-primary/55"><tr><th className="p-3">Shipment</th><th className="p-3">Source</th><th className="p-3">Customer</th><th className="p-3">Courier / AWB</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead><tbody>{data.items.map((shipment) => <tr key={shipment.id} className="border-t border-border-subtle"><td className="p-3"><Link className="font-mono font-semibold text-primary-orange hover:underline" href={`/admin/shipments/${shipment.id}`}>{shipment.shipmentNumber}</Link></td><td className="p-3 capitalize">{shipment.sourceType}<br/><span className="text-xs text-text-primary/50">{shipment.sourceReference}</span></td><td className="p-3">{shipment.customerName}</td><td className="p-3">{shipment.carrier ?? "—"}<br/><span className="font-mono text-xs text-text-primary/55">{shipment.awbNumber ?? "AWB pending"}</span></td><td className="p-3"><StatusBadge status={shipment.status}/></td><td className="p-3 text-text-primary/60">{date(shipment.createdAt)}</td></tr>)}</tbody></table></div>}
  </div>;
}
