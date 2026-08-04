"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminRepository } from "@/data/admin/mock-repository";
import type { Category, Product, ProductStatus } from "@/data/admin/types";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatusBadge } from "../ui/status-badge";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { ImagePlaceholder } from "@/components/image-placeholder";
import {
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

export function ProductsListView() {
  const { showToast } = useToast();
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    adminRepository.listCategories().then(setCategories);
  }, []);

  const fetcher = useCallback(
    () =>
      adminRepository.listProducts({
        search,
        categoryId: categoryId || undefined,
        status: status || undefined,
        sortBy,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      }),
    [search, categoryId, status, sortBy, sortDir, page],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  function handleSort(key: string) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  function categoryName(id: string): string {
    return categories.find((c) => c.id === id)?.name ?? "Uncategorised";
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminRepository.deleteProduct(deleteTarget.id);
      showToast(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
      reload();
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
      reload();
    } catch {
      showToast("Could not delete the selected products.", "error");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <ImagePlaceholder label={p.imageLabel} tone={p.tone} className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">{p.name}</p>
            <p className="truncate text-xs text-text-primary/50">{categoryName(p.categoryId)}</p>
          </div>
        </div>
      ),
    },
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/40" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products…"
            aria-label="Search products"
            className="h-9 w-56 rounded-lg border border-border-subtle bg-white pl-8 pr-3 text-sm focus-visible:border-primary-orange"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
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
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ProductStatus | "");
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

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary-orange/30 bg-primary-orange/5 px-4 py-2.5 text-sm">
          <span className="font-medium text-text-primary">{selectedIds.size} selected</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSelectedIds(new Set())} className="text-text-primary/60 hover:underline">
              Clear
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
            <Link href="/admin/products/new" className="text-sm font-semibold text-primary-orange hover:underline">
              Add a product
            </Link>
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
                <ImagePlaceholder label={p.imageLabel} tone={p.tone} className="aspect-square w-full rounded-none" />
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-text-primary">{p.name}</p>
                  <p className="mt-0.5 text-xs text-text-primary/50">{categoryName(p.categoryId)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-text-primary">{currency.format(p.price)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="flex-1 rounded-lg border border-border-subtle py-1.5 text-center text-xs font-semibold text-text-primary hover:bg-cream-bg"
                    >
                      Edit
                    </Link>
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
