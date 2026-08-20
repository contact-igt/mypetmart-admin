import { SectionCard } from "./section-card";
import { RankedBarList } from "./ranked-bar-list";
import { DataTable, type Column } from "../ui/data-table";
import type { ProductPerformanceRow } from "@/data/admin/types";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const COLUMNS: Column<ProductPerformanceRow>[] = [
  { key: "name", header: "Product", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "unitsSold", header: "Units sold", render: (r) => r.unitsSold.toLocaleString("en-IN") },
  { key: "revenue", header: "Revenue", render: (r) => currency.format(r.revenue) },
  { key: "returnRequests", header: "Returns", render: (r) => r.returnRequests.toLocaleString("en-IN") },
];

export function ProductPerformanceSection({ rows }: { rows: ProductPerformanceRow[] }) {
  const top = rows.slice(0, 8);
  return (
    <SectionCard title="Product performance" description="Units sold and revenue from real Order line items in the selected range.">
      <RankedBarList
        ariaLabel="Product revenue ranking"
        items={top.map((r) => ({ key: String(r.productId), label: r.name, value: r.revenue, secondary: `${r.unitsSold} units sold` }))}
        formatValue={(v) => currency.format(v)}
      />
      <div className="mt-4">
        <DataTable columns={COLUMNS} rows={rows} getRowId={(r) => String(r.productId)} />
      </div>
    </SectionCard>
  );
}
