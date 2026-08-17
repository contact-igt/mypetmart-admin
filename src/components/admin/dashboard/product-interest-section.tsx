import { SectionCard } from "./section-card";
import { DataTable, type Column } from "../ui/data-table";
import type { ProductInterestRow } from "@/data/admin/types";

const COLUMNS: Column<ProductInterestRow>[] = [
  { key: "name", header: "Product", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "views", header: "Views", render: (r) => r.views.toLocaleString("en-IN") },
  { key: "uniqueVisitors", header: "Unique visitors", render: (r) => r.uniqueVisitors.toLocaleString("en-IN") },
  { key: "cartAdds", header: "Cart adds", render: (r) => r.cartAdds.toLocaleString("en-IN") },
  { key: "viewToCartRate", header: "View → cart", render: (r) => `${r.viewToCartRate}%` },
  { key: "cartToPurchaseRate", header: "Cart → purchase", render: (r) => `${r.cartToPurchaseRate}%` },
];

export function ProductInterestSection({ rows, mostViewedProductName }: { rows: ProductInterestRow[]; mostViewedProductName: string | null }) {
  return (
    <SectionCard
      title="Product-interest tracking"
      description={mostViewedProductName ? `Most-viewed product in this range: ${mostViewedProductName}.` : undefined}
    >
      <DataTable columns={COLUMNS} rows={rows.slice(0, 10)} getRowId={(r) => r.productId} />
      <div className="mt-4 rounded-lg border border-dashed border-border-subtle bg-cream-bg/50 p-3 text-xs text-text-primary/60">
        <p className="font-semibold text-text-primary/70">Wishlist analytics not built yet.</p>
        <p className="mt-1">Wishlist V1 (customer-facing product saves) was approved and shipped after the original signed proposal — see CLAUDE.md scope exclusions for the approval history. Admin-side Wishlist analytics (e.g. most-wishlisted products) is a separate, not-yet-built scope item. Any wishlist figures shown elsewhere in this project are explicitly labelled &ldquo;Future integration preview&rdquo; and are never part of a KPI total.</p>
      </div>
    </SectionCard>
  );
}
