"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listAdminReviews, type AdminReviewListItem, type ReviewSource, type ReviewStatus } from "@/lib/api/admin-review-api";
import { resolveDisplayReviewDate } from "@/lib/review-date";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatusBadge } from "../ui/status-badge";
import { PlusIcon } from "@/components/icons";

const STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];
const SOURCES: ReviewSource[] = ["customer", "admin"];
const RATINGS = [5, 4, 3, 2, 1];
const PAGE_SIZE = 10;

function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function ReviewsListView() {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [source, setSource] = useState<ReviewSource | "">("");
  const [rating, setRating] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () => listAdminReviews({ status: status || undefined, source: source || undefined, rating: rating || undefined, search: search.trim() || undefined, page, pageSize: PAGE_SIZE }),
    [status, source, rating, search, page]
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  const columns: Column<AdminReviewListItem>[] = [
    { key: "review", header: "Review", render: (r) => <span className="line-clamp-2">{r.title ? <strong className="mr-1">{r.title}</strong> : null}{truncate(r.review)}</span> },
    { key: "productName", header: "Product", render: (r) => r.productName },
    { key: "customerName", header: "Customer", render: (r) => r.customerName },
    { key: "rating", header: "Rating", render: (r) => <span aria-label={`${r.rating} out of 5 stars`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span> },
    { key: "reviewSource", header: "Source", render: (r) => (r.reviewSource === "admin" ? <span className="text-xs font-semibold text-text-primary/70">Admin</span> : <span className="text-xs text-text-primary/50">Customer</span>) },
    { key: "verifiedPurchase", header: "Verified", render: (r) => (r.verifiedPurchase ? <span className="text-xs font-semibold text-primary-orange">Verified</span> : <span className="text-text-primary/40">—</span>) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "createdAt",
      header: "Review date",
      render: (r) => (
        <span className="whitespace-nowrap">
          {resolveDisplayReviewDate(r)}
          {r.reviewDate ? <span className="block text-[11px] text-text-primary/40">Custom</span> : null}
        </span>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Product Reviews</h1>
          <p className="mt-1 text-sm text-text-primary/60">{data?.total ?? "…"} reviews. Only Admin-approved reviews are ever shown on the Storefront.</p>
        </div>
        <Link
          href="/admin/product-reviews/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <PlusIcon width={13} /> Add Review
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as ReviewStatus | ""); setPage(1); }}
          aria-label="Filter by status"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value as ReviewSource | ""); setPage(1); }}
          aria-label="Filter by source"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All sources</option>
          {SOURCES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={rating}
          onChange={(e) => { setRating(e.target.value ? Number(e.target.value) : ""); setPage(1); }}
          aria-label="Filter by rating"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All ratings</option>
          {RATINGS.map((r) => <option key={r} value={r}>{r} star{r === 1 ? "" : "s"}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search review text or title…"
          aria-label="Search reviews"
          className="h-9 w-56 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        />
      </div>

      {loading && <LoadingState label="Loading reviews…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && <EmptyState title="No reviews match these filters" />}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <DataTable columns={columns} rows={data.items} getRowId={(r) => String(r.id)} onRowClick={(r) => router.push(`/admin/product-reviews/${r.id}`)} />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
