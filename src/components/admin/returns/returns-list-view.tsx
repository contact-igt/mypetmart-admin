"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { listAdminReturns, type AdminReturnListItem, type ReturnResolution, type ReturnStatus } from "@/lib/api/admin-return-api";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatusBadge } from "../ui/status-badge";

const STATUSES: ReturnStatus[] = ["requested", "approved", "rejected", "resolved", "cancelled"];
const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function ReturnsListView() {
  const router = useRouter();
  const [status, setStatus] = useState<ReturnStatus | "">("");
  const [resolution, setResolution] = useState<ReturnResolution | "">("");
  const [page, setPage] = useState(1);

  const fetcher = useCallback(() => listAdminReturns({ status: status || undefined, resolution: resolution || undefined, page, pageSize: PAGE_SIZE }), [status, resolution, page]);
  const { data, loading, error, reload } = useAdminData(fetcher);

  const columns: Column<AdminReturnListItem>[] = [
    { key: "returnNumber", header: "Return", render: (r) => <span className="font-mono text-xs font-medium">{r.returnNumber}</span> },
    { key: "orderNumber", header: "Order", render: (r) => <span className="font-medium">{r.orderNumber}</span> },
    { key: "productName", header: "Product", render: (r) => r.productName },
    { key: "quantity", header: "Qty", render: (r) => r.quantity },
    { key: "resolution", header: "Resolution", render: (r) => <span className="capitalize">{r.resolution}</span> },
    { key: "requestedAt", header: "Requested", render: (r) => formatDate(r.requestedAt) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "refund",
      header: "Outcome",
      render: (r) => {
        const refund = r.refunds[0];
        if (r.replacement) return <StatusBadge status={r.replacement.status} />;
        if (!refund) return <span className="text-text-primary/40">—</span>;
        return <StatusBadge status={refund.status} />;
      }
    }
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Returns &amp; refunds</h1>
        <p className="mt-1 text-sm text-text-primary/60">
          {data?.total ?? "…"} requests. Refunds are always Admin-initiated after approval — never automatic.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
        <select
          value={resolution}
          onChange={(e) => {
            setResolution(e.target.value as ReturnResolution | "");
            setPage(1);
          }}
          aria-label="Filter by resolution"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All resolutions</option>
          <option value="refund">Refund</option>
          <option value="replacement">Replacement</option>
        </select>
      </div>

      {loading && <LoadingState label="Loading returns…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && <EmptyState title="No return requests match these filters" />}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <DataTable columns={columns} rows={data.items} getRowId={(r) => String(r.id)} onRowClick={(r) => router.push(`/admin/returns/${r.id}`)} />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
