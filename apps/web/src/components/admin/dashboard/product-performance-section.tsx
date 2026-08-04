import { SectionCard } from "./section-card";
import { RankedBarList } from "./ranked-bar-list";
import { DataTable, type Column } from "../ui/data-table";
import type { ProductPerformanceRow } from "@/data/admin/types";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const COLUMNS: Column<ProductPerformanceRow>[] = [
  { key: "name", header: "Product", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "views", header: "Views", render: (r) => r.views.toLocaleString("en-IN") },
  { key: "cartAdds", header: "Cart adds", render: (r) => r.cartAdds.toLocaleString("en-IN") },
  { key: "checkouts", header: "Checkouts", render: (r) => r.checkouts.toLocaleString("en-IN") },
  { key: "unitsSold", header: "Units sold", render: (r) => r.unitsSold.toLocaleString("en-IN") },
  { key: "conversionRate", header: "Conversion", render: (r) => `${r.conversionRate}%` },
  { key: "revenue", header: "Revenue", render: (r) => currency.format(r.revenue) },
  { key: "returnRequests", header: "Returns", render: (r) => r.returnRequests.toLocaleString("en-IN") },
];

export function ProductPerformanceSection({ rows }: { rows: ProductPerformanceRow[] }) {
  const top = rows.slice(0, 8);
  return (
    <SectionCard
      title="Product performance"
      description="Dog Anti-Slip Pads, Pet Grooming Brush and Double Leash are the products actually listed on mypetmart.org today; the rest of the demo catalogue is shown for completeness."
    >
      <RankedBarList
        ariaLabel="Product revenue ranking"
        items={top.map((r) => ({ key: r.productId, label: r.name, value: r.revenue, secondary: `${r.unitsSold} units · ${r.conversionRate}% conversion` }))}
        formatValue={(v) => currency.format(v)}
      />
      <div className="mt-4">
        <DataTable columns={COLUMNS} rows={rows} getRowId={(r) => r.productId} />
      </div>
    </SectionCard>
  );
}
