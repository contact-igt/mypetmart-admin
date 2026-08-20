import { SectionCard } from "./section-card";
import { OrderStatusDonut } from "./order-status-donut";
import { DataTable, type Column } from "../ui/data-table";
import { StatusBadge } from "../ui/status-badge";
import type { DashboardOrderRow, DashboardOrderStatus, OrderStatusSlice } from "@/data/admin/types";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const RECENT_ORDER_COLUMNS: Column<DashboardOrderRow>[] = [
  { key: "orderNumber", header: "Order", render: (o) => <span className="font-medium">{o.orderNumber}</span> },
  { key: "customerLabel", header: "Customer", render: (o) => o.customerLabel },
  { key: "total", header: "Total", render: (o) => currency.format(o.total) },
  { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
  { key: "placedAt", header: "Placed", render: (o) => dateFormat.format(new Date(o.placedAt)) },
];

export function OrderStatusSection({
  slices,
  recentOrders,
  activeStatus,
  onStatusClick,
}: {
  slices: OrderStatusSlice[];
  recentOrders: DashboardOrderRow[];
  activeStatus?: DashboardOrderStatus;
  onStatusClick: (status: DashboardOrderStatus) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <SectionCard title="Order status overview">
          <OrderStatusDonut slices={slices} activeStatus={activeStatus} onStatusClick={onStatusClick} />
        </SectionCard>
      </div>
      <div className="lg:col-span-3">
        <SectionCard
          title="Recent orders"
          description={activeStatus ? "Filtered to the selected status — click it again in the donut to clear." : "Click a status in the donut to filter this list."}
        >
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-primary/55">No orders match the current filters.</p>
          ) : (
            <DataTable columns={RECENT_ORDER_COLUMNS} rows={recentOrders} getRowId={(o) => String(o.orderId)} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
