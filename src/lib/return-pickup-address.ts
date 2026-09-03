// Pure validation for the reverse-pickup address form. Mirrors the backend
// updateReturnPickupAddressSchema (ReturnModels/return.validation.ts) and the
// existing Order shipping-address dialog rules field-for-field: same 6-digit
// Indian pincode regex, same ">=10 digits after stripping" phone rule. Kept
// as a standalone pure module so it can be unit-tested without React.

export type PickupAddressFormValues = {
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

export type PickupAddressFieldErrors = Partial<Record<"recipientName" | "phone" | "line1" | "city" | "state" | "postalCode", string>>;

export function validatePickupAddressForm(values: PickupAddressFormValues): PickupAddressFieldErrors {
  const errors: PickupAddressFieldErrors = {};
  if (!values.recipientName.trim()) errors.recipientName = "Full name is required.";
  if (values.phone.replace(/\D/g, "").length < 10) errors.phone = "Enter a valid phone number (at least 10 digits).";
  if (!values.line1.trim()) errors.line1 = "Address line 1 is required.";
  if (!values.city.trim()) errors.city = "City is required.";
  if (!values.state.trim()) errors.state = "State is required.";
  if (!/^[1-9][0-9]{5}$/.test(values.postalCode.trim())) errors.postalCode = "Enter a valid 6-digit pincode.";
  return errors;
}

export function isPickupAddressFormValid(values: PickupAddressFormValues): boolean {
  return Object.keys(validatePickupAddressForm(values)).length === 0;
}
