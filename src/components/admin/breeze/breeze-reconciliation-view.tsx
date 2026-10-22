"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getBreezeReconciliation,
  releaseBreezeCheckout,
  retryBreezeEvent,
  type BreezeEventRow,
  type BreezeReconciliationData,
  type BreezeSessionRow,
} from "@/lib/api/admin-breeze-api";

// Staff view of Breeze checkouts and webhook events. Shows references and
// states only: no payloads, no contact details, no credentials are fetched.
// Refunds are shown as "reported, unverified" — Breeze exposes no verified
// refund API, so nothing here marks a refund completed.
// Errors are shown inline next to the action (no toasts).

const MIN_REASON = 10;

function formatTime(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-IN") : "—";
}

function ReasonForm({
  label,
  onSubmit,
  busy,
  error,
}: {
  label: string;
  onSubmit: (reason: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= MIN_REASON;
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSubmit(reason.trim());
      }}
    >
      <label className="text-xs font-medium text-text-muted" htmlFor={`reason-${label}`}>
        Reason (recorded in the audit log, at least {MIN_REASON} characters)
      </label>
      <input
        id={`reason-${label}`}
        className="h-9 rounded-md border border-border-subtle px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={500}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!valid || busy}
          className="h-9 rounded-md border border-border-subtle px-3 text-sm font-semibold disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {busy ? "Working…" : label}
        </button>
        {error ? (
          <p role="alert" className="text-xs text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function BreezeReconciliationView() {
  const [data, setData] = useState<BreezeReconciliationData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [openForm, setOpenForm] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getBreezeReconciliation());
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load Breeze reconciliation.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (key: string, action: () => Promise<unknown>) => {
    setBusyKey(key);
    setActionError((current) => ({ ...current, [key]: "" }));
    try {
      await action();
      setOpenForm(null);
      await load();
    } catch (error) {
      setActionError((current) => ({ ...current, [key]: error instanceof Error ? error.message : "The action failed." }));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Breeze reconciliation</h1>
        <p className="text-sm text-text-muted">
          Checkouts and webhook events that need attention. Retries re-run the same safety gates; nothing here marks a payment as paid.
        </p>
        {data ? <p className="text-xs text-text-muted">Updated {formatTime(data.generatedAt)}</p> : null}
        <div>
          <button type="button" onClick={() => void load()} className="h-8 rounded-md border border-border-subtle px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">
            Refresh
          </button>
        </div>
      </header>

      {loadError ? (
        <p role="alert" className="text-sm text-red-700">
          {loadError}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <h2 className="mb-2 text-base font-semibold">Webhook events</h2>
        {data && data.events.length === 0 ? <p className="text-sm text-text-muted">No events need attention.</p> : null}
        {data && data.events.length > 0 ? (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-text-muted">
              <tr>
                <th className="py-2 pr-3">Event</th>
                <th className="py-2 pr-3">Webhook state</th>
                <th className="py-2 pr-3">Outcome</th>
                <th className="py-2 pr-3">Attempts</th>
                <th className="py-2 pr-3">Next automatic retry</th>
                <th className="py-2 pr-3">Refund</th>
                <th className="py-2 pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((event: BreezeEventRow) => {
                const key = `event-${event.eventRef}`;
                return (
                  <tr key={event.eventRef} className="border-t border-border-subtle align-top">
                    <td className="py-2 pr-3">
                      <div className="font-mono text-xs">{event.providerEventId}</div>
                      <div className="text-xs text-text-muted">Ref {event.eventRef} · {formatTime(event.updatedAt)}</div>
                    </td>
                    <td className="py-2 pr-3">{event.webhookState}</td>
                    <td className="py-2 pr-3">{event.outcomeCode ?? event.reconciliationReason ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {event.attempts} / {event.maxAttempts}
                    </td>
                    <td className="py-2 pr-3">{event.retryEligible ? formatTime(event.nextAutomaticRetryAt) : "Manual only"}</td>
                    <td className="py-2 pr-3">{event.refundState === "reported_unverified" ? "Reported (unverified)" : "—"}</td>
                    <td className="py-2 pr-3">
                      {event.webhookState === "received" || event.webhookState === "reconciliation_required" ? (
                        openForm === key ? (
                          <ReasonForm
                            label="Retry event"
                            busy={busyKey === key}
                            error={actionError[key] || null}
                            onSubmit={(reason) => void runAction(key, () => retryBreezeEvent(event.eventRef, reason))}
                          />
                        ) : (
                          <button type="button" onClick={() => setOpenForm(key)} className="h-8 rounded-md border border-border-subtle px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">
                            Retry…
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-text-muted">Concluded</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <h2 className="mb-2 text-base font-semibold">Checkouts</h2>
        {data && data.sessions.length === 0 ? <p className="text-sm text-text-muted">No open checkouts.</p> : null}
        {data && data.sessions.length > 0 ? (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs text-text-muted">
              <tr>
                <th className="py-2 pr-3">Checkout</th>
                <th className="py-2 pr-3">Order</th>
                <th className="py-2 pr-3">Payment</th>
                <th className="py-2 pr-3">Breeze references</th>
                <th className="py-2 pr-3">State</th>
                <th className="py-2 pr-3">Timestamps</th>
                <th className="py-2 pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((session: BreezeSessionRow) => {
                const key = `session-${session.checkoutRef}`;
                const releasable = session.processingStatus === "awaiting_webhook" && session.orderId === null;
                return (
                  <tr key={session.checkoutRef} className="border-t border-border-subtle align-top">
                    <td className="py-2 pr-3">Ref {session.checkoutRef}</td>
                    <td className="py-2 pr-3">{session.orderNumber ?? "—"}</td>
                    <td className="py-2 pr-3">{session.paymentId ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      <div>Order {session.breezeOrderId ?? "—"}</div>
                      <div>Txn {session.breezeTransactionId ?? "—"}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <div>{session.processingStatus}</div>
                      <div className="text-xs text-text-muted">
                        Launch: {session.launchStatus}
                        {session.unresolvedTooLong ? " · unresolved too long" : ""}
                        {session.commerceException ? ` · ${session.commerceException}` : ""}
                      </div>
                      {session.lastErrorCode ? <div className="text-xs text-text-muted">Last error {session.lastErrorCode}</div> : null}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      <div>Created {formatTime(session.createdAt)}</div>
                      <div>Updated {formatTime(session.updatedAt)}</div>
                    </td>
                    <td className="py-2 pr-3">
                      {releasable ? (
                        openForm === key ? (
                          <div className="flex flex-col gap-2">
                            <p className="max-w-xs text-xs text-text-muted">
                              Release only after confirming in the Breeze dashboard that no payment was captured. Super admins only.
                            </p>
                            <ReasonForm
                              label="Release checkout"
                              busy={busyKey === key}
                              error={actionError[key] || null}
                              onSubmit={(reason) => void runAction(key, () => releaseBreezeCheckout(session.checkoutRef, reason))}
                            />
                          </div>
                        ) : (
                          <button type="button" onClick={() => setOpenForm(key)} className="h-8 rounded-md border border-border-subtle px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">
                            Release…
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-text-muted">No action</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
