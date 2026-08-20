"use client";

import { useCallback, useState } from "react";
import { DownloadIcon } from "@/components/icons";
import { getDashboardAnalytics } from "@/lib/api/admin-dashboard-api";
import { buildReportsCsv } from "@/lib/reports-csv.mjs";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { StatCard } from "../ui/stat-card";
import { DataTable, type Column } from "../ui/data-table";
import { BarChart } from "../dashboard/bar-chart";
import { StatusOverview } from "../dashboard/status-overview";
import { useToast } from "../ui/toast";
import type { ProductPerformanceRow } from "@/data/admin/types";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const PERFORMANCE_COLUMNS: Column<ProductPerformanceRow>[] = [
  { key: "name", header: "Product", render: (product) => <span className="font-medium">{product.name}</span> },
  { key: "unitsSold", header: "Units sold", render: (product) => product.unitsSold.toLocaleString("en-IN") },
  { key: "revenue", header: "Revenue", render: (product) => currency.format(product.revenue) },
];

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function lastThirtyDays() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

const DEFAULT_RANGE = lastThirtyDays();
const TODAY = toIsoDate(new Date());

export function ReportsView() {
  const { showToast } = useToast();
  const [from, setFrom] = useState(DEFAULT_RANGE.from);
  const [to, setTo] = useState(DEFAULT_RANGE.to);

  const fetcher = useCallback(
    () => getDashboardAnalytics({ preset: "custom", from, to, compare: false }),
    [from, to],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  function exportCsv() {
    if (!data) return;
    const blob = new Blob(["\uFEFF", buildReportsCsv(data, { from, to })], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mypetmart-report-${from}-to-${to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Report CSV exported.");
  }

  if (loading) return <LoadingState label="Loading reports…" />;
  if (error || !data) return <ErrorState message={error ?? "Could not load reports."} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Reports</h1>
          <p className="mt-1 text-sm text-text-primary/60">Live order, revenue, product and status reporting.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-white px-3.5 py-2 text-sm font-semibold text-text-primary transition-colors duration-150 hover:bg-cream-bg"
        >
          <DownloadIcon width={16} height={16} /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-text-primary/60">
          From
          <input
            type="date"
            value={from}
            max={to}
            onChange={(event) => event.target.value && setFrom(event.target.value)}
            className="h-9 rounded-lg border border-border-subtle bg-white px-2 text-sm focus-visible:border-primary-orange"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-text-primary/60">
          To
          <input
            type="date"
            value={to}
            min={from}
            max={TODAY}
            onChange={(event) => event.target.value && setTo(event.target.value)}
            className="h-9 rounded-lg border border-border-subtle bg-white px-2 text-sm focus-visible:border-primary-orange"
          />
        </label>
        {(from !== DEFAULT_RANGE.from || to !== DEFAULT_RANGE.to) && (
          <button
            type="button"
            onClick={() => {
              setFrom(DEFAULT_RANGE.from);
              setTo(DEFAULT_RANGE.to);
            }}
            className="text-xs font-semibold text-primary-orange hover:underline"
          >
            Reset to last 30 days
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Orders in range" value={data.summary.orders.value.toLocaleString("en-IN")} />
        <StatCard label="Revenue in range" value={currency.format(data.summary.grossSales.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border-subtle bg-white p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-primary">Orders by {data.timeSeries.groupBy}</h2>
          {data.isEmpty ? (
            <EmptyState title="No orders in this range" />
          ) : (
            <div className="mt-4">
              <BarChart
                ariaLabel={`Orders by ${data.timeSeries.groupBy} for the selected range`}
                points={data.timeSeries.current.map((point) => ({ label: point.label, value: point.orders }))}
                formatValue={(value) => `${value} order${value === 1 ? "" : "s"}`}
              />
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border-subtle bg-white p-4">
          <h2 className="text-sm font-semibold text-text-primary">Order status distribution</h2>
          <div className="mt-4">
            {data.isEmpty ? (
              <EmptyState title="No order statuses in this range" />
            ) : (
              <StatusOverview breakdown={data.orderStatus.map(({ status, count }) => ({ status, count }))} />
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Product performance</h2>
        {data.productPerformance.length === 0 ? (
          <EmptyState title="No product sales in this range" />
        ) : (
          <DataTable
            columns={PERFORMANCE_COLUMNS}
            rows={data.productPerformance}
            getRowId={(product) => String(product.productId)}
          />
        )}
      </div>
    </div>
  );
}
