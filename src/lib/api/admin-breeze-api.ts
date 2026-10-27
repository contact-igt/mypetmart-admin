import { adminApiRequest } from "@/lib/api/admin-api-client";

// Staff Breeze reconciliation API client. The backend returns no payloads, no
// contact details and no credentials; this client only maps the documented
// response shape. Every mutation sends an explicit reason (audited server-side).

export type BreezeSessionRow = {
  checkoutRef: number;
  launchStatus: string;
  processingStatus: string;
  orderId: number | null;
  orderNumber: string | null;
  orderPaymentStatus: string | null;
  commerceException: string | null;
  paymentId: number | null;
  breezeOrderId: string | null;
  breezeTransactionId: string | null;
  breezeCartId: string | null;
  lastErrorCode: string | null;
  unresolvedTooLong: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BreezeEventRow = {
  eventRef: number;
  providerEventId: string;
  eventName: string | null;
  webhookState: string;
  outcomeCode: string | null;
  attempts: number;
  maxAttempts: number;
  retryEligible: boolean;
  nextAutomaticRetryAt: string | null;
  reconciliationReason: string | null;
  refundState: "reported_unverified" | null;
  updatedAt: string;
};

export type BreezeReconciliationData = {
  sessions: BreezeSessionRow[];
  events: BreezeEventRow[];
  generatedAt: string;
};

export type BreezeRetryResult = { eventRef: number; outcomeCode: string | null; webhookState: string; httpStatus: number };

export const BREEZE_RELEASE_CONFIRMATION = "NO_PROVIDER_CAPTURE_CONFIRMED";

export function getBreezeReconciliation(): Promise<BreezeReconciliationData> {
  return adminApiRequest<BreezeReconciliationData>("/admin/breeze/reconciliation");
}

export function retryBreezeEvent(eventRef: number, reason: string): Promise<BreezeRetryResult> {
  return adminApiRequest<BreezeRetryResult>(`/admin/breeze/events/${eventRef}/retry`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function releaseBreezeCheckout(checkoutRef: number, reason: string): Promise<{ checkoutRef: number; outcomeCode: string }> {
  return adminApiRequest(`/admin/breeze/sessions/${checkoutRef}/release`, {
    method: "POST",
    body: JSON.stringify({ reason, confirmation: BREEZE_RELEASE_CONFIRMATION }),
  });
}
