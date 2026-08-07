"use client";

import { useState } from "react";
import type { TimeSeriesPoint } from "@/data/admin/types";

export type SeriesMetric = "sales" | "orders" | "units";

const METRIC_LABELS: Record<SeriesMetric, string> = { sales: "Sales", orders: "Orders", units: "Units sold" };

/**
 * Bars (current period) + an overlaid SVG line (previous period, when
 * comparison is on and the two series have matching bucket counts) —
 * combined line/bar visualization per the dashboard brief, built with plain
 * divs + inline SVG (no chart library).
 */
export function SalesOrdersChart({
  current,
  previous,
  groupBy,
  metric,
  onMetricChange,
  formatValue,
  showComparison,
}: {
  current: TimeSeriesPoint[];
  previous: TimeSeriesPoint[];
  groupBy: "day" | "week";
  metric: SeriesMetric;
  onMetricChange: (metric: SeriesMetric) => void;
  formatValue: (value: number) => string;
  showComparison: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const currentValues = current.map((p) => p[metric]);
  const previousValues = previous.map((p) => p[metric]);
  const canOverlayPrevious = showComparison && previous.length === current.length && current.length > 0;
  const max = Math.max(1, ...currentValues, ...(canOverlayPrevious ? previousValues : []));
  const showEveryLabel = current.length <= 9;

  const linePoints = canOverlayPrevious
    ? previousValues
        .map((v, i) => {
          const x = current.length > 1 ? (i / (current.length - 1)) * 100 : 50;
          const y = 100 - (v / max) * 100;
          return `${x},${y}`;
        })
        .join(" ")
    : "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border-subtle p-0.5">
          {(["sales", "orders", "units"] as SeriesMetric[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMetricChange(m)}
              aria-pressed={metric === m}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 ease-out ${
                metric === m ? "bg-primary-orange text-white" : "text-text-primary/70 hover:bg-cream-bg"
              }`}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
        {canOverlayPrevious && (
          <div className="flex items-center gap-3 text-xs text-text-primary/60">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary-orange" /> Current period
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-deep-brown" /> Previous period
            </span>
          </div>
        )}
      </div>

      {current.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-primary/55">No activity in this range.</p>
      ) : (
        <>
          <div role="img" aria-label={`${METRIC_LABELS[metric]} grouped by ${groupBy}, current vs previous period`} className="relative w-full">
            <div className="flex h-40 items-end gap-1.5">
              {current.map((point, index) => {
                const heightPct = Math.max(3, Math.round((point[metric] / max) * 100));
                return (
                  <div key={point.date} className="group relative flex-1">
                    {activeIndex === index && (
                      <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-deep-brown px-2 py-1 text-xs font-medium text-white">
                        {formatValue(point[metric])}
                        {canOverlayPrevious && ` (prev ${formatValue(previousValues[index])})`}
                      </div>
                    )}
                    <button
                      type="button"
                      onFocus={() => setActiveIndex(index)}
                      onBlur={() => setActiveIndex(null)}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      aria-label={`${point.label}: ${formatValue(point[metric])}`}
                      className="block w-full rounded-t-sm bg-primary-orange/70 transition-colors duration-150 ease-out hover:bg-primary-orange focus-visible:bg-primary-orange"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            {canOverlayPrevious && (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-40 w-full"
              >
                <polyline points={linePoints} fill="none" stroke="var(--color-deep-brown)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </svg>
            )}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {current.map((point, index) => (
              <div key={`${point.date}-label`} className="flex-1 text-center text-[10px] text-text-primary/50">
                {showEveryLabel || index % Math.ceil(current.length / 7) === 0 ? point.label : ""}
              </div>
            ))}
          </div>
          <p className="sr-only">
            {current.map((p) => `${p.label}: ${formatValue(p[metric])}.`).join(" ")}
          </p>
        </>
      )}
    </div>
  );
}
