"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  describeAdminError,
  fromBasisPoints,
  fromPaise,
  listAdminCoupons,
  setAdminCouponStatus,
  type Coupon,
  type CouponDiscountType,
  type CouponStatus,
} from "@/lib/api/admin-coupon-api";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatusBadge } from "../ui/status-badge";
import { useToast } from "../ui/toast";
import { PencilIcon, PlusIcon, SearchIcon } from "@/components/icons";

const PAGE_SIZE = 20;
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function discountLabel(coupon: Coupon): string {
  if (coupon.discountType === "percentage") {
    const pct = fromBasisPoints(coupon.discountValue);
    const capped = coupon.maxDiscountPaise !== null ? ` (up to ${currency.format(fromPaise(coupon.maxDiscountPaise))})` : "";
    return `${pct}% off${capped}`;
  }
  return `${currency.format(fromPaise(coupon.discountValue))} off`;
}

function validityLabel(coupon: Coupon): string {
  if (!coupon.startsAt && !coupon.endsAt) return "Always valid";
  if (coupon.startsAt && coupon.endsAt) return `${formatDate(coupon.startsAt)} – ${formatDate(coupon.endsAt)}`;
  if (coupon.startsAt) return `From ${formatDate(coupon.startsAt)}`;
  return `Until ${formatDate(coupon.endsAt)}`;
}

export function CouponsListView() {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<CouponStatus | "">("");
  const [discountType, setDiscountType] = useState<CouponDiscountType | "">("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetcher = useCallback(
    () =>
      listAdminCoupons({
        search: debouncedSearch || undefined,
        status: status || undefined,
        discountType: discountType || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [debouncedSearch, status, discountType, page],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  function resetPage() {
    setPage(1);
  }

  async function toggleStatus(coupon: Coupon) {
    const next: CouponStatus = coupon.status === "active" ? "inactive" : "active";
    setBusyId(coupon.id);
    try {
      await setAdminCouponStatus(coupon.id, next);
      showToast(next === "active" ? `"${coupon.code}" activated.` : `"${coupon.code}" deactivated.`);
      reload();
    } catch (cause) {
      showToast(describeAdminError(cause, "Could not update coupon status."), "error");
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters = Boolean(search || status || discountType);
  function clearFilters() {
    setSearch("");
    setStatus("");
    setDiscountType("");
    setPage(1);
  }

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      header: "Coupon",
      render: (c) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-mono text-sm font-semibold text-text-primary">{c.code}</p>
            {c.paymentMethodEligibility === "payu" && (
              <span className="rounded bg-mint-sage/40 px-1.5 py-0.5 text-[10px] font-medium text-deep-brown" title="Prepaid only">Prepaid</span>
            )}
            {c.paymentMethodEligibility === "cod" && (
              <span className="rounded bg-peach-hero/60 px-1.5 py-0.5 text-[10px] font-medium text-deep-brown" title="Cash on Delivery only">COD</span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-text-primary/50">{c.name}</p>
        </div>
      ),
    },
    { key: "discount", header: "Discount", render: (c) => <span className="whitespace-nowrap">{discountLabel(c)}</span> },
    { key: "used", header: "Used", className: "text-right", render: (c) => <span className="tabular-nums">{c.usedCount}</span> },
    {
      key: "remaining",
      header: "Remaining",
      className: "text-right",
      render: (c) => <span className="tabular-nums">{c.remainingUses === null ? "Unlimited" : c.remainingUses}</span>,
    },
    { key: "validity", header: "Validity", render: (c) => <span className="whitespace-nowrap text-xs">{validityLabel(c)}</span> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/admin/coupons/${c.id}/edit`}
            title="Edit"
            aria-label={`Edit ${c.code}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-white text-text-primary/70 transition hover:border-primary-orange/40 hover:bg-primary-orange/5 hover:text-primary-orange"
          >
            <PencilIcon className="h-4 w-4" />
          </Link>
          <button
            type="button"
            disabled={busyId === c.id}
            onClick={() => void toggleStatus(c)}
            className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              c.status === "active"
                ? "border-terracotta/25 bg-white text-terracotta hover:bg-terracotta/10"
                : "border-transparent bg-primary-orange text-white hover:opacity-90"
            }`}
          >
            {c.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Coupons</h1>
          <p className="mt-1 text-sm text-text-primary/60">{data?.total ?? "…"} coupons.</p>
        </div>
        <Link href="/admin/coupons/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white">
          <PlusIcon width={14} /> Add coupon
        </Link>
      </div>

      <section aria-label="Coupon list controls" className="rounded-xl border border-border-subtle bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="relative sm:col-span-1">
            <span className="sr-only">Search coupons</span>
            <SearchIcon className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-text-primary/40" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              placeholder="Search code or name"
              className="h-11 w-full rounded-lg border border-border-subtle bg-white pl-10 pr-3 text-sm outline-none transition focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/10"
            />
          </label>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as CouponStatus | "");
              resetPage();
            }}
            className="h-11 rounded-lg border border-border-subtle bg-white px-3 text-sm outline-none transition focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/10"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            aria-label="Filter by discount type"
            value={discountType}
            onChange={(event) => {
              setDiscountType(event.target.value as CouponDiscountType | "");
              resetPage();
            }}
            className="h-11 rounded-lg border border-border-subtle bg-white px-3 text-sm outline-none transition focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/10"
          >
            <option value="">All discount types</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </div>
        {hasFilters && (
          <div className="mt-3 flex justify-end border-t border-border-subtle/70 pt-3">
            <button type="button" onClick={clearFilters} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-primary-orange transition hover:bg-primary-orange/5">
              Clear filters
            </button>
          </div>
        )}
      </section>

      {loading && <LoadingState label="Loading coupons…" />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState
          title="No coupons found"
          description={hasFilters ? "Clear filters or change the search." : "Create the first coupon."}
          action={hasFilters ? <button onClick={clearFilters} className="font-semibold text-primary-orange">Clear filters</button> : <Link href="/admin/coupons/new" className="font-semibold text-primary-orange">Add coupon</Link>}
        />
      )}
      {!loading && !error && data && data.items.length > 0 && (
        <div>
          <DataTable
            columns={columns}
            rows={data.items}
            getRowId={(c) => c.id}
            onRowClick={(c) => router.push(`/admin/coupons/${c.id}/redemptions`)}
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
