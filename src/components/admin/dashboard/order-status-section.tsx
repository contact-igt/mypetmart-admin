import { SectionCard } from "./section-card";
import { OrderStatusDonut } from "./order-status-donut";
import { DataTable, type Column } from "../ui/data-table";
import { StatusBadge } from "../ui/status-badge";
import type { DashboardOrderRow, DashboardOrderStatus, OrderStatusSlice } from "@/data/admin/types";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function formatMoney(amount: number, currencyCode = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currencyCode} ${amount}`;
  }
}

const RECENT_ORDER_COLUMNS: Column<DashboardOrderRow>[] = [
  { key: "orderNumber", header: "Order", render: (o) => <span className="font-medium">{o.orderNumber}</span> },
  { key: "customerLabel", header: "Customer", render: (o) => o.customerLabel },
  { key: "total", header: "Total", render: (o) => formatMoney(o.total, o.currency) },
  { key: "paymentStatus", header: "Payment", render: (o) => o.paymentStatus ? <StatusBadge status={o.paymentStatus} /> : <span className="text-xs text-text-primary/50">Unavailable</span> },
  { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
  { key: "placedAt", header: "Placed", render: (o) => dateFormat.format(new Date(o.placedAt)) },
];

export function OrderStatusSection({
  slices,
  recentOrders,
  recentOrdersLoading,
  recentOrdersError,
  onRetryRecentOrders,
  onOrderClick,
  activeStatus,
  onStatusClick,
}: {
  slices: OrderStatusSlice[];
  recentOrders: DashboardOrderRow[];
  recentOrdersLoading: boolean;
  recentOrdersError: string | null;
  onRetryRecentOrders: () => void;
  onOrderClick: (orderId: number) => void;
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
          {recentOrdersError && (
            <p role="alert" className="mb-3 rounded-lg border border-terracotta/30 bg-terracotta/5 px-3 py-2 text-xs text-terracotta">
              Payment details for recent orders could not be loaded. <button type="button" onClick={onRetryRecentOrders} className="font-semibold underline">Retry</button>
            </p>
          )}
          {recentOrdersLoading && recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-primary/55">Loading recent orders…</p>
          ) : recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-primary/55">No orders match the current filters.</p>
          ) : (
            <DataTable columns={RECENT_ORDER_COLUMNS} rows={recentOrders} getRowId={(o) => String(o.orderId)} onRowClick={(o) => onOrderClick(o.orderId)} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
