"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchAdminCategories } from "@/lib/api/admin-category-api";
import {
  bulkDeleteAdminProducts,
  bulkSetAdminProductStatus,
  deleteAdminProduct,
  describeAdminError,
  duplicateAdminProduct,
  getAdminProductSummary,
  listAdminProducts,
  type PetType,
  type ProductListItem,
  type ProductSort,
  type ProductStatus,
  type ProductSummary,
  type StockLevel,
  type ProductListResult,
} from "@/lib/api/admin-product-api";
import type { Category } from "@/data/admin/types";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DataTable, type Column } from "../ui/data-table";
import { Pagination } from "../ui/pagination";
import { StatCard } from "../ui/stat-card";
import { StatusBadge } from "../ui/status-badge";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { CopyIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const PAGE_SIZE = 12;
const petLabels: Record<PetType, string> = { dog: "Dogs", cat: "Cats", all: "All pets" };
const stockLabels: Record<StockLevel, string> = { in_stock: "In stock", low_stock: "Low stock (5 or fewer)", out_of_stock: "Out of stock" };

function ProductThumb({ product, className = "h-10 w-10" }: { product: ProductListItem; className?: string }) {
  if (!product.primaryImage) {
    return <div aria-hidden="true" className={`${className} shrink-0 rounded-lg bg-cream-bg`} />;
  }
  // The image URL is the Backend-authorized public R2 URL, not user-authored markup.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={product.primaryImage.url} alt={product.primaryImage.alt} className={`${className} shrink-0 rounded-lg object-cover`} />;
}

export function ProductsListView() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [petType, setPetType] = useState<PetType | "">("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [stockLevel, setStockLevel] = useState<StockLevel | "">("");
  const [sort, setSort] = useState<ProductSort>("created_at");
  const [order, setOrder] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductListResult | null>(null);
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchAdminCategories().then(setCategories).catch((cause) => showToast(describeAdminError(cause, "Could not load categories."), "error"));
  }, [showToast]);

  useEffect(() => {
    let live = true;
    Promise.resolve().then(() => {
      if (!live) return;
      if (data) setRefreshing(true); else setLoading(true);
      setError("");
    });
    Promise.all([
      listAdminProducts({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        petType: petType || undefined,
        status: status || undefined,
        stockLevel: stockLevel || undefined,
        sort,
        order,
      }),
      getAdminProductSummary(),
    ]).then(([products, nextSummary]) => {
      if (!live) return;
      setData(products);
      setSummary(nextSummary);
      setSelectedIds(new Set());
    }).catch((cause) => {
      if (live) setError(describeAdminError(cause, "Could not load Products."));
    }).finally(() => {
      if (live) { setLoading(false); setRefreshing(false); }
    });
    return () => { live = false; };
    // data is deliberately not a dependency: retaining it enables a non-destructive refreshing state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, categoryId, petType, status, stockLevel, sort, order, reloadKey]);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  const resetPage = () => setPage(1);
  const hasFilters = Boolean(search || categoryId || petType || status || stockLevel || sort !== "created_at" || order !== "DESC");
  function clearFilters() {
    setSearch(""); setCategoryId(""); setPetType(""); setStatus(""); setStockLevel("");
    setSort("created_at"); setOrder("DESC"); setPage(1);
  }

  async function runMutation(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      showToast(success);
      setDeleteTarget(null); setBulkDeleteOpen(false); setSelectedIds(new Set()); reload();
    } catch (cause) {
      showToast(describeAdminError(cause, "The Product operation failed."), "error");
    } finally { setBusy(false); }
  }

  function changeSort(nextSort: ProductSort) {
    if (sort === nextSort) setOrder((value) => value === "ASC" ? "DESC" : "ASC");
    else { setSort(nextSort); setOrder("ASC"); }
    resetPage();
  }

  const columns: Column<ProductListItem>[] = [
    { key: "name", header: "Product", sortable: true, render: (product) => (
      <div className="flex items-center gap-3"><ProductThumb product={product} /><div className="min-w-0"><p className="truncate font-medium">{product.name}</p><p className="truncate text-xs text-text-primary/50">{product.category.name} · {petLabels[product.petType]} · {product.hasVariants ? `${product.variantCount} variants` : "Simple"}</p></div></div>
    ) },
    { key: "sku", header: "SKU", render: (product) => <span className="text-text-primary/70">{product.sku}</span> },
    { key: "price", header: "Price", sortable: true, render: (product) => currency.format(Number(product.price)) },
    { key: "stock", header: "Stock", sortable: true, render: (product) => <span className={product.stock <= 5 ? "font-semibold text-terracotta" : ""}>{product.stock}</span> },
    { key: "status", header: "Status", render: (product) => <StatusBadge status={product.status} /> },
    { key: "actions", header: "Actions", className: "text-right", render: (product) => (
      <div className="flex justify-end gap-1">
        <Link href={`/admin/products/${product.id}/edit`} aria-label={`Edit ${product.name}`} className="rounded-lg p-2 hover:bg-cream-bg"><PencilIcon width={15} /></Link>
        <button type="button" disabled={busy} onClick={() => runMutation(() => duplicateAdminProduct(product.id), `Duplicated “${product.name}” as a draft.`)} aria-label={`Duplicate ${product.name}`} className="rounded-lg p-2 hover:bg-cream-bg disabled:opacity-50"><CopyIcon width={15} /></button>
        <button type="button" onClick={() => setDeleteTarget(product)} aria-label={`Delete ${product.name}`} className="rounded-lg p-2 text-terracotta hover:bg-terracotta/10"><TrashIcon width={15} /></button>
      </div>
    ) },
  ];

  return <div className="flex flex-col gap-5" aria-busy={loading || refreshing || busy}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Products</h1><p className="mt-1 text-sm text-text-primary/60">{data?.total ?? "…"} Products in the production catalog.</p></div><Link href="/admin/products/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white"><PlusIcon width={14} /> Add Product</Link></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"><StatCard label="Total" value={String(summary?.total ?? "…")} /><StatCard label="Active" value={String(summary?.active ?? "…")} /><StatCard label="Draft" value={String(summary?.draft ?? "…")} /><StatCard label="Archived" value={String(summary?.archived ?? "…")} /><StatCard label="Out of stock" value={String(summary?.outOfStock ?? "…")} /></div>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <label className="relative sm:col-span-2"><span className="sr-only">Search Products</span><SearchIcon width={15} className="pointer-events-none absolute left-3 top-3 text-text-primary/40" /><input value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder="Search name, slug, or SKU" className="h-10 w-full rounded-lg border border-border-subtle bg-white pl-8 pr-3 text-sm" /></label>
      <select aria-label="Filter by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); resetPage(); }} className="h-10 rounded-lg border border-border-subtle bg-white px-3 text-sm"><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
      <select aria-label="Filter by pet type" value={petType} onChange={(event) => { setPetType(event.target.value as PetType | ""); resetPage(); }} className="h-10 rounded-lg border border-border-subtle bg-white px-3 text-sm"><option value="">All pet types</option><option value="dog">Dogs</option><option value="cat">Cats</option><option value="all">All pets</option></select>
      <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as ProductStatus | ""); resetPage(); }} className="h-10 rounded-lg border border-border-subtle bg-white px-3 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
      <select aria-label="Filter by stock" value={stockLevel} onChange={(event) => { setStockLevel(event.target.value as StockLevel | ""); resetPage(); }} className="h-10 rounded-lg border border-border-subtle bg-white px-3 text-sm"><option value="">All stock levels</option>{Object.entries(stockLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    </div>
    <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase text-text-primary/50">Sort</span>{([['created_at','Newest'],['name','Name'],['price','Price'],['stock','Stock']] as [ProductSort,string][]).map(([value,label]) => <button key={value} type="button" onClick={() => changeSort(value)} className={`rounded-full border px-3 py-1 text-xs ${sort === value ? "border-primary-orange text-primary-orange" : "border-border-subtle"}`}>{label}{sort === value ? (order === "ASC" ? " ↑" : " ↓") : ""}</button>)}{hasFilters && <button type="button" onClick={clearFilters} className="ml-auto text-xs font-semibold text-primary-orange hover:underline">Clear filters</button>}</div>
    {selectedIds.size > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-orange/30 bg-primary-orange/5 px-4 py-3 text-sm"><strong>{selectedIds.size} selected</strong><div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => runMutation(() => bulkSetAdminProductStatus([...selectedIds].map(Number), "active"), "Selected Products activated.")}>Activate</button><button disabled={busy} onClick={() => runMutation(() => bulkSetAdminProductStatus([...selectedIds].map(Number), "draft"), "Selected Products moved to draft.")}>Draft</button><button disabled={busy} onClick={() => runMutation(() => bulkSetAdminProductStatus([...selectedIds].map(Number), "archived"), "Selected Products archived.")}>Archive</button><button disabled={busy} onClick={() => setBulkDeleteOpen(true)} className="font-semibold text-terracotta">Delete</button></div></div>}
    {refreshing && <p role="status" className="text-xs text-text-primary/50">Refreshing production catalog…</p>}
    {loading && <LoadingState label="Loading production Products…" />}
    {!loading && error && <ErrorState message={error} onRetry={reload} />}
    {!loading && !error && data?.items.length === 0 && <EmptyState title="No Products found" description={hasFilters ? "Clear filters or change the search." : "Create the first Product in the production catalog."} action={hasFilters ? <button onClick={clearFilters} className="font-semibold text-primary-orange">Clear filters</button> : <Link href="/admin/products/new" className="font-semibold text-primary-orange">Add Product</Link>} />}
    {!loading && !error && data && data.items.length > 0 && <div><DataTable columns={columns} rows={data.items} getRowId={(product) => String(product.id)} sortBy={sort} sortDir={order === "ASC" ? "asc" : "desc"} onSort={(key) => changeSort(key === "name" || key === "price" || key === "stock" ? key : "created_at")} selectedIds={selectedIds} onSelectionChange={setSelectedIds} /><Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} /></div>}
    <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && runMutation(() => deleteAdminProduct(deleteTarget.id), `Deleted “${deleteTarget.name}”.`)} title="Delete Product?" description={`Delete “${deleteTarget?.name ?? "this Product"}”? This removes it from active catalog workflows.`} confirmLabel="Delete Product" loading={busy} />
    <ConfirmDialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={() => runMutation(() => bulkDeleteAdminProducts([...selectedIds].map(Number)), `Deleted ${selectedIds.size} Products.`)} title="Delete selected Products?" description={`Delete ${selectedIds.size} selected Products?`} confirmLabel="Delete selected" loading={busy} />
  </div>;
}
