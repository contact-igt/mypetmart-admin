"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { getDashboardAnalytics, getDashboardFilterOptions } from "@/lib/api/admin-dashboard-api";
import { listAdminOrders } from "@/lib/api/admin-order-api";
import { buildRecentOrdersQuery } from "@/lib/api/admin-dashboard-contract";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DashboardFilterBar } from "./dashboard-filter-bar";
import { MetricComparisonCard } from "./metric-comparison-card";
import { SectionCard } from "./section-card";
import { SalesOrdersChart, type SeriesMetric } from "./sales-orders-chart";
import { OrderStatusSection } from "./order-status-section";
import { ProductPerformanceSection } from "./product-performance-section";
import { FulfilmentSection } from "./fulfilment-section";
import { LocationSection } from "./location-section";
import { CustomerOverviewSection } from "./customer-overview-section";
import { ReturnsSection } from "./returns-section";
import { BusinessInsightsSection } from "./business-insights-section";
import { ReceiptIcon, TagIcon, UsersIcon, ReturnIcon } from "@/components/icons";
import type { DashboardFilter, DashboardOrderStatus, DateRangePreset } from "@/data/admin/types";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const TODAY_ISO = toIsoDate(new Date());

/** Resolves a date-range preset to concrete YYYY-MM-DD bounds against the real
 *  current date — there is no fixed "dataset window" any more since this is
 *  live data. "custom" keeps whatever the admin picked in the date inputs. */
function resolvePresetRange(preset: DateRangePreset, customFrom: string, customTo: string): { from: string; to: string } {
  if (preset === "custom") {
    return { from: customFrom || TODAY_ISO, to: customTo || TODAY_ISO };
  }
  const spanDays = preset === "today" ? 0 : preset === "7d" ? 6 : preset === "30d" ? 29 : 89;
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - spanDays);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

const DEFAULT_FILTER: DashboardFilter = {
  preset: "30d",
  ...resolvePresetRange("30d", "", ""),
  compare: false,
};

export function DashboardView() {
  const router = useRouter();
  const [filter, setFilter] = useState<DashboardFilter>(DEFAULT_FILTER);
  const [metric, setMetric] = useState<SeriesMetric>("sales");

  const optionsFetcher = useCallback(() => getDashboardFilterOptions(), []);
  const { data: options, error: optionsError, reload: reloadOptions } = useAdminData(optionsFetcher);

  const analyticsFetcher = useCallback(() => getDashboardAnalytics(filter), [filter]);
  const { data, loading, error, reload } = useAdminData(analyticsFetcher);
  const recentOrdersFetcher = useCallback(
    () => listAdminOrders(buildRecentOrdersQuery(filter)),
    [filter],
  );
  const { data: recentOrdersData, loading: recentOrdersLoading, error: recentOrdersError, reload: reloadRecentOrders } = useAdminData(recentOrdersFetcher);

  function patchFilter(patch: Partial<DashboardFilter>) {
    setFilter((prev) => {
      const next = { ...prev, ...patch };
      if (patch.preset && patch.preset !== "custom") {
        return { ...next, ...resolvePresetRange(patch.preset, prev.from, prev.to) };
      }
      return next;
    });
  }

  function resetFilter() {
    setFilter(DEFAULT_FILTER);
  }

  function refreshDashboard() {
    reload();
    reloadOptions();
    reloadRecentOrders();
  }

  function toggleStatus(status: DashboardOrderStatus) {
    patchFilter({ orderStatus: filter.orderStatus === status ? undefined : status });
  }

  function toggleState(state: string) {
    patchFilter({ state: filter.state === state ? undefined : state });
  }

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error || !data) return <ErrorState message={error ?? "Could not load dashboard."} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
          <button type="button" onClick={refreshDashboard} className="rounded-lg border border-border-subtle bg-white px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-cream-bg">
            Refresh
          </button>
        </div>
        <p className="mt-1 text-sm text-text-primary/60">
          Commerce analytics from real Orders, Returns and Shipments. Sessions, page views and traffic sources
          are not tracked anywhere in this system, so no conversion-funnel or traffic-source numbers are shown here.
        </p>
      </div>

      <DashboardFilterBar filter={filter} options={options} maxDate={TODAY_ISO} onChange={patchFilter} onReset={resetFilter} />
      {optionsError && (
        <p role="alert" className="rounded-lg border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-xs text-terracotta">
          Dashboard filter options could not be loaded. <button type="button" onClick={reloadOptions} className="font-semibold underline">Retry</button>
        </p>
      )}

      {data.isEmpty ? (
        <EmptyState
          title="No activity matches these filters"
          description="Try widening the date range, or clear filters to see the full dataset."
          action={
            <button
              type="button"
              onClick={resetFilter}
              className="rounded-lg bg-primary-orange px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90"
            >
              Clear all filters
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            <MetricComparisonCard label="Collected revenue" comparison={data.summary.grossSales} showComparison={filter.compare} format={(v) => currency.format(v)} icon={<TagIcon width={16} height={16} />} />
            <MetricComparisonCard label="Orders (excl. cancelled)" comparison={data.summary.orders} showComparison={filter.compare} format={(v) => v.toLocaleString("en-IN")} icon={<ReceiptIcon width={16} height={16} />} />
            <MetricComparisonCard label="Avg. paid order value" comparison={data.summary.averageOrderValue} showComparison={filter.compare} format={(v) => currency.format(v)} />
            <MetricComparisonCard label="Customers / guests with orders" comparison={data.summary.customers} showComparison={filter.compare} format={(v) => v.toLocaleString("en-IN")} icon={<UsersIcon width={16} height={16} />} />
            <MetricComparisonCard label="Open return requests" comparison={data.summary.openReturns} showComparison={filter.compare} format={(v) => v.toLocaleString("en-IN")} icon={<ReturnIcon width={16} height={16} />} />
          </div>

          <SectionCard title="Sales and orders over time">
            <SalesOrdersChart
              current={data.timeSeries.current}
              previous={data.timeSeries.previous}
              groupBy={data.timeSeries.groupBy}
              metric={metric}
              onMetricChange={setMetric}
              showComparison={filter.compare}
              formatValue={(v) => (metric === "sales" ? currency.format(v) : v.toLocaleString("en-IN"))}
            />
          </SectionCard>

          <ProductPerformanceSection rows={data.productPerformance} />

          <OrderStatusSection
            slices={data.orderStatus}
            recentOrders={recentOrdersData?.items.map((order) => {
              const summaryRow = data.recentOrders.find((row) => row.orderId === order.id);
              return {
                orderId: order.id,
                orderNumber: order.orderNumber,
                customerLabel: summaryRow?.customerLabel ?? order.customer?.name ?? `${order.shipCity}, ${order.shipState}`,
                total: Number(order.total),
                status: order.status,
                placedAt: order.placedAt,
                itemCount: order.itemCount,
                paymentStatus: order.paymentStatus,
                currency: order.currency,
              };
            }) ?? data.recentOrders}
            recentOrdersLoading={recentOrdersLoading}
            recentOrdersError={recentOrdersError}
            onRetryRecentOrders={reloadRecentOrders}
            onOrderClick={(orderId) => router.push(`/admin/orders/${orderId}`)}
            activeStatus={filter.orderStatus}
            onStatusClick={toggleStatus}
          />

          <FulfilmentSection fulfilment={data.fulfilment} />

          <LocationSection locations={data.locations} activeState={filter.state} onStateClick={toggleState} />

          <CustomerOverviewSection overview={data.customerOverview} />

          <ReturnsSection returns={data.returns} />

          <BusinessInsightsSection insights={data.insights} />
        </>
      )}
    </div>
  );
}
