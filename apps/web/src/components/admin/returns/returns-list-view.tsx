"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { adminRepository } from "@/data/admin/mock-repository";
import type { ReturnRequest, ReturnStatus } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatusBadge } from "../ui/status-badge";
import { SearchIcon } from "@/components/icons";

const STATUSES: ReturnStatus[] = ["requested", "approved", "rejected", "resolved"];
const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function ReturnsListView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReturnStatus | "">("");
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () => adminRepository.listReturns({ search, status: status || undefined, page, pageSize: PAGE_SIZE }),
    [search, status, page],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  const columns: Column<ReturnRequest>[] = [
    { key: "orderNumber", header: "Order", render: (r) => <span className="font-medium">{r.orderNumber}</span> },
    { key: "customerName", header: "Customer", render: (r) => r.customerName },
    { key: "productName", header: "Product", render: (r) => r.productName },
    { key: "type", header: "Type", render: (r) => <span className="capitalize">{r.type}</span> },
    { key: "requestedAt", header: "Requested", render: (r) => formatDate(r.requestedAt) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Returns &amp; replacements</h1>
        <p className="mt-1 text-sm text-text-primary/60">
          {data?.total ?? "…"} requests. Manual review only — no automated refunds or pickup workflows.
        </p>
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
            placeholder="Search order, customer, product…"
            aria-label="Search returns"
            className="h-9 w-72 rounded-lg border border-border-subtle bg-white pl-8 pr-3 text-sm focus-visible:border-primary-orange"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ReturnStatus | "");
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
      </div>

      {loading && <LoadingState label="Loading returns…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState title="No return requests match these filters" />
      )}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <DataTable
            columns={columns}
            rows={data.items}
            getRowId={(r) => r.id}
            onRowClick={(r) => router.push(`/admin/returns/${r.id}`)}
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
