export function requiresManualCodRefund(paymentProvider: string | null, paymentMethod: string | null): boolean {
  return paymentProvider?.toLowerCase() === "cod" || paymentMethod?.toLowerCase() === "cod";
}
