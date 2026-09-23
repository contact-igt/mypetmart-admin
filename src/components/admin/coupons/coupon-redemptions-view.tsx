"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  getAdminCoupon,
  listAdminCouponRedemptions,
  type CouponRedemptionStatus,
} from "@/lib/api/admin-coupon-api";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatusBadge } from "../ui/status-badge";
import type { CouponRedemption } from "@/lib/api/admin-coupon-api";

const PAGE_SIZE = 20;

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CouponRedemptionsView({ couponId }: { couponId: string }) {
  const [status, setStatus] = useState<CouponRedemptionStatus | "">("");
  const [page, setPage] = useState(1);

  const couponFetcher = useCallback(() => getAdminCoupon(couponId), [couponId]);
  const { data: coupon, loading: couponLoading, error: couponError } = useAdminData(couponFetcher);

  const fetcher = useCallback(
    () => listAdminCouponRedemptions(couponId, { status: status || undefined, page, pageSize: PAGE_SIZE }),
    [couponId, status, page],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  const columns: Column<CouponRedemption>[] = [
    {
      key: "order",
      header: "Order",
      render: (r) => (
        <Link href={`/admin/orders/${r.orderId}`} className="font-medium text-primary-orange hover:underline">
          {r.orderNumber}
        </Link>
      ),
    },
    { key: "customerType", header: "Customer", render: (r) => <span className="capitalize">{r.customerType}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "eligibleSubtotal", header: "Eligible subtotal", className: "text-right", render: (r) => <span className="tabular-nums">₹{r.eligibleMerchandiseSubtotal}</span> },
    { key: "discount", header: "Discount amount", className: "text-right", render: (r) => <span className="tabular-nums font-semibold">₹{r.discountAmount}</span> },
    { key: "reservedAt", header: "Reserved", render: (r) => <span className="whitespace-nowrap text-xs">{formatDateTime(r.reservedAt)}</span> },
    { key: "resolvedAt", header: "Resolved", render: (r) => <span className="whitespace-nowrap text-xs">{formatDateTime(r.consumedAt ?? r.releasedAt)}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/coupons" className="text-xs font-semibold text-primary-orange hover:underline">
          &larr; Back to coupons
        </Link>
        <h1 className="mt-1 text-xl font-bold text-text-primary">
          {couponLoading ? "Redemption history" : couponError ? "Redemption history" : `${coupon?.code} — Redemption history`}
        </h1>
        <p className="mt-1 text-sm text-text-primary/60">
          Read-only. Every order this coupon was reserved, consumed, or released against — no automated action can be taken from here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CouponRedemptionStatus | "");
            setPage(1);
          }}
          aria-label="Filter by redemption status"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All statuses</option>
          <option value="reserved">Reserved</option>
          <option value="consumed">Consumed</option>
          <option value="released">Released</option>
        </select>
      </div>

      {loading && <LoadingState label="Loading redemption history…" />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && <EmptyState title="No redemptions match these filters" description="This coupon has not been used on any order yet." />}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <DataTable columns={columns} rows={data.items} getRowId={(r) => r.id} />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
