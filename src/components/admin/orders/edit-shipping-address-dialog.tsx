"use client";

import { useState } from "react";
import type { OrderShippingAddress, UpdateOrderShippingAddressInput } from "@/lib/api/admin-order-api";
import { Dialog } from "../ui/dialog";
import { FormField, ADMIN_INPUT_CLASS } from "../ui/form-field";

/**
 * Owns its own form state, initialised once from the current Order's
 * shippingAddress. No reset effect needed: Dialog unmounts this component
 * entirely on close, so reopening always mounts a fresh instance seeded
 * from the latest address prop (same precedent as CategoryFormFields).
 *
 * This edits ONLY the Order's own shipping snapshot — never the customer's
 * saved Address book entry, which this component has no reference to at all.
 */
function EditShippingAddressFields({
  address,
  onSubmit,
  onClose,
  saving,
}: {
  address: OrderShippingAddress;
  onSubmit: (input: UpdateOrderShippingAddressInput) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [recipientName, setRecipientName] = useState(address.recipientName);
  const [phone, setPhone] = useState(address.phone);
  const [line1, setLine1] = useState(address.line1);
  const [line2, setLine2] = useState(address.line2 ?? "");
  const [city, setCity] = useState(address.city);
  const [state, setState] = useState(address.state);
  const [postalCode, setPostalCode] = useState(address.postalCode);
  const [errors, setErrors] = useState<Partial<Record<"recipientName" | "phone" | "line1" | "city" | "state" | "postalCode", string>>>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!recipientName.trim()) next.recipientName = "Recipient name is required.";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Enter a valid phone number (at least 10 digits).";
    if (!line1.trim()) next.line1 = "Address line 1 is required.";
    if (!city.trim()) next.city = "City is required.";
    if (!state.trim()) next.state = "State is required.";
    if (!/^[1-9][0-9]{5}$/.test(postalCode.trim())) next.postalCode = "Enter a valid 6-digit pincode.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
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
      <FormField label="Name" htmlFor="addr-name" error={errors.recipientName}>
        <input id="addr-name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={ADMIN_INPUT_CLASS} autoFocus />
      </FormField>
      <FormField label="Phone" htmlFor="addr-phone" error={errors.phone}>
        <input id="addr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={ADMIN_INPUT_CLASS} />
      </FormField>
      <FormField label="Address line 1" htmlFor="addr-line1" error={errors.line1}>
        <input id="addr-line1" value={line1} onChange={(e) => setLine1(e.target.value)} className={ADMIN_INPUT_CLASS} />
      </FormField>
      <FormField label="Address line 2" htmlFor="addr-line2" optional>
        <input id="addr-line2" value={line2} onChange={(e) => setLine2(e.target.value)} className={ADMIN_INPUT_CLASS} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="City" htmlFor="addr-city" error={errors.city}>
          <input id="addr-city" value={city} onChange={(e) => setCity(e.target.value)} className={ADMIN_INPUT_CLASS} />
        </FormField>
        <FormField label="State" htmlFor="addr-state" error={errors.state}>
          <input id="addr-state" value={state} onChange={(e) => setState(e.target.value)} className={ADMIN_INPUT_CLASS} />
        </FormField>
      </div>
      <FormField label="Pincode" htmlFor="addr-pincode" error={errors.postalCode}>
        <input id="addr-pincode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={ADMIN_INPUT_CLASS} />
      </FormField>
      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-cream-bg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Address"}
        </button>
      </div>
    </form>
  );
}

export function EditShippingAddressDialog({
  open,
  onClose,
  onSubmit,
  address,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: UpdateOrderShippingAddressInput) => void;
  address: OrderShippingAddress | null;
  saving: boolean;
}) {
  if (!address) return null;
  return (
    <Dialog open={open} onClose={onClose} title="Edit delivery address" maxWidthClassName="max-w-md">
      <EditShippingAddressFields address={address} onSubmit={onSubmit} onClose={onClose} saving={saving} />
    </Dialog>
  );
}
