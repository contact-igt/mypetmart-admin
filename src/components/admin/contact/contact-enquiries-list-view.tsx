"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAdminContactEnquiries, type ContactEnquiry, type ContactEnquiryStatus } from "@/lib/api/admin-contact-api";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatusBadge } from "../ui/status-badge";
import { SearchIcon } from "@/components/icons";

const STATUSES: ContactEnquiryStatus[] = ["new", "in_progress", "resolved", "closed"];
const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function ContactEnquiriesListView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContactEnquiryStatus | "">("");
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () => fetchAdminContactEnquiries({ search, status: status || undefined, page, pageSize: PAGE_SIZE }),
    [search, status, page],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  const columns: Column<ContactEnquiry>[] = [
    { key: "enquiryNumber", header: "Enquiry #", render: (e) => <span className="font-mono text-xs font-medium">{e.enquiryNumber}</span> },
    { key: "name", header: "Customer", render: (e) => <span className="font-medium">{e.name}</span> },
    { key: "contact", header: "Contact", render: (e) => <span className="text-xs text-text-primary/70">{e.email}{e.phone ? ` · ${e.phone}` : ""}</span> },
    { key: "subject", header: "Subject", render: (e) => e.subject },
    { key: "orderNumber", header: "Order #", render: (e) => e.orderNumber ?? <span className="text-text-primary/40">—</span> },
    { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status} /> },
    { key: "createdAt", header: "Received", render: (e) => formatDate(e.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Contact Enquiries</h1>
        <p className="mt-1 text-sm text-text-primary/60">
          {data?.total ?? "…"} enquiries submitted through the Storefront Contact form.
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
            placeholder="Search name, email, phone, order #…"
            aria-label="Search enquiries"
            className="h-9 w-80 rounded-lg border border-border-subtle bg-white pl-8 pr-3 text-sm focus-visible:border-primary-orange"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ContactEnquiryStatus | "");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingState label="Loading enquiries…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && <EmptyState title="No enquiries match these filters" />}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <DataTable columns={columns} rows={data.items} getRowId={(e) => e.id} onRowClick={(e) => router.push(`/admin/contact-enquiries/${e.id}`)} />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
