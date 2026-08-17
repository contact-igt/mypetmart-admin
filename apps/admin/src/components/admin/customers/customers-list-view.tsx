"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAdminCustomers } from "@/lib/api/admin-customer-api";
import type { Customer } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatusBadge } from "../ui/status-badge";
import { SearchIcon } from "@/components/icons";

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function CustomersListView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () => fetchAdminCustomers({ search, page, pageSize: PAGE_SIZE }),
    [search, page],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  const columns: Column<Customer>[] = [
    {
      key: "referenceCode",
      header: "Ref Code",
      render: (c) => <span className="font-mono text-xs font-semibold text-text-primary/70">{c.referenceCode ?? `CUS-${c.id}`}</span>,
    },
    { key: "name", header: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
    { key: "email", header: "Email", render: (c) => c.email },
    { key: "phone", header: "Phone", render: (c) => c.phone },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge status={c.status ?? "active"} />,
    },
    { key: "joinedAt", header: "Joined", render: (c) => formatDate(c.joinedAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Customers</h1>
        <p className="mt-1 text-sm text-text-primary/60">{data?.total ?? "…"} customers in system.</p>
      </div>

      <div className="relative w-72">
        <SearchIcon width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/40" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search name, email, ref code…"
          aria-label="Search customers"
          className="h-9 w-full rounded-lg border border-border-subtle bg-white pl-8 pr-3 text-sm focus-visible:border-primary-orange"
        />
      </div>

      {loading && <LoadingState label="Loading customers…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState title="No customers match this search" />
      )}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <DataTable
            columns={columns}
            rows={data.items}
            getRowId={(c) => String(c.id)}
            onRowClick={(c) => router.push(`/admin/customers/${c.id}`)}
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
