"use client";

import Link from "next/link";
import { useCallback } from "react";
import { fetchAdminCustomerDetail } from "@/lib/api/admin-customer-api";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState } from "../ui/empty-state";
import { StatCard } from "../ui/stat-card";
import { StatusBadge } from "../ui/status-badge";
import { MailIcon, PhoneIcon, PinIcon } from "@/components/icons";

function formatDate(iso?: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const fetcher = useCallback(
    () => fetchAdminCustomerDetail(customerId),
    [customerId],
  );
  const { data: customer, loading, error, reload } = useAdminData(fetcher);

  if (loading) return <LoadingState label="Loading customer profile…" />;
  if (error || !customer) return <ErrorState message={error ?? "Customer not found."} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/customers" className="text-xs font-semibold text-primary-orange hover:underline">
          &larr; Back to customers
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary">{customer.name}</h1>
          <span className="font-mono text-xs font-semibold text-text-primary/70 rounded bg-cream-bg px-2 py-0.5 border border-border-subtle">
            {customer.referenceCode ?? `CUS-${customer.id}`}
          </span>
          <StatusBadge status={customer.status ?? "active"} />
        </div>
        <p className="mt-1 text-sm text-text-primary/60">
          Customer since {formatDate(customer.joinedAt)} · Last login: {formatDate(customer.lastLoginAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Account Status" value={customer.status === "disabled" ? "Disabled" : "Active"} />
        <StatCard label="Numeric DB ID" value={String(customer.id)} />
        <StatCard label="Addresses Count" value={String(customer.addresses?.length ?? 0)} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-border-subtle bg-white p-5">
          <h2 className="text-sm font-semibold text-text-primary">Contact information</h2>
          <ul className="mt-3 flex flex-col gap-2.5 text-sm">
            <li className="flex items-start gap-2">
              <MailIcon width={15} height={15} className="mt-0.5 shrink-0 text-text-primary/50" />
              <span className="text-text-primary">{customer.email}</span>
            </li>
            <li className="flex items-start gap-2">
              <PhoneIcon width={15} height={15} className="mt-0.5 shrink-0 text-text-primary/50" />
              <span className="text-text-primary">{customer.phone}</span>
            </li>
            <li className="flex items-start gap-2">
              <PinIcon width={15} height={15} className="mt-0.5 shrink-0 text-text-primary/50" />
              <span className="text-text-primary">{customer.address}</span>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-text-primary">Saved Addresses</h2>
          {!customer.addresses || customer.addresses.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-white p-6 text-center text-sm text-text-primary/60">
              No saved addresses found for this customer.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {customer.addresses.map((addr) => (
                <div key={addr.id} className="rounded-xl border border-border-subtle bg-white p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">{addr.fullName}</span>
                    {addr.isDefault && (
                      <span className="rounded bg-primary-orange/10 px-2 py-0.5 text-xs font-medium text-primary-orange">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-text-primary/70">{addr.phone}</p>
                  <p className="mt-1 text-text-primary/80">
                    {addr.addressLine1}
                    {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                  </p>
                  <p className="text-text-primary/80">
                    {addr.city}, {addr.state} - {addr.postalCode}
                  </p>
                  <p className="text-xs text-text-primary/50 uppercase mt-1">{addr.countryCode}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
