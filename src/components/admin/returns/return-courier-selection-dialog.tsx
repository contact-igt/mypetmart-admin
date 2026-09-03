"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/admin/ui/dialog";
import { ADMIN_INPUT_CLASS, FormField } from "@/components/admin/ui/form-field";
import { useToast } from "@/components/admin/ui/toast";
import {
  createReturnShipment,
  quoteReturnShipment,
  updateReturnPickupAddress,
  type ReturnPickupAddress,
  type ReturnShipmentQuoteOption,
} from "@/lib/api/admin-return-api";
import {
  isPickupAddressFormValid,
  validatePickupAddressForm,
  type PickupAddressFieldErrors,
} from "@/lib/return-pickup-address";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

function AddressLines({ address }: { address: ReturnPickupAddress }) {
  return (
    <div className="text-sm text-text-primary">
      <p className="font-semibold">{address.recipientName}</p>
      <p className="text-text-primary/70">{address.phone}</p>
      <p className="mt-1 text-text-primary/70">
        {[address.line1, address.line2, address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
      </p>
    </div>
  );
}

/**
 * Editable pickup-address step, rendered inline inside the same Dialog
 * (nested Dialogs would collide on the shared aria id). Saving writes ONLY
 * return_requests.pickup_* on the backend — never the customer's Order
 * address — and does NOT create the shipment.
 */
function PickupAddressForm({
  address,
  saving,
  onCancel,
  onSubmit,
}: {
  address: ReturnPickupAddress;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: { recipientName: string; phone: string; line1: string; line2?: string; city: string; state: string; postalCode: string }) => void;
}) {
  const [recipientName, setRecipientName] = useState(address.recipientName);
  const [phone, setPhone] = useState(address.phone);
  const [line1, setLine1] = useState(address.line1);
  const [line2, setLine2] = useState(address.line2 ?? "");
  const [city, setCity] = useState(address.city);
  const [state, setState] = useState(address.state);
  const [postalCode, setPostalCode] = useState(address.postalCode);
  const [errors, setErrors] = useState<PickupAddressFieldErrors>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const values = { recipientName, phone, line1, line2, city, state, postalCode };
    if (!isPickupAddressFormValid(values)) {
      setErrors(validatePickupAddressForm(values));
      return;
    }
    onSubmit({
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      line1: line1.trim(),
      line2: line2.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-xs text-text-primary/55">
        This updates only the return pickup address. The customer&apos;s saved address and the original order address are not changed.
      </p>
      <FormField label="Full Name" htmlFor="pickup-name" error={errors.recipientName}>
        <input id="pickup-name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={ADMIN_INPUT_CLASS} autoFocus />
      </FormField>
      <FormField label="Phone" htmlFor="pickup-phone" error={errors.phone}>
        <input id="pickup-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={ADMIN_INPUT_CLASS} />
      </FormField>
      <FormField label="Address Line 1" htmlFor="pickup-line1" error={errors.line1}>
        <input id="pickup-line1" value={line1} onChange={(e) => setLine1(e.target.value)} className={ADMIN_INPUT_CLASS} />
      </FormField>
      <FormField label="Address Line 2" htmlFor="pickup-line2" optional>
        <input id="pickup-line2" value={line2} onChange={(e) => setLine2(e.target.value)} className={ADMIN_INPUT_CLASS} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="City" htmlFor="pickup-city" error={errors.city}>
          <input id="pickup-city" value={city} onChange={(e) => setCity(e.target.value)} className={ADMIN_INPUT_CLASS} />
        </FormField>
        <FormField label="State" htmlFor="pickup-state" error={errors.state}>
          <input id="pickup-state" value={state} onChange={(e) => setState(e.target.value)} className={ADMIN_INPUT_CLASS} />
        </FormField>
      </div>
      <FormField label="Pincode" htmlFor="pickup-pincode" error={errors.postalCode}>
        <input id="pickup-pincode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={ADMIN_INPUT_CLASS} />
      </FormField>
      <div className="mt-1 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-cream-bg">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {saving ? "Saving…" : "Save Address"}
        </button>
      </div>
    </form>
  );
}

type Step = "loading" | "select" | "edit-address" | "confirm";

function ReturnCourierSelectionContent({
  returnId,
  pickupAddress,
  onClose,
  onChanged,
}: {
  returnId: number;
  pickupAddress: ReturnPickupAddress;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("loading");
  // Step to return to after the address edit form (select / confirm).
  const [returnStep, setReturnStep] = useState<Exclude<Step, "loading" | "edit-address">>("select");
  const [address, setAddress] = useState<ReturnPickupAddress>(pickupAddress);
  const [options, setOptions] = useState<ReturnShipmentQuoteOption[] | null>(null);
  const [selected, setSelected] = useState<ReturnShipmentQuoteOption | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  // bumped after an address save to re-run the quote against the new pincode
  const [quoteNonce, setQuoteNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    quoteReturnShipment(returnId)
      .then((result) => {
        if (cancelled) return;
        setQuoteError(null);
        setOptions(result.options);
        if (result.options.length === 1) {
          // Exactly one reverse courier — pre-select it and jump to the
          // summary; the admin just confirms.
          setSelected(result.options[0]);
          setStep("confirm");
        } else {
          setSelected(null);
          setStep("select");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setQuoteError(err instanceof Error ? err.message : "Could not load reverse courier options.");
        setOptions([]);
        setStep("select");
      });
    return () => {
      cancelled = true;
    };
  }, [returnId, quoteNonce]);

  async function handleSaveAddress(input: { recipientName: string; phone: string; line1: string; line2?: string; city: string; state: string; postalCode: string }) {
    setSavingAddress(true);
    try {
      const detail = await updateReturnPickupAddress(returnId, input);
      setAddress(detail.pickupAddress);
      onChanged();
      showToast("Pickup address updated.");
      setSelected(null);
      setOptions(null);
      setStep("loading");
      setQuoteNonce((n) => n + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update the pickup address.", "error");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleCreate() {
    if (!selected) return;
    setCreating(true);
    try {
      await createReturnShipment(returnId, { carrier: selected.carrier, serviceType: selected.serviceType });
      showToast("Return shipment created.");
      onChanged();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create the return shipment.", "error");
    } finally {
      setCreating(false);
    }
  }

  function openAddressEditor(from: Exclude<Step, "loading" | "edit-address">) {
    setReturnStep(from);
    setStep("edit-address");
  }

  if (step === "loading") {
    return <p className="text-sm text-text-primary/60">Checking available reverse couriers…</p>;
  }

  if (step === "edit-address") {
    return <PickupAddressForm address={address} saving={savingAddress} onCancel={() => setStep(returnStep)} onSubmit={handleSaveAddress} />;
  }

  const pickupCard = (
    <div className="rounded-lg border border-border-subtle bg-cream-bg p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-primary/55">Pickup Address</p>
          <div className="mt-1.5">
            <AddressLines address={address} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => openAddressEditor(step === "confirm" ? "confirm" : "select")}
          className="shrink-0 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-white"
        >
          Edit Address
        </button>
      </div>
      {address.edited && <p className="mt-2 text-[11px] text-text-primary/50">Edited — differs from the original order address.</p>}
    </div>
  );

  if (step === "confirm" && selected) {
    return (
      <div className="flex flex-col gap-4">
        {pickupCard}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-primary/55">Summary</p>
          <dl className="mt-1.5 grid grid-cols-2 gap-y-2 rounded-lg border border-border-subtle bg-cream-bg p-3 text-sm">
            <dt className="font-semibold text-text-primary/70">Courier</dt>
            <dd className="text-right text-text-primary">{selected.carrier}</dd>
            <dt className="font-semibold text-text-primary/70">Service</dt>
            <dd className="text-right text-text-primary">{selected.serviceType || "—"}</dd>
            <dt className="font-semibold text-text-primary/70">Return shipping</dt>
            <dd className="text-right font-bold text-text-primary">{currency.format(Number(selected.rate))}</dd>
          </dl>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => (options && options.length > 1 ? setStep("select") : onClose())}
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-cream-bg"
          >
            {options && options.length > 1 ? "Back" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create Return Shipment"}
          </button>
        </div>
      </div>
    );
  }

  // step === "select"
  return (
    <div className="flex flex-col gap-4">
      {pickupCard}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-primary/55">Courier</p>
        {quoteError ? (
          <p className="mt-2 text-sm font-semibold text-terracotta">{quoteError}</p>
        ) : !options || options.length === 0 ? (
          <p className="mt-2 text-sm text-text-primary/60">
            No reverse-pickup courier is currently serviceable for this pickup address. Try editing the address above.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {options.map((option) => (
              <button
                key={`${option.carrier}-${option.serviceType}`}
                type="button"
                onClick={() => {
                  setSelected(option);
                  setStep("confirm");
                }}
                className="flex items-center justify-between rounded-lg border border-border-subtle p-3 text-left transition-colors duration-150 ease-out hover:border-primary-orange hover:bg-cream-bg"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{option.carrier}</p>
                  <p className="text-xs text-text-primary/60">Service: {option.serviceType || "—"}</p>
                </div>
                <p className="text-sm font-bold text-text-primary">{currency.format(Number(option.rate))}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-cream-bg">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ReturnCourierSelectionDialog({
  open,
  onClose,
  returnId,
  pickupAddress,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  returnId: number;
  pickupAddress: ReturnPickupAddress;
  onChanged: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Create Return Shipment" maxWidthClassName="max-w-md">
      <ReturnCourierSelectionContent returnId={returnId} pickupAddress={pickupAddress} onClose={onClose} onChanged={onChanged} />
    </Dialog>
  );
}
