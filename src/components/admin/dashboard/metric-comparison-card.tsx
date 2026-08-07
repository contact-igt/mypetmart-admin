import type { ReactNode } from "react";
import type { MetricComparison } from "@/data/admin/types";

export function MetricComparisonCard({
  label,
  comparison,
  showComparison,
  format = (v) => String(v),
  icon,
}: {
  label: string;
  comparison: MetricComparison;
  showComparison: boolean;
  format?: (value: number) => string;
  icon?: ReactNode;
}) {
  const pillClass =
    comparison.changePct === null
      ? "bg-cream-bg text-text-primary/60"
      : comparison.changePct >= 0
        ? "bg-mint-sage text-text-primary"
        : "bg-terracotta/15 text-terracotta";
  const pillText =
    comparison.changePct === null
      ? comparison.value > 0
        ? "New this period"
        : "No prior data"
      : `${comparison.changePct >= 0 ? "+" : ""}${comparison.changePct}% vs previous`;

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-primary/55">{label}</p>
        {icon && <span className="text-text-primary/40">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold text-text-primary">{format(comparison.value)}</p>
      {showComparison && (
        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${pillClass}`}>
          {pillText}
        </span>
      )}
    </div>
  );
}
