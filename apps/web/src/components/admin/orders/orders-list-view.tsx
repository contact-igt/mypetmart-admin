"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { adminRepository } from "@/data/admin/mock-repository";
import type { Order, OrderStatus } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatusBadge } from "../ui/status-badge";
import { SearchIcon } from "@/components/icons";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];
const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function OrdersListView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () =>
      adminRepository.listOrders({
        search,
        status: status || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [search, status, from, to, page],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  const columns: Column<Order>[] = [
    { key: "orderNumber", header: "Order", render: (o) => <span className="font-medium">{o.orderNumber}</span> },
    { key: "customerName", header: "Customer", render: (o) => o.customerName },
    { key: "placedAt", header: "Date", render: (o) => formatDate(o.placedAt) },
    { key: "items", header: "Items", render: (o) => o.items.reduce((sum, i) => sum + i.quantity, 0) },
    { key: "total", header: "Total", render: (o) => currency.format(o.total) },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Orders</h1>
        <p className="mt-1 text-sm text-text-primary/60">{data?.total ?? "…"} orders in the demo dataset.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/40" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search order # or customer…"
            aria-label="Search orders"
            className="h-9 w-64 rounded-lg border border-border-subtle bg-white pl-8 pr-3 text-sm focus-visible:border-primary-orange"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | "");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-text-primary/60">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-border-subtle bg-white px-2 text-sm focus-visible:border-primary-orange"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-text-primary/60">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-border-subtle bg-white px-2 text-sm focus-visible:border-primary-orange"
          />
        </label>
      </div>

      {loading && <LoadingState label="Loading orders…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState title="No orders match these filters" description="Try widening the date range or clearing filters." />
      )}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <DataTable
            columns={columns}
            rows={data.items}
            getRowId={(o) => o.id}
            onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
