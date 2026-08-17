"use client";

import { useCallback, useState } from "react";
import { adminRepository } from "@/data/admin/mock-repository";
import { useAdminData } from "../ui/use-admin-data";
import { LoadingState, ErrorState, EmptyState } from "../ui/empty-state";
import { StatCard } from "../ui/stat-card";
import { DataTable, type Column } from "../ui/data-table";
import { BarChart } from "../dashboard/bar-chart";
import { StatusOverview } from "../dashboard/status-overview";
import { useToast } from "../ui/toast";
import type { ProductPerformance } from "@/data/admin/types";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const PERFORMANCE_COLUMNS: Column<ProductPerformance>[] = [
  { key: "name", header: "Product", render: (p) => <span className="font-medium">{p.name}</span> },
  { key: "unitsSold", header: "Units sold", render: (p) => p.unitsSold },
  { key: "revenue", header: "Revenue", render: (p) => currency.format(p.revenue) },
];

export function ReportsView() {
  const { showToast } = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetcher = useCallback(
    () =>
      adminRepository.getReportsData({
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
      }),
    [from, to],
  );
  const { data, loading, error, reload } = useAdminData(fetcher);

  if (loading) return <LoadingState label="Loading reports…" />;
  if (error || !data) return <ErrorState message={error ?? "Could not load reports."} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Reports</h1>
          <p className="mt-1 text-sm text-text-primary/60">Day-wise orders, product performance and status mix.</p>
        </div>
        <button
          type="button"
          title="Integration required — no export backend exists yet"
          onClick={() => showToast("CSV export requires a backend integration — not available in this demo.", "info")}
          className="rounded-lg border border-dashed border-border-subtle px-3.5 py-2 text-sm font-semibold text-text-primary/60 hover:bg-cream-bg"
        >
          Export CSV <span className="ml-1 text-xs font-normal">(Integration required)</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-text-primary/60">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-lg border border-border-subtle bg-white px-2 text-sm focus-visible:border-primary-orange"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-text-primary/60">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-lg border border-border-subtle bg-white px-2 text-sm focus-visible:border-primary-orange"
          />
        </label>
        {(from || to) && (
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="text-xs font-semibold text-primary-orange hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatCard label="Orders in range" value={String(data.totalOrders)} />
        <StatCard label="Revenue in range" value={currency.format(data.totalRevenue)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border-subtle bg-white p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-primary">Orders by day</h2>
          {data.dailySeries.length === 0 ? (
            <EmptyState title="No orders in this range" />
          ) : (
            <div className="mt-4">
              <BarChart
                ariaLabel="Orders by day for the selected range"
                points={data.dailySeries.map((d) => ({ label: d.date.slice(5), value: d.orders }))}
                formatValue={(v) => `${v} order${v === 1 ? "" : "s"}`}
              />
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border-subtle bg-white p-4">
          <h2 className="text-sm font-semibold text-text-primary">Order status distribution</h2>
          <div className="mt-4">
            <StatusOverview breakdown={data.statusBreakdown} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Product performance</h2>
        {data.productPerformance.length === 0 ? (
          <EmptyState title="No product sales in this range" />
        ) : (
          <DataTable columns={PERFORMANCE_COLUMNS} rows={data.productPerformance} getRowId={(p) => p.productId} />
        )}
      </div>
    </div>
  );
}
