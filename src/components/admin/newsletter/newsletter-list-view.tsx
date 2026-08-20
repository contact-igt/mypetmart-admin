"use client";

import { useCallback, useState } from "react";
import { fetchAdminNewsletterSubscribers } from "@/lib/api/admin-newsletter-api";
import type { NewsletterSubscriber, NewsletterSubscriberStatus } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatusBadge } from "../ui/status-badge";
import { SearchIcon } from "@/components/icons";

const STATUSES: NewsletterSubscriberStatus[] = ["pending", "subscribed", "unsubscribed"];
const PAGE_SIZE = 10;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function NewsletterListView() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<NewsletterSubscriberStatus | "">("");
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () => fetchAdminNewsletterSubscribers({ search, status: status || undefined, page, pageSize: PAGE_SIZE }),
    [search, status, page],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  const columns: Column<NewsletterSubscriber>[] = [
    { key: "email", header: "Email", render: (s) => <span className="font-medium">{s.email}</span> },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    { key: "source", header: "Source", render: (s) => <span className="capitalize">{s.source ?? "—"}</span> },
    { key: "verifiedAt", header: "Confirmed", render: (s) => formatDate(s.verifiedAt) },
    { key: "createdAt", header: "Signed up", render: (s) => formatDate(s.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Newsletter</h1>
        <p className="mt-1 text-sm text-text-primary/60">
          {data?.total ?? "…"} subscribers. Double opt-in list-building only — no campaign sending yet.
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
            placeholder="Search email…"
            aria-label="Search subscribers"
            className="h-9 w-72 rounded-lg border border-border-subtle bg-white pl-8 pr-3 text-sm focus-visible:border-primary-orange"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as NewsletterSubscriberStatus | "");
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

      {loading && <LoadingState label="Loading subscribers…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState title="No subscribers match these filters" />
      )}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <DataTable columns={columns} rows={data.items} getRowId={(s) => s.id} />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
