"use client";

import Link from "next/link";
import { useState } from "react";
import { cancelShipment, reattemptShipment, refreshShipment, requestShipmentRto, type Shipment } from "@/lib/api/admin-shipment-api";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { useToast } from "@/components/admin/ui/toast";

function formatDateTime(value: string): string { return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

export function ShipmentPanel({ shipment, onChanged }: { shipment?: Shipment | null; onChanged?: () => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00:00");
  const [rtoReason, setRtoReason] = useState("");

  async function act(label: string, action: () => Promise<Shipment>) {
    setBusy(true);
    try { await action(); showToast(label); onChanged?.(); }
    catch (error) { showToast(error instanceof Error ? error.message : "Shipping action failed.", "error"); }
    finally { setBusy(false); }
  }

  if (!shipment) return <p className="text-sm text-text-primary/55">No shipment created yet.</p>;
  const canCancel = ["awb_assigned", "pickup_pending"].includes(shipment.status);
  const canNdr = ["ndr", "delivery_exception"].includes(shipment.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border-subtle p-3">
        <div>
          <Link href={`/admin/shipments/${shipment.id}`} className="font-mono text-sm font-semibold text-primary-orange hover:underline">{shipment.shipmentNumber}</Link>
          <p className="mt-1 text-xs text-text-primary/60">{shipment.carrier ?? "Courier pending"}{shipment.serviceType ? ` · ${shipment.serviceType}` : ""}</p>
          <p className="font-mono text-xs text-text-primary/70">{shipment.awbNumber ?? "AWB pending"}</p>
        </div>
        <StatusBadge status={shipment.status} />
      </div>
      {shipment.status === "provider_status_unknown" && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800">Provider outcome is uncertain. Reconcile this shipment; do not create another.</p>}
      <dl className="grid grid-cols-2 gap-2 text-xs text-text-primary/70 sm:grid-cols-4">
        <div><dt className="font-semibold">Provider cost</dt><dd>{shipment.providerCost ? `${shipment.currency} ${shipment.providerCost}` : "—"}</dd></div>
        <div><dt className="font-semibold">Package</dt><dd>{shipment.package.weightGrams} g</dd></div>
        <div><dt className="font-semibold">Created</dt><dd>{formatDateTime(shipment.createdAt)}</dd></div>
        <div><dt className="font-semibold">Last sync</dt><dd>{shipment.lastSyncedAt ? formatDateTime(shipment.lastSyncedAt) : "—"}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {shipment.awbNumber && <button disabled={busy} onClick={() => act("Tracking refreshed.", () => refreshShipment(shipment.id))} className="rounded-lg bg-primary-orange px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Refresh tracking</button>}
        {canCancel && <button disabled={busy} onClick={() => act("Shipment cancelled.", () => cancelShipment(shipment.id))} className="rounded-lg border border-terracotta px-3 py-2 text-xs font-semibold text-terracotta disabled:opacity-50">Cancel shipment</button>}
      </div>
      {canNdr && (
        <div className="grid gap-3 rounded-lg bg-cream-bg p-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-text-primary">Delivery reattempt</p>
            <div className="flex flex-wrap gap-2"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-border-subtle px-2 py-1.5 text-xs" /><input type="time" step="1" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg border border-border-subtle px-2 py-1.5 text-xs" /><button disabled={busy || !date || !time} onClick={() => act("Reattempt requested.", () => reattemptShipment(shipment.id, date, time))} className="rounded-lg bg-primary-orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Request</button></div>
          </div>
          <div className="space-y-2">
            <label htmlFor={`rto-${shipment.id}`} className="text-xs font-semibold text-text-primary">Return to origin</label>
            <div className="flex gap-2"><input id={`rto-${shipment.id}`} value={rtoReason} onChange={(e) => setRtoReason(e.target.value)} placeholder="Operational reason" className="min-w-0 flex-1 rounded-lg border border-border-subtle px-2 py-1.5 text-xs" /><button disabled={busy || rtoReason.trim().length < 3} onClick={() => act("RTO requested.", () => requestShipmentRto(shipment.id, rtoReason.trim()))} className="rounded-lg border border-terracotta px-3 py-1.5 text-xs font-semibold text-terracotta disabled:opacity-50">Request RTO</button></div>
          </div>
        </div>
      )}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-primary/55">Tracking timeline</h4>
        {shipment.trackingEvents.length === 0 ? <p className="mt-2 text-sm text-text-primary/50">No courier scans yet.</p> : <ol className="mt-3 space-y-3 border-l-2 border-primary-orange/25 pl-4">{shipment.trackingEvents.map((event) => <li key={event.id} className="text-xs"><p className="font-semibold text-text-primary">{event.providerStatus}</p><p className="text-text-primary/60">{[event.location, event.message].filter(Boolean).join(" · ")}</p><time className="text-text-primary/45">{formatDateTime(event.eventAt)}</time></li>)}</ol>}
      </div>
    </div>
  );
}
