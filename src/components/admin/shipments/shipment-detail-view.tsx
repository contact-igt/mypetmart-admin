"use client";

import Link from "next/link";
import { useCallback } from "react";
import { getShipment } from "@/lib/api/admin-shipment-api";
import { useAdminData } from "@/components/admin/ui/use-admin-data";
import { ErrorState, LoadingState } from "@/components/admin/ui/empty-state";
import { ShipmentPanel } from "./shipment-panel";

export function ShipmentDetailView({ shipmentId }: { shipmentId: string }) {
  const fetcher = useCallback(() => getShipment(shipmentId), [shipmentId]);
  const { data, loading, error, reload } = useAdminData(fetcher);
  if (loading) return <LoadingState label="Loading shipment…" />;
  if (error || !data) return <ErrorState message={error ?? "Shipment not found."} onRetry={reload} />;
  return <div className="space-y-5"><div><Link href="/admin/shipments" className="text-xs font-semibold text-primary-orange hover:underline">← Back to shipments</Link><h1 className="mt-1 text-xl font-bold text-text-primary">{data.shipmentNumber}</h1><p className="mt-1 text-sm text-text-primary/60 capitalize">{data.sourceType} fulfilment · source #{data.sourceId}</p></div><div className="rounded-xl border border-border-subtle bg-white p-5"><ShipmentPanel shipment={data} onChanged={reload}/></div></div>;
}
