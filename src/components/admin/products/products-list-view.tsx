"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchAdminCategories } from "@/lib/api/admin-category-api";
import {
  bulkDeleteAdminProducts,
  bulkSetAdminProductStatus,
  deleteAdminProduct,
  describeAdminError,
  duplicateAdminProduct,
  getAdminProductSummary,
  listAdminProducts,
  restoreAdminProduct,
  moveAdminProduct,
  type PetType,
  type ProductListItem,
  type ProductListStatus,
  type ProductSort,
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
  const [status, setStatus] = useState<ProductListStatus | "">("");
  const [stockLevel, setStockLevel] = useState<StockLevel | "">("");
  const [sort, setSort] = useState<ProductSort>("display_order");
  const [order, setOrder] = useState<"ASC" | "DESC">("ASC");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductListResult | null>(null);
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ProductListItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const previousRows = useRef<Map<string, DOMRect> | null>(null);

  useLayoutEffect(() => {
    const before = previousRows.current;
    previousRows.current = null;
    if (!before || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    tableRef.current?.querySelectorAll<HTMLTableRowElement>("tbody tr[data-row-id]").forEach((row) => {
      const previous = before.get(row.dataset.rowId ?? "");
      if (!previous) return;
      const distance = previous.top - row.getBoundingClientRect().top;
      if (distance) row.animate([{ transform: `translateY(${distance}px)` }, { transform: "translateY(0)" }], { duration: 220, easing: "cubic-bezier(0.77, 0, 0.175, 1)" });
    });
  }, [data]);

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
        stockLevel: status === "deleted" ? undefined : stockLevel || undefined,
        sort,
        order,
      }),
      getAdminProductSummary(),
    ]).then(([products, nextSummary]) => {
      if (!live) return;
      if (page > Math.max(1, products.totalPages)) {
        setSummary(nextSummary);
        setPage(Math.max(1, products.totalPages));
        return;
      }
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
  const hasFilters = Boolean(search || categoryId || petType || status || stockLevel || sort !== "display_order" || order !== "ASC");
  const hasRefinements = Boolean(search || categoryId || petType || (status !== "deleted" && stockLevel));
  const isDeletedView = status === "deleted";
  function clearFilters() {
    setSearch(""); setCategoryId(""); setPetType(""); setStatus(""); setStockLevel("");
    setSort("display_order"); setOrder("ASC"); setPage(1);
  }
  function clearRefinements() {
    setSearch(""); setCategoryId(""); setPetType(""); setStockLevel(""); setPage(1);
  }

  async function runMutation(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      showToast(success);
      setDeleteTarget(null); setRestoreTarget(null); setBulkDeleteOpen(false); setSelectedIds(new Set()); reload();
    } catch (cause) {
      showToast(describeAdminError(cause, "The Product operation failed."), "error");
      reload();
    } finally { setBusy(false); }
  }

  async function moveProduct(product: ProductListItem, direction: "up" | "down") {
    if (busy || !data) return;
    const index = data.items.findIndex((item) => item.id === product.id);
    const otherIndex = index + (direction === "up" ? -1 : 1);
    const neighbor = data.items[otherIndex];
    if (index < 0) return;
    if (neighbor) {
      previousRows.current = new Map(Array.from(tableRef.current?.querySelectorAll<HTMLTableRowElement>("tbody tr[data-row-id]") ?? [], (row) => [row.dataset.rowId ?? "", row.getBoundingClientRect()]));
      const items = [...data.items];
      items[index] = { ...neighbor, displayOrder: product.displayOrder };
      items[otherIndex] = { ...product, displayOrder: neighbor.displayOrder };
      setData({ ...data, items });
    }
    setBusy(true);
    try {
      await moveAdminProduct(product.id, direction);
      showToast(neighbor ? `${product.name} moved to position ${(page - 1) * PAGE_SIZE + otherIndex + 1}, ${direction === "up" ? "above" : "below"} ${neighbor.name}. Website order saved.` : `${product.name} moved ${direction} one position. Website order saved.`);
      reload();
    } catch (cause) {
      showToast(describeAdminError(cause, `Could not move ${product.name}. Please try again.`), "error");
      reload();
    } finally { setBusy(false); }
  }

  function changeSort(nextSort: ProductSort) {
    if (sort === nextSort) setOrder((value) => value === "ASC" ? "DESC" : "ASC");
    else { setSort(nextSort); setOrder("ASC"); }
    resetPage();
  }

  const normalColumns: Column<ProductListItem>[] = [
    { key: "name", header: "Product", sortable: true, className: "w-[26%]", render: (product) => (
      <div className="flex min-w-0 items-center gap-3"><ProductThumb product={product} /><div className="min-w-0"><p className="truncate font-medium" title={product.name}>{product.name}</p><p className="truncate text-xs text-text-primary/50">{product.category.name} · {petLabels[product.petType]} · {product.hasVariants ? `${product.variantCount} variants` : "Simple"}{product.featured ? " · Featured" : ""}</p></div></div>
    ) },
    { key: "display_order", header: "Website order", sortable: true, className: "w-[18%]", render: (product) => (
      <div className="flex items-center gap-2">
        <span className="w-8 tabular-nums">{product.displayOrder}</span>
        {(["up", "down"] as const).map((direction) => <button key={direction} type="button" disabled={busy || refreshing || Boolean(status) || hasRefinements || sort !== "display_order" || order !== "ASC" || (direction === "up" ? page === 1 && data?.items[0]?.id === product.id : page === data?.totalPages && data?.items.at(-1)?.id === product.id)} onClick={() => void moveProduct(product, direction)} aria-label={"Move " + product.name + " " + direction} title={"Move " + direction} className="h-9 w-9 rounded-lg border border-border-subtle bg-white text-base hover:border-primary-orange disabled:opacity-40">{direction === "up" ? "↑" : "↓"}</button>)}
      </div>
    ) },
    { key: "sku", header: "SKU", className: "w-[14%]", render: (product) => <span className="block truncate text-text-primary/70" title={product.sku}>{product.sku}</span> },
    { key: "price", header: "Price", sortable: true, className: "w-[11%] whitespace-nowrap text-right", render: (product) => <span className="whitespace-nowrap tabular-nums">{product.hasVariants ? "From " : ""}{currency.format(Number(product.price))}</span> },
    { key: "stock", header: "Stock", sortable: true, className: "w-[8%] whitespace-nowrap text-right", render: (product) => <span className={`tabular-nums ${product.stock <= 5 ? "font-semibold text-terracotta" : ""}`}>{product.stock}</span> },
    { key: "status", header: "Status", className: "w-[10%] whitespace-nowrap text-center", render: (product) => <StatusBadge status={product.status} /> },
    { key: "actions", header: "Actions", className: "w-[13%] whitespace-nowrap text-right", render: (product) => (
      <div className="flex items-center justify-end gap-1">
        <Link href={`/admin/products/${product.id}/edit`} title="Edit" aria-label={`Edit ${product.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-white text-text-primary/70 transition hover:border-primary-orange/40 hover:bg-primary-orange/5 hover:text-primary-orange"><PencilIcon className="h-4 w-4" /></Link>
        <button type="button" title="Duplicate" disabled={busy} onClick={() => runMutation(() => duplicateAdminProduct(product.id), `Duplicated “${product.name}” as a draft.`)} aria-label={`Duplicate ${product.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-white text-text-primary/70 transition hover:border-primary-orange/40 hover:bg-primary-orange/5 hover:text-primary-orange disabled:opacity-50"><CopyIcon className="h-4 w-4" /></button>
        <button type="button" title="Move to Deleted" onClick={() => setDeleteTarget(product)} aria-label={`Delete ${product.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-terracotta/25 bg-white text-terracotta transition hover:bg-terracotta/10"><TrashIcon className="h-4 w-4" /></button>
      </div>
    ) },
  ];

  const deletedColumns: Column<ProductListItem>[] = [
    { key: "name", header: "Deleted Product", sortable: true, className: "w-[31%]", render: (product) => (
      <div className="flex min-w-0 items-center gap-3">
        <ProductThumb product={product} className="h-11 w-11" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-text-primary">{product.name}</p>
          <p className="mt-0.5 truncate text-xs text-text-primary/50">/{product.slug}</p>
        </div>
      </div>
    ) },
    { key: "sku", header: "SKU", className: "w-[22%]", render: (product) => <span className="block truncate rounded-md bg-cream-bg px-2 py-1 font-mono text-xs text-text-primary/70" title={product.sku}>{product.sku}</span> },
    { key: "details", header: "Product details", className: "w-[18%]", render: (product) => (
      <div className="min-w-0 text-xs">
        <p className="font-medium text-text-primary">{product.category.name}</p>
        <p className="mt-1 text-text-primary/50">{petLabels[product.petType]} · {product.hasVariants ? `Variant · ${product.variantCount} saved` : "Simple Product"}</p>
      </div>
    ) },
    { key: "deletedAt", header: "Deleted on", className: "w-[14%]", render: (product) => {
      const deletedDate = product.deletedAt ? new Date(product.deletedAt) : null;
      return <div className="whitespace-nowrap text-xs"><p className="font-medium text-text-primary">{deletedDate ? deletedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Unknown"}</p>{deletedDate && <p className="mt-1 text-text-primary/45">{deletedDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>}</div>;
    } },
    { key: "actions", header: "Action", className: "w-[15%] whitespace-nowrap text-right", render: (product) => (
      <button type="button" disabled={busy || !product.restorable} onClick={() => setRestoreTarget(product)} aria-label={product.restorable ? `Restore ${product.name}` : `Restore unavailable for ${product.name}`} className="inline-flex min-w-28 items-center justify-center whitespace-nowrap rounded-lg bg-primary-orange px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-orange/90 disabled:cursor-not-allowed disabled:border disabled:border-border-subtle disabled:bg-cream-bg disabled:text-text-primary/45 disabled:shadow-none">{product.restorable ? "Restore" : "Restore unavailable"}</button>
    ) },
  ];

  const columns = isDeletedView ? deletedColumns : normalColumns;

  return <div className="flex flex-col gap-5" aria-busy={loading || refreshing || busy}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Products</h1><p className="mt-1 text-sm text-text-primary/60">{isDeletedView ? `${data?.total ?? "…"} Products in Deleted.` : `${data?.total ?? "…"} Products in the production catalog.`}</p></div><Link href="/admin/products/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white"><PlusIcon width={14} /> Add Product</Link></div>
    {isDeletedView && <section aria-label="Deleted Product guidance" className="flex flex-col gap-3 rounded-xl border border-primary-orange/20 bg-gradient-to-r from-primary-orange/10 to-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-text-primary">Deleted Products</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-text-primary/60">Restored Products keep their original identity and return in Draft status for review.</p></div><span className="w-fit shrink-0 rounded-full border border-primary-orange/25 bg-white px-3 py-1.5 text-xs font-semibold text-primary-orange">No permanent delete</span></section>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"><StatCard label="Total" value={String(summary?.total ?? "…")} /><StatCard label="Active" value={String(summary?.active ?? "…")} /><StatCard label="Draft" value={String(summary?.draft ?? "…")} /><StatCard label="Archived" value={String(summary?.archived ?? "…")} /><StatCard label="Out of stock" value={String(summary?.outOfStock ?? "…")} /></div>
    <section aria-label="Product list controls" className="rounded-xl border border-border-subtle bg-white p-3 shadow-sm sm:p-4">
      <div role="tablist" aria-label="Product status" className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-cream-bg p-1">{([['','All'],['draft','Draft'],['active','Active'],['archived','Archived'],['deleted','Deleted']] as [ProductListStatus | "", string][]).map(([value,label]) => <button key={label} type="button" role="tab" aria-selected={status === value} onClick={() => { setStatus(value); resetPage(); }} className={`min-w-20 shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition ${status === value ? "bg-primary-orange text-white shadow-sm" : "text-text-primary/60 hover:bg-white hover:text-text-primary"}`}>{label}</button>)}</div>
      <div className={`mt-3 grid gap-3 sm:grid-cols-2 ${isDeletedView ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}>
        <label className="relative sm:col-span-2"><span className="sr-only">Search Products</span><SearchIcon className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-text-primary/40" /><input value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder="Search name, slug, or SKU" className="h-11 w-full rounded-lg border border-border-subtle bg-white pl-10 pr-3 text-sm outline-none transition focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/10" /></label>
        <select aria-label="Filter by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); resetPage(); }} className="h-11 rounded-lg border border-border-subtle bg-white px-3 text-sm outline-none transition focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/10"><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select aria-label="Filter by pet type" value={petType} onChange={(event) => { setPetType(event.target.value as PetType | ""); resetPage(); }} className="h-11 rounded-lg border border-border-subtle bg-white px-3 text-sm outline-none transition focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/10"><option value="">All pet types</option><option value="dog">Dogs</option><option value="cat">Cats</option><option value="all">All pets</option></select>
        {!isDeletedView && <select aria-label="Filter by stock" value={stockLevel} onChange={(event) => { setStockLevel(event.target.value as StockLevel | ""); resetPage(); }} className="h-11 rounded-lg border border-border-subtle bg-white px-3 text-sm outline-none transition focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/10"><option value="">All stock levels</option>{Object.entries(stockLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-subtle/70 pt-3">
        <span className="mr-1 text-xs font-semibold text-text-primary/50">Sort by</span>
        {([['display_order','Website order'],['created_at','Newest'],['name','Name'],['price','Price'],['stock','Stock']] as [ProductSort,string][]).map(([value,label]) => <button key={value} type="button" onClick={() => changeSort(value)} aria-pressed={sort === value} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${sort === value ? "border-primary-orange/30 bg-primary-orange/10 text-primary-orange" : "border-border-subtle bg-white text-text-primary/60 hover:border-primary-orange/25 hover:text-text-primary"}`}>{label}{sort === value ? (order === "ASC" ? " ↑" : " ↓") : ""}</button>)}
        {hasFilters && <button type="button" onClick={clearFilters} className="ml-auto rounded-lg px-2 py-1.5 text-xs font-semibold text-primary-orange transition hover:bg-primary-orange/5">Clear all</button>}
      </div>
    </section>
    {!isDeletedView && selectedIds.size > 0 && (
      <div role="toolbar" aria-label="Bulk Product actions" className="flex flex-col gap-3 rounded-xl border border-primary-orange/25 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary-orange px-2 text-sm font-bold text-white">{selectedIds.size}</span>
          <strong className="text-sm text-text-primary">{selectedIds.size === 1 ? "Product selected" : "Products selected"}</strong>
          <button type="button" disabled={busy} onClick={() => setSelectedIds(new Set())} className="ml-1 text-xs font-semibold text-text-primary/50 transition hover:text-primary-orange disabled:opacity-50">Clear</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button type="button" disabled={busy} onClick={() => runMutation(() => bulkSetAdminProductStatus([...selectedIds].map(Number), "active"), "Selected Products activated.")} className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent bg-mint-sage px-3 text-xs font-semibold text-text-primary transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">Activate</button>
          <button type="button" disabled={busy} onClick={() => runMutation(() => bulkSetAdminProductStatus([...selectedIds].map(Number), "draft"), "Selected Products moved to draft.")} className="inline-flex h-9 items-center justify-center rounded-lg border border-border-subtle bg-cream-bg px-3 text-xs font-semibold text-text-primary/75 transition hover:border-primary-orange/30 hover:text-primary-orange disabled:cursor-not-allowed disabled:opacity-50">Move to Draft</button>
          <button type="button" disabled={busy} onClick={() => runMutation(() => bulkSetAdminProductStatus([...selectedIds].map(Number), "archived"), "Selected Products archived.")} className="inline-flex h-9 items-center justify-center rounded-lg border border-deep-brown/15 bg-deep-brown/5 px-3 text-xs font-semibold text-deep-brown transition hover:bg-deep-brown/10 disabled:cursor-not-allowed disabled:opacity-50">Archive</button>
          <button type="button" disabled={busy} onClick={() => setBulkDeleteOpen(true)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-terracotta/25 bg-terracotta/5 px-3 text-xs font-semibold text-terracotta transition hover:bg-terracotta/10 disabled:cursor-not-allowed disabled:opacity-50"><TrashIcon className="h-3.5 w-3.5" /> Move to Deleted</button>
        </div>
      </div>
    )}
    {!isDeletedView && <p className="text-xs text-text-primary/60">Use ↑ and ↓ to move products. Changes save automatically for the homepage and default shop listing. Clear filters and select Website order ascending to enable the controls.</p>}
    {refreshing && <p role="status" className="text-xs text-text-primary/50">Refreshing production catalog…</p>}
    {loading && <LoadingState label="Loading production Products…" />}
    {!loading && error && <ErrorState message={error} onRetry={reload} />}
    {!loading && !error && data?.items.length === 0 && <EmptyState title={isDeletedView ? "Deleted is empty" : "No Products found"} description={isDeletedView ? (hasRefinements ? "No deleted Products match these filters." : "Products moved to Deleted will appear here and can be restored when recovery is safe.") : (hasFilters ? "Clear filters or change the search." : "Create the first Product in the production catalog.")} action={isDeletedView ? (hasRefinements ? <button onClick={clearRefinements} className="font-semibold text-primary-orange">Clear Deleted filters</button> : undefined) : (hasFilters ? <button onClick={clearFilters} className="font-semibold text-primary-orange">Clear filters</button> : <Link href="/admin/products/new" className="font-semibold text-primary-orange">Add Product</Link>)} />}
    {!loading && !error && data && data.items.length > 0 && <div><div ref={tableRef}><DataTable columns={columns} rows={data.items} getRowId={(product) => String(product.id)} sortBy={sort} sortDir={order === "ASC" ? "asc" : "desc"} onSort={(key) => changeSort(key === "display_order" || key === "name" || key === "price" || key === "stock" ? key : "created_at")} selectedIds={isDeletedView ? undefined : selectedIds} onSelectionChange={isDeletedView ? undefined : setSelectedIds} tableClassName="min-w-[1100px] table-fixed" /></div><Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} /></div>}
    <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && runMutation(() => deleteAdminProduct(deleteTarget.id), `Moved “${deleteTarget.name}” to Deleted.`)} title="Move Product to Deleted?" description={`“${deleteTarget?.name ?? "This Product"}” will leave normal Product and Storefront lists. Its Variants and images will be preserved for restoration.`} confirmLabel="Move to Deleted" loading={busy} />
    <ConfirmDialog open={Boolean(restoreTarget)} onClose={() => setRestoreTarget(null)} onConfirm={() => restoreTarget && runMutation(() => restoreAdminProduct(restoreTarget.id), "Product restored successfully. It is now in Draft status.")} title="Restore Product?" description={`Restore “${restoreTarget?.name ?? "this Product"}” with its original ID, slug, SKU, Variants, and images? It will return as Draft.`} confirmLabel="Restore" destructive={false} loading={busy} />
    <ConfirmDialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={() => runMutation(() => bulkDeleteAdminProducts([...selectedIds].map(Number)), `Moved ${selectedIds.size} Products to Deleted.`)} title="Move selected Products to Deleted?" description={`${selectedIds.size} selected Products will leave normal Product and Storefront lists. Their Variants and images will be preserved for restoration.`} confirmLabel="Move to Deleted" loading={busy} />
  </div>;
}
