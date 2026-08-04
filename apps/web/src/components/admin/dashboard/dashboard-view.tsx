"use client";

import { useCallback, useState } from "react";
import { adminRepository } from "@/data/admin/mock-repository";
import { DATASET_BOUNDS } from "@/data/admin/dashboard-analytics";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { DashboardFilterBar } from "./dashboard-filter-bar";
import { MetricComparisonCard } from "./metric-comparison-card";
import { SectionCard } from "./section-card";
import { SalesOrdersChart, type SeriesMetric } from "./sales-orders-chart";
import { ConversionFunnel } from "./conversion-funnel";
import { OrderStatusSection } from "./order-status-section";
import { ProductPerformanceSection } from "./product-performance-section";
import { ProductInterestSection } from "./product-interest-section";
import { FulfilmentSection } from "./fulfilment-section";
import { LocationSection } from "./location-section";
import { CustomerOverviewSection } from "./customer-overview-section";
import { ReturnsSection } from "./returns-section";
import { TrafficSourcesSection } from "./traffic-sources-section";
import { BusinessInsightsSection } from "./business-insights-section";
import { ReceiptIcon, TagIcon, UsersIcon, ReturnIcon, ChartIcon } from "@/components/icons";
import type { DashboardFilter, DashboardOrderStatus } from "@/data/admin/types";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const DEFAULT_FILTER: DashboardFilter = {
  preset: "30d",
  from: DATASET_BOUNDS.from,
  to: DATASET_BOUNDS.to,
  compare: false,
};

export function DashboardView() {
  const [filter, setFilter] = useState<DashboardFilter>(DEFAULT_FILTER);
  const [metric, setMetric] = useState<SeriesMetric>("sales");

  const optionsFetcher = useCallback(() => adminRepository.getDashboardFilterOptions(), []);
  const { data: options } = useAdminData(optionsFetcher);

  const analyticsFetcher = useCallback(() => adminRepository.getDashboardAnalytics(filter), [filter]);
  const { data, loading, error, reload } = useAdminData(analyticsFetcher);

  function patchFilter(patch: Partial<DashboardFilter>) {
    setFilter((prev) => ({ ...prev, ...patch }));
  }

  function resetFilter() {
    setFilter(DEFAULT_FILTER);
  }

  function toggleStatus(status: DashboardOrderStatus) {
    patchFilter({ orderStatus: filter.orderStatus === status ? undefined : status });
  }

  function toggleState(state: string) {
    patchFilter({ state: filter.state === state ? undefined : state });
  }

  function toggleSource(source: string) {
    patchFilter({ source: (filter.source === source ? undefined : source) as DashboardFilter["source"] });
  }

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error || !data) return <ErrorState message={error ?? "Could not load dashboard."} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-primary/60">
          Commerce analytics — demo data, deterministic across reloads. Dataset spans {DATASET_BOUNDS.from} to {DATASET_BOUNDS.to}.
        </p>
      </div>

      <DashboardFilterBar
        filter={filter}
        options={options}
        datasetFrom={DATASET_BOUNDS.from}
        datasetTo={DATASET_BOUNDS.to}
        onChange={patchFilter}
        onReset={resetFilter}
      />

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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <MetricComparisonCard label="Gross sales" comparison={data.summary.grossSales} showComparison={filter.compare} format={(v) => currency.format(v)} icon={<TagIcon width={16} height={16} />} />
            <MetricComparisonCard label="Orders" comparison={data.summary.orders} showComparison={filter.compare} format={(v) => v.toLocaleString("en-IN")} icon={<ReceiptIcon width={16} height={16} />} />
            <MetricComparisonCard label="Avg. order value" comparison={data.summary.averageOrderValue} showComparison={filter.compare} format={(v) => currency.format(v)} />
            <MetricComparisonCard label="Conversion rate" comparison={data.summary.conversionRate} showComparison={filter.compare} format={(v) => `${v}%`} icon={<ChartIcon width={16} height={16} />} />
            <MetricComparisonCard label="Customers" comparison={data.summary.customers} showComparison={filter.compare} format={(v) => v.toLocaleString("en-IN")} icon={<UsersIcon width={16} height={16} />} />
            <MetricComparisonCard label="Open returns" comparison={data.summary.openReturns} showComparison={filter.compare} format={(v) => v.toLocaleString("en-IN")} icon={<ReturnIcon width={16} height={16} />} />
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

          <SectionCard title="Store conversion funnel">
            <ConversionFunnel stages={data.funnel} />
          </SectionCard>

          <ProductPerformanceSection rows={data.productPerformance} />

          <ProductInterestSection rows={data.productInterest} mostViewedProductName={data.mostViewedProductName} />

          <OrderStatusSection
            slices={data.orderStatus}
            recentOrders={data.recentOrders}
            activeStatus={filter.orderStatus}
            onStatusClick={toggleStatus}
          />

          <FulfilmentSection fulfilment={data.fulfilment} />

          <LocationSection locations={data.locations} activeState={filter.state} onStateClick={toggleState} />

          <CustomerOverviewSection overview={data.customerOverview} />

          <ReturnsSection returns={data.returns} />

          <TrafficSourcesSection sources={data.trafficSources} activeSource={filter.source} onSourceClick={toggleSource} />

          <BusinessInsightsSection insights={data.insights} />
        </>
      )}
    </div>
  );
}
