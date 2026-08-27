"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/admin/ui/dialog";
import { useToast } from "@/components/admin/ui/toast";
import { createOrderShipment, quoteOrderShipment, type Shipment, type ShipmentQuoteOption } from "@/lib/api/admin-shipment-api";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

/**
 * Owns its own state, freshly mounted each time the Dialog opens — Dialog
 * itself returns null and never renders this while `open` is false (same
 * precedent as CategoryFormFields/CategoryFormDialog), so there is no
 * manual reset needed between opens; a fresh instance always starts from
 * "loading, no options, nothing selected".
 *
 * Two-step flow: fetch the quote (POST .../quote — never creates a
 * Shipment) on mount, list every returned option, then a confirmation step
 * once one is picked. "Create Shipment" always re-sends the exact
 * {carrier, serviceType} pair — the backend re-validates it against a FRESH
 * rate check at booking time (see shipment.service.ts's create()), so
 * nothing from this quote is trusted blindly if rates moved between opening
 * this dialog and confirming.
 */
function CourierSelectionContent({ orderId, onClose, onCreated }: { orderId: number; onClose: () => void; onCreated: (shipment: Shipment) => void }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<ShipmentQuoteOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShipmentQuoteOption | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    quoteOrderShipment(orderId)
      .then((result) => {
        if (!cancelled) setOptions(result.options);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load shipping options.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function handleConfirm() {
    if (!selected) return;
    setCreating(true);
    try {
      const shipment = await createOrderShipment(orderId, { carrier: selected.carrier, serviceType: selected.serviceType });
      onCreated(shipment);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create the shipment.", "error");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p className="text-sm text-text-primary/60">Checking available couriers…</p>;
  if (error) return <p className="text-sm font-semibold text-terracotta">{error}</p>;
  if (!options || options.length === 0) return <p className="text-sm text-text-primary/60">No shipping services are currently available for this delivery address.</p>;

  if (!selected) {
    return (
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={`${option.carrier}-${option.serviceType}`}
            type="button"
            onClick={() => setSelected(option)}
            className="flex items-center justify-between rounded-lg border border-border-subtle p-3 text-left transition-colors duration-150 ease-out hover:border-primary-orange hover:bg-cream-bg"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary">{option.carrier}</p>
              <p className="text-xs text-text-primary/60">Service: {option.serviceType}</p>
            </div>
            <p className="text-sm font-bold text-text-primary">{currency.format(Number(option.rate))}</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold text-text-primary">Confirm Shipment</h3>
      <dl className="grid grid-cols-2 gap-y-2 rounded-lg border border-border-subtle bg-cream-bg p-3 text-sm">
        <dt className="font-semibold text-text-primary/70">Courier</dt>
        <dd className="text-right text-text-primary">{selected.carrier}</dd>
        <dt className="font-semibold text-text-primary/70">Service</dt>
        <dd className="text-right text-text-primary">{selected.serviceType}</dd>
        <dt className="font-semibold text-text-primary/70">Shipping cost</dt>
        <dd className="text-right font-bold text-text-primary">{currency.format(Number(selected.rate))}</dd>
      </dl>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-cream-bg"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={creating}
          className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create Shipment"}
        </button>
      </div>
    </div>
  );
}

export function CourierSelectionDialog({
  open,
  onClose,
  orderId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  orderId: number;
  onCreated: (shipment: Shipment) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Available Shipping Options" maxWidthClassName="max-w-md">
      <CourierSelectionContent orderId={orderId} onClose={onClose} onCreated={onCreated} />
    </Dialog>
  );
}
