"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminRepository } from "@/data/admin/mock-repository";
import type { Order } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { StatCard } from "../ui/stat-card";
import { StatusBadge } from "../ui/status-badge";
import { MailIcon, PhoneIcon, PinIcon } from "@/components/icons";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const router = useRouter();
  const fetcher = useCallback(
    async () => {
      const [customer, orders] = await Promise.all([
        adminRepository.getCustomer(customerId),
        adminRepository.getCustomerOrders(customerId),
      ]);
      return { customer, orders };
    },
    [customerId],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  if (loading) return <LoadingState label="Loading customer…" />;
  if (error || !data?.customer) return <ErrorState message={error ?? "Customer not found."} onRetry={reload} />;

  const { customer, orders } = data;
  const totalSpent = orders.reduce((sum, o) => sum + (o.status === "cancelled" ? 0 : o.total), 0);
  const avgOrder = orders.length > 0 ? totalSpent / orders.length : 0;

  const columns: Column<Order>[] = [
    { key: "orderNumber", header: "Order", render: (o) => <span className="font-medium">{o.orderNumber}</span> },
    { key: "placedAt", header: "Date", render: (o) => formatDate(o.placedAt) },
    { key: "total", header: "Total", render: (o) => currency.format(o.total) },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/customers" className="text-xs font-semibold text-primary-orange hover:underline">
          &larr; Back to customers
        </Link>
        <h1 className="mt-1 text-xl font-bold text-text-primary">{customer.name}</h1>
        <p className="mt-1 text-sm text-text-primary/60">Customer since {formatDate(customer.joinedAt)}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total orders" value={String(orders.length)} />
        <StatCard label="Total spent" value={currency.format(totalSpent)} />
        <StatCard label="Average order" value={currency.format(avgOrder)} />
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
          <h2 className="mb-2 text-sm font-semibold text-text-primary">Order history</h2>
          {orders.length === 0 ? (
            <EmptyState title="No orders yet" description="This customer hasn't placed any demo orders." />
          ) : (
            <DataTable
              columns={columns}
              rows={orders}
              getRowId={(o) => o.id}
              onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
