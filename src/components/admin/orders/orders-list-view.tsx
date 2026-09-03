"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/admin-auth-context";
import { listAdminProducts } from "@/lib/api/admin-product-api";
import {
  addAdminOrderNote,
  bulkUpdateAdminOrderStatus,
  getAdminOrderSummary,
  listAdminOrders,
  updateAdminOrderStatus,
  type AdminOrderListItem,
  type FulfilmentStatus,
  type OrderStatus,
  type PaymentStatus
} from "@/lib/api/admin-order-api";
import { getValidNextOrderStatuses, isDestructiveOrderTransition } from "@/data/admin/order-status-rules";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatCard } from "../ui/stat-card";
import { StatusBadge } from "../ui/status-badge";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { Dialog } from "../ui/dialog";
import { useToast } from "../ui/toast";
import { SearchIcon } from "@/components/icons";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "return_requested"];
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];
const FULFILMENT_STATUSES: FulfilmentStatus[] = ["unfulfilled", "processing", "packed", "shipped", "delivered"];
const PAGE_SIZE = 10;

type SortKey = "newest" | "oldest" | "highest" | "lowest";
const SORT_OPTIONS: { key: SortKey; label: string; sortBy: "placedAt" | "total"; sortDir: "ASC" | "DESC" }[] = [
  { key: "newest", label: "Newest", sortBy: "placedAt", sortDir: "DESC" },
  { key: "oldest", label: "Oldest", sortBy: "placedAt", sortDir: "ASC" },
  { key: "highest", label: "Highest value", sortBy: "total", sortDir: "DESC" },
  { key: "lowest", label: "Lowest value", sortBy: "total", sortDir: "ASC" }
];

// getValidNextOrderStatuses/isDestructiveOrderTransition still power UX gating
// here (per-row dropdown options, destructive-transition confirmation) — the
// real Backend independently re-validates every transition and is what's
// actually authoritative; this is purely a nicer default option list.
const BULK_ACTIONS: { status: OrderStatus; label: string }[] = [
  { status: "confirmed", label: "Mark confirmed" },
  { status: "processing", label: "Mark processing" },
  { status: "shipped", label: "Mark shipped" }
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(amount: string, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(Number(amount));
  } catch {
    return `${currencyCode} ${amount}`;
  }
}

export function OrdersListView() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAdminAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [fulfilmentStatus, setFulfilmentStatus] = useState<FulfilmentStatus | "">("");
  const [productId, setProductId] = useState("");
  const [state, setState] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortBy, setSortBy] = useState<"placedAt" | "total">("placedAt");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const [productOptions, setProductOptions] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    listAdminProducts({ pageSize: 100, sort: "name", order: "ASC" }).then((res) =>
      setProductOptions(res.items.map((p) => ({ id: p.id, name: p.name })))
    );
  }, []);

  const summaryFetcher = useCallback(() => getAdminOrderSummary(), []);
  const { data: summary, reload: reloadSummary } = useAdminData(summaryFetcher);

  const fetcher = useCallback(
    () =>
      listAdminOrders({
        search: debouncedSearch || undefined,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        fulfilmentStatus: fulfilmentStatus || undefined,
        productId: productId ? Number(productId) : undefined,
        state: state || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
        sortBy,
        sortDir,
        page,
        pageSize: PAGE_SIZE
      }),
    [debouncedSearch, status, paymentStatus, fulfilmentStatus, productId, state, from, to, sortBy, sortDir, page]
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  function refreshAll() {
    reload();
    reloadSummary();
  }

  function resetPage() {
    setPage(1);
  }

  const activeSortKey = SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.sortDir === sortDir)?.key ?? "newest";

  function handleSortSelect(key: SortKey) {
    const option = SORT_OPTIONS.find((o) => o.key === key);
    if (!option) return;
    setSortBy(option.sortBy);
    setSortDir(option.sortDir);
  }

  function clearAllFilters() {
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setFulfilmentStatus("");
    setProductId("");
    setState("");
    setFrom("");
    setTo("");
    setSortBy("placedAt");
    setSortDir("DESC");
    resetPage();
  }

  const hasActiveFilters = Boolean(
    search || status || paymentStatus || fulfilmentStatus || productId || state || from || to || sortBy !== "placedAt" || sortDir !== "DESC"
  );

  // ---- single-row inline status update ----
  const [pendingStatusChange, setPendingStatusChange] = useState<{ order: AdminOrderListItem; next: OrderStatus } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  async function applyStatusChange(order: AdminOrderListItem, next: OrderStatus) {
    setStatusUpdating(true);
    try {
      await updateAdminOrderStatus(order.id, next);
      showToast(`${order.orderNumber} marked as ${next.replace(/_/g, " ")}.`);
      setPendingStatusChange(null);
      refreshAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update the order.", "error");
    } finally {
      setStatusUpdating(false);
    }
  }

  function handleRowStatusSelect(order: AdminOrderListItem, next: OrderStatus) {
    if (isDestructiveOrderTransition(next)) {
      setPendingStatusChange({ order, next });
    } else {
      applyStatusChange(order, next);
    }
  }

  // ---- single-row quick note ----
  const [noteTarget, setNoteTarget] = useState<AdminOrderListItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  async function submitQuickNote(event: React.FormEvent) {
    event.preventDefault();
    if (!noteTarget || !noteText.trim()) return;
    setAddingNote(true);
    try {
      await addAdminOrderNote(noteTarget.id, noteText.trim());
      showToast("Note added.");
      setNoteTarget(null);
      setNoteText("");
    } catch {
      showToast("Could not add the note.", "error");
    } finally {
      setAddingNote(false);
    }
  }

  // ---- bulk actions ----
  const [pendingBulkAction, setPendingBulkAction] = useState<OrderStatus | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function applyBulkAction() {
    if (!pendingBulkAction) return;
    setBulkBusy(true);
    try {
      const result = await bulkUpdateAdminOrderStatus([...selectedIds].map(Number), pendingBulkAction);
      if (result.updated > 0) {
        showToast(
          `Updated ${result.updated} order${result.updated === 1 ? "" : "s"}${result.skipped > 0 ? ` — skipped ${result.skipped} that couldn't move to this status` : ""}.`
        );
      } else {
        showToast("No selected orders could move to that status.", "error");
      }
      setSelectedIds(new Set());
      setPendingBulkAction(null);
      refreshAll();
    } catch {
      showToast("Could not update the selected orders.", "error");
    } finally {
      setBulkBusy(false);
    }
  }

  const columns: Column<AdminOrderListItem>[] = [
    { key: "orderNumber", header: "Order", render: (o) => <span className="font-medium">{o.orderNumber}</span> },
    { key: "placedAt", header: "Date", render: (o) => formatDate(o.placedAt) },
    { key: "customer", header: "Customer", render: (o) => o.customer?.name ?? "Guest" },
    { key: "itemCount", header: "Items", render: (o) => o.itemCount },
    { key: "total", header: "Total", render: (o) => formatMoney(o.total, o.currency) },
    { key: "paymentStatus", header: "Payment", render: (o) => <StatusBadge status={o.paymentStatus} /> },
    { key: "fulfilmentStatus", header: "Fulfilment", render: (o) => <StatusBadge status={o.fulfilmentStatus} /> },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
    {
      key: "actions",
      header: "",
      render: (o) => {
        const nextOptions = getValidNextOrderStatuses(o.status).filter(
          (next) => next !== "cancelled" || o.paymentStatus !== "paid" || user?.role === "super_admin",
        );
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {nextOptions.length > 0 && (
              <select
                aria-label={`Update status for ${o.orderNumber}`}
                defaultValue=""
                onChange={(e) => {
                  const next = e.target.value as OrderStatus;
                  if (next) handleRowStatusSelect(o, next);
                  e.target.value = "";
                }}
                className="h-8 rounded-lg border border-border-subtle bg-white px-2 text-xs focus-visible:border-primary-orange"
              >
                <option value="">Update…</option>
                {nextOptions.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setNoteTarget(o)}
              className="rounded-lg border border-border-subtle px-2 py-1.5 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg"
            >
              + Note
            </button>
          </div>
        );
      },
      className: "text-right"
    }
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Orders</h1>
        <p className="mt-1 text-sm text-text-primary/60">{data?.total ?? "…"} orders.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total" value={String(summary?.total ?? "…")} />
        <StatCard label="Pending" value={String(summary?.pending ?? "…")} />
        <StatCard label="Processing" value={String(summary?.processing ?? "…")} />
        <StatCard label="Shipped" value={String(summary?.shipped ?? "…")} />
        <StatCard label="Delivered" value={String(summary?.delivered ?? "…")} />
        <StatCard label="Cancelled" value={String(summary?.cancelled ?? "…")} />
        <StatCard label="Returns" value={String(summary?.returnRequested ?? "…")} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/40" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="Order #, customer name, email or phone…"
            aria-label="Search orders"
            className="h-9 w-64 rounded-lg border border-border-subtle bg-white pl-8 pr-3 text-sm focus-visible:border-primary-orange"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | "");
            resetPage();
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
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value as PaymentStatus | "");
            resetPage();
          }}
          aria-label="Filter by payment status"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={fulfilmentStatus}
          onChange={(e) => {
            setFulfilmentStatus(e.target.value as FulfilmentStatus | "");
            resetPage();
          }}
          aria-label="Filter by fulfilment status"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All fulfilment</option>
          {FULFILMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            resetPage();
          }}
          aria-label="Filter by product"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All products</option>
          {productOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            resetPage();
          }}
          placeholder="State…"
          aria-label="Filter by state"
          className="h-9 w-32 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        />
        <label className="flex items-center gap-1.5 text-xs text-text-primary/60">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              resetPage();
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
              resetPage();
            }}
            className="h-9 rounded-lg border border-border-subtle bg-white px-2 text-sm focus-visible:border-primary-orange"
          />
        </label>
        <select
          value={activeSortKey}
          onChange={(e) => handleSortSelect(e.target.value as SortKey)}
          aria-label="Sort by"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {search && <FilterChip label={`Search: ${search}`} onRemove={() => { setSearch(""); resetPage(); }} />}
          {status && <FilterChip label={`Status: ${status.replace(/_/g, " ")}`} onRemove={() => { setStatus(""); resetPage(); }} />}
          {paymentStatus && <FilterChip label={`Payment: ${paymentStatus}`} onRemove={() => { setPaymentStatus(""); resetPage(); }} />}
          {fulfilmentStatus && <FilterChip label={`Fulfilment: ${fulfilmentStatus}`} onRemove={() => { setFulfilmentStatus(""); resetPage(); }} />}
          {productId && (
            <FilterChip
              label={`Product: ${productOptions.find((p) => String(p.id) === productId)?.name ?? productId}`}
              onRemove={() => { setProductId(""); resetPage(); }}
            />
          )}
          {state && <FilterChip label={`State: ${state}`} onRemove={() => { setState(""); resetPage(); }} />}
          {(from || to) && <FilterChip label={`Date: ${from || "…"} – ${to || "…"}`} onRemove={() => { setFrom(""); setTo(""); resetPage(); }} />}
          <button type="button" onClick={clearAllFilters} className="text-xs font-semibold text-primary-orange hover:underline">
            Clear all
          </button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-orange/30 bg-primary-orange/5 px-4 py-2.5 text-sm">
          <span className="font-medium text-text-primary">{selectedIds.size} selected</span>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setSelectedIds(new Set())} className="text-text-primary/60 hover:underline">
              Clear
            </button>
            {BULK_ACTIONS.map((action) => (
              <button
                key={action.status}
                type="button"
                onClick={() => setPendingBulkAction(action.status)}
                className="font-semibold text-text-primary hover:underline"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <LoadingState label="Loading orders…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState
          title="No orders match these filters"
          description="Try widening the date range or clearing filters."
          action={
            hasActiveFilters ? (
              <button type="button" onClick={clearAllFilters} className="text-sm font-semibold text-primary-orange hover:underline">
                Clear all filters
              </button>
            ) : undefined
          }
        />
      )}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <DataTable
            columns={columns}
            rows={data.items}
            getRowId={(o) => String(o.id)}
            onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingStatusChange)}
        onClose={() => setPendingStatusChange(null)}
        onConfirm={() => pendingStatusChange && applyStatusChange(pendingStatusChange.order, pendingStatusChange.next)}
        title={pendingStatusChange?.next === "cancelled" ? "Cancel this order?" : "Mark as return requested?"}
        description={
          pendingStatusChange?.next === "cancelled"
            ? `This marks ${pendingStatusChange?.order.orderNumber} as cancelled.`
            : `This marks ${pendingStatusChange?.order.orderNumber} as return requested.`
        }
        confirmLabel={pendingStatusChange?.next === "cancelled" ? "Cancel order" : "Confirm"}
        loading={statusUpdating}
      />

      <ConfirmDialog
        open={Boolean(pendingBulkAction)}
        onClose={() => setPendingBulkAction(null)}
        onConfirm={applyBulkAction}
        title={`${BULK_ACTIONS.find((a) => a.status === pendingBulkAction)?.label ?? "Update"} for ${selectedIds.size} order${selectedIds.size === 1 ? "" : "s"}?`}
        description="Orders that can't legally move to this status will be skipped and reported."
        confirmLabel="Apply"
        destructive={false}
        loading={bulkBusy}
      />

      <Dialog open={Boolean(noteTarget)} onClose={() => setNoteTarget(null)} title={`Add note — ${noteTarget?.orderNumber ?? ""}`} maxWidthClassName="max-w-sm">
        <form onSubmit={submitQuickNote} className="flex flex-col gap-3">
          <label htmlFor="quick-order-note" className="sr-only">
            Internal note
          </label>
          <textarea
            id="quick-order-note"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Add an internal note…"
            className="resize-none rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm focus-visible:border-primary-orange"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNoteTarget(null)}
              className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-cream-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!noteText.trim() || addingNote}
              className="rounded-lg bg-primary-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {addingNote ? "Adding…" : "Add note"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full bg-cream-bg px-2.5 py-1 text-xs font-medium capitalize text-text-primary transition-colors duration-150 ease-out hover:bg-peach-hero/60"
    >
      {label}
      <span aria-hidden="true">×</span>
    </button>
  );
}
