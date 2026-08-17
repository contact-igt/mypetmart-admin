"use client";

import type { DashboardOrderStatus, OrderStatusSlice } from "@/data/admin/types";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATUS_LABELS: Record<DashboardOrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
};

const STATUS_COLOR_CLASSES: Record<DashboardOrderStatus, string> = {
  pending: "text-yellow-card",
  confirmed: "text-orange-hero",
  processing: "text-peach-hero",
  shipped: "text-mint-sage",
  delivered: "text-primary-orange",
  cancelled: "text-terracotta",
  return_requested: "text-deep-brown",
};

/**
 * SVG donut built from stroke-dasharray segments (no chart library). Legend
 * rows double as filter buttons — clicking a status (or its segment) toggles
 * that status into the shared dashboard filter so Recent orders narrows
 * accordingly; clicking the active one again clears it.
 */
export function OrderStatusDonut({
  slices,
  activeStatus,
  onStatusClick,
}: {
  slices: OrderStatusSlice[];
  activeStatus?: DashboardOrderStatus;
  onStatusClick: (status: DashboardOrderStatus) => void;
}) {
  const total = slices.reduce((sum, s) => sum + s.count, 0);
  let cumulative = 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative mx-auto h-40 w-40 shrink-0 sm:mx-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--color-cream-bg)" strokeWidth={14} />
          {total > 0 &&
            slices
              .filter((s) => s.count > 0)
              .map((s) => {
                const fraction = s.count / total;
                const dash = fraction * CIRCUMFERENCE;
                const offset = -cumulative * CIRCUMFERENCE;
                cumulative += fraction;
                const isDimmed = activeStatus && activeStatus !== s.status;
                return (
                  <circle
                    key={s.status}
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={14}
                    strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                    strokeDashoffset={offset}
                    className={`${STATUS_COLOR_CLASSES[s.status]} transition-opacity duration-150 ease-out ${isDimmed ? "opacity-30" : "opacity-100"}`}
                  />
                );
              })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-text-primary">{total}</span>
          <span className="text-[11px] text-text-primary/55">orders</span>
        </div>
      </div>

      <ul aria-label="Order status breakdown" className="flex flex-1 flex-col gap-1.5">
        {slices.map((s) => {
          const isActive = activeStatus === s.status;
          return (
            <li key={s.status}>
              <button
                type="button"
                onClick={() => onStatusClick(s.status)}
                aria-pressed={isActive}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors duration-150 ease-out hover:bg-cream-bg ${isActive ? "bg-cream-bg" : ""}`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_COLOR_CLASSES[s.status].replace("text-", "bg-")}`} />
                  <span className="truncate font-medium text-text-primary">{STATUS_LABELS[s.status]}</span>
                </span>
                <span className="shrink-0 text-xs text-text-primary/60">
                  {s.count} · {s.percentage}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
