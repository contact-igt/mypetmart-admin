"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminRepository } from "@/data/admin/mock-repository";
import type { Category, PetType, Product, ProductStatus, StockLevel } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatCard } from "../ui/stat-card";
import { StatusBadge } from "../ui/status-badge";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { ImagePlaceholder } from "@/components/image-placeholder";
import {
  CopyIcon,
  GridViewIcon,
  ListViewIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const STATUSES: ProductStatus[] = ["active", "draft", "archived"];
const PAGE_SIZE = 8;

const PET_TYPE_LABELS: Record<PetType, string> = { dog: "Dogs", cat: "Cats", all: "All pets" };
const STOCK_LABELS: Record<StockLevel, string> = { in_stock: "In stock", low_stock: "Low stock (≤5)", out_of_stock: "Out of stock" };

type SortKey = "newest" | "name" | "price" | "stock";
const SORT_OPTIONS: { key: SortKey; label: string; sortBy: string; sortDir: "asc" | "desc" }[] = [
  { key: "newest", label: "Newest", sortBy: "createdAt", sortDir: "desc" },
  { key: "name", label: "Name (A–Z)", sortBy: "name", sortDir: "asc" },
  { key: "price", label: "Price (low to high)", sortBy: "price", sortDir: "asc" },
  { key: "stock", label: "Stock (high to low)", sortBy: "stock", sortDir: "desc" },
];

export function ProductsListView() {
  const { showToast } = useToast();
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [petType, setPetType] = useState<PetType | "">("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [stockLevel, setStockLevel] = useState<StockLevel | "">("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkStatusBusy, setBulkStatusBusy] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    adminRepository.listCategories().then(setCategories);
  }, []);

  const summaryFetcher = useCallback(() => adminRepository.getProductSummary(), []);
  const { data: summary, reload: reloadSummary } = useAdminData(summaryFetcher);

  const fetcher = useCallback(
    () =>
      adminRepository.listProducts({
        search,
        categoryId: categoryId || undefined,
        status: status || undefined,
        petType: petType || undefined,
        stockLevel: stockLevel || undefined,
        sortBy,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      }),
    [search, categoryId, petType, status, stockLevel, sortBy, sortDir, page],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  function refreshAll() {
    reload();
    reloadSummary();
  }

  function resetPage() {
    setPage(1);
  }

  const activeSortKey = SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.sortDir === sortDir)?.key ?? "";

  function handleSort(key: string) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  function handleSortSelect(key: SortKey) {
    const option = SORT_OPTIONS.find((o) => o.key === key);
    if (!option) return;
    setSortBy(option.sortBy);
    setSortDir(option.sortDir);
  }

  function categoryName(id: string): string {
    return categories.find((c) => c.id === id)?.name ?? "Uncategorised";
  }

  function clearAllFilters() {
    setSearch("");
    setCategoryId("");
    setPetType("");
    setStatus("");
    setStockLevel("");
    setSortBy("createdAt");
    setSortDir("desc");
    resetPage();
  }

  const hasActiveFilters = Boolean(search || categoryId || petType || status || stockLevel || sortBy !== "createdAt" || sortDir !== "desc");

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminRepository.deleteProduct(deleteTarget.id);
      showToast(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
      refreshAll();
    } catch {
      showToast("Could not delete the product.", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmBulkDelete() {
    setDeleting(true);
    try {
      await adminRepository.bulkDeleteProducts([...selectedIds]);
      showToast(`Deleted ${selectedIds.size} product${selectedIds.size === 1 ? "" : "s"}.`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      refreshAll();
    } catch {
      showToast("Could not delete the selected products.", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkStatus(nextStatus: ProductStatus) {
    setBulkStatusBusy(true);
    try {
      await adminRepository.bulkSetProductStatus([...selectedIds], nextStatus);
      showToast(`Updated ${selectedIds.size} product${selectedIds.size === 1 ? "" : "s"} to ${nextStatus}.`);
      setSelectedIds(new Set());
      refreshAll();
    } catch {
      showToast("Could not update the selected products.", "error");
    } finally {
      setBulkStatusBusy(false);
    }
  }

  async function handleDuplicate(product: Product) {
    setDuplicatingId(product.id);
    try {
      await adminRepository.duplicateProduct(product.id);
      showToast(`Duplicated "${product.name}" as a new draft.`);
      refreshAll();
    } catch {
      showToast("Could not duplicate the product.", "error");
    } finally {
      setDuplicatingId(null);
    }
  }

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <ImagePlaceholder label={p.images[0]?.label ?? p.name} tone={p.images[0]?.tone ?? "cream"} className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">{p.name}</p>
            <p className="truncate text-xs text-text-primary/50">
              {categoryName(p.categoryId)} · {PET_TYPE_LABELS[p.petType]}
            </p>
          </div>
        </div>
      ),
    },
    { key: "sku", header: "SKU", render: (p) => <span className="text-text-primary/70">{p.sku}</span> },
    { key: "price", header: "Price", sortable: true, render: (p) => currency.format(p.price) },
    {
      key: "stock",
      header: "Stock",
      sortable: true,
      render: (p) => (
        <span className={p.stock === 0 ? "font-semibold text-terracotta" : p.stock <= 5 ? "font-semibold text-primary-orange" : ""}>
          {p.stock}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/products/${p.id}/edit`}
            aria-label={`Edit ${p.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-primary/60 hover:bg-cream-bg hover:text-text-primary"
          >
            <PencilIcon width={15} height={15} />
          </Link>
          <button
            type="button"
            aria-label={`Duplicate ${p.name}`}
            onClick={() => handleDuplicate(p)}
            disabled={duplicatingId === p.id}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-primary/60 hover:bg-cream-bg hover:text-text-primary disabled:opacity-50"
          >
            <CopyIcon width={14} height={14} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${p.name}`}
            onClick={() => setDeleteTarget(p)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-primary/60 hover:bg-terracotta/10 hover:text-terracotta"
          >
            <TrashIcon width={15} height={15} />
          </button>
        </div>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Products</h1>
          <p className="mt-1 text-sm text-text-primary/60">
            {data?.total ?? "…"} product{data?.total === 1 ? "" : "s"} in the demo catalog.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90"
        >
          <PlusIcon width={14} height={14} /> Add product
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total" value={String(summary?.total ?? "…")} />
        <StatCard label="Active" value={String(summary?.active ?? "…")} />
        <StatCard label="Draft" value={String(summary?.draft ?? "…")} />
        <StatCard label="Archived" value={String(summary?.archived ?? "…")} />
        <StatCard label="Out of stock" value={String(summary?.outOfStock ?? "…")} />
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
            placeholder="Search name, SKU or category…"
            aria-label="Search products"
            className="h-9 w-64 rounded-lg border border-border-subtle bg-white pl-8 pr-3 text-sm focus-visible:border-primary-orange"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            resetPage();
          }}
          aria-label="Filter by category"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={petType}
          onChange={(e) => {
            setPetType(e.target.value as PetType | "");
            resetPage();
          }}
          aria-label="Filter by pet type"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All pet types</option>
          <option value="dog">Dogs</option>
          <option value="cat">Cats</option>
          <option value="all">Works for all pets</option>
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ProductStatus | "");
            resetPage();
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
          value={stockLevel}
          onChange={(e) => {
            setStockLevel(e.target.value as StockLevel | "");
            resetPage();
          }}
          aria-label="Filter by stock level"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="">All stock levels</option>
          {(Object.entries(STOCK_LABELS) as [StockLevel, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={activeSortKey}
          onChange={(e) => handleSortSelect(e.target.value as SortKey)}
          aria-label="Sort by"
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm focus-visible:border-primary-orange"
        >
          <option value="" disabled>
            Sort…
          </option>
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border-subtle bg-white p-0.5">
          <button
            type="button"
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
            aria-label="Table view"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${view === "table" ? "bg-cream-bg text-text-primary" : "text-text-primary/45"}`}
          >
            <ListViewIcon width={15} height={15} />
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            aria-label="Grid view"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${view === "grid" ? "bg-cream-bg text-text-primary" : "text-text-primary/45"}`}
          >
            <GridViewIcon width={15} height={15} />
          </button>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {search && <FilterChip label={`Search: ${search}`} onRemove={() => { setSearch(""); resetPage(); }} />}
          {categoryId && <FilterChip label={`Category: ${categoryName(categoryId)}`} onRemove={() => { setCategoryId(""); resetPage(); }} />}
          {petType && <FilterChip label={`Pet: ${PET_TYPE_LABELS[petType]}`} onRemove={() => { setPetType(""); resetPage(); }} />}
          {status && <FilterChip label={`Status: ${status}`} onRemove={() => { setStatus(""); resetPage(); }} />}
          {stockLevel && <FilterChip label={STOCK_LABELS[stockLevel]} onRemove={() => { setStockLevel(""); resetPage(); }} />}
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
            <button type="button" disabled={bulkStatusBusy} onClick={() => handleBulkStatus("active")} className="font-semibold text-text-primary hover:underline disabled:opacity-50">
              Activate
            </button>
            <button type="button" disabled={bulkStatusBusy} onClick={() => handleBulkStatus("draft")} className="font-semibold text-text-primary hover:underline disabled:opacity-50">
              Deactivate
            </button>
            <button type="button" disabled={bulkStatusBusy} onClick={() => handleBulkStatus("archived")} className="font-semibold text-text-primary hover:underline disabled:opacity-50">
              Archive
            </button>
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              className="inline-flex items-center gap-1 font-semibold text-terracotta hover:underline"
            >
              <TrashIcon width={13} height={13} /> Delete selected
            </button>
          </div>
        </div>
      )}

      {loading && <LoadingState label="Loading products…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState
          title="No products match these filters"
          description="Try clearing search or filters, or add a new product."
          action={
            hasActiveFilters ? (
              <button type="button" onClick={clearAllFilters} className="text-sm font-semibold text-primary-orange hover:underline">
                Clear all filters
              </button>
            ) : (
              <Link href="/admin/products/new" className="text-sm font-semibold text-primary-orange hover:underline">
                Add a product
              </Link>
            )
          }
        />
      )}

      {!loading && !error && data && data.items.length > 0 && view === "table" && (
        <>
          <DataTable
            columns={columns}
            rows={data.items}
            getRowId={(p) => p.id}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}

      {!loading && !error && data && data.items.length > 0 && view === "grid" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border border-border-subtle bg-white">
                <ImagePlaceholder label={p.images[0]?.label ?? p.name} tone={p.images[0]?.tone ?? "cream"} className="aspect-square w-full rounded-none" />
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-text-primary">{p.name}</p>
                  <p className="mt-0.5 truncate text-xs text-text-primary/50">
                    {categoryName(p.categoryId)} · {PET_TYPE_LABELS[p.petType]}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-text-primary">{currency.format(p.price)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="flex-1 rounded-lg border border-border-subtle py-1.5 text-center text-xs font-semibold text-text-primary hover:bg-cream-bg"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(p)}
                      disabled={duplicatingId === p.id}
                      aria-label={`Duplicate ${p.name}`}
                      className="rounded-lg border border-border-subtle p-1.5 text-text-primary/60 hover:bg-cream-bg hover:text-text-primary disabled:opacity-50"
                    >
                      <CopyIcon width={14} height={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      aria-label={`Delete ${p.name}`}
                      className="rounded-lg border border-border-subtle p-1.5 text-text-primary/60 hover:bg-terracotta/10 hover:text-terracotta"
                    >
                      <TrashIcon width={14} height={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete product?"
        description={`This removes "${deleteTarget?.name}" from the demo catalog for this session. This can't be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete selected products?"
        description={`This removes ${selectedIds.size} product${selectedIds.size === 1 ? "" : "s"} from the demo catalog for this session. This can't be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
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
