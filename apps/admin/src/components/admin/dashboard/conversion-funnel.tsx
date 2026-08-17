import type { FunnelStage } from "@/data/admin/types";

/**
 * One responsive horizontal-bar-per-stage list (proportional bar width,
 * stacked top-to-bottom) rather than two structurally different desktop/
 * mobile chart types — a true side-by-side funnel needs bespoke trapezoid
 * shapes that add complexity without adding readability over this list, and
 * count/conversion/drop-off stay equally legible at every width. Documented
 * as a deliberate simplification in the refinement digest.
 */
export function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  const top = Math.max(1, stages[0]?.count ?? 1);

  if (stages.every((s) => s.count === 0)) {
    return <p className="py-10 text-center text-sm text-text-primary/55">No funnel activity in this range.</p>;
  }

  return (
    <ul aria-label="Store conversion funnel" className="flex flex-col gap-3">
      {stages.map((stage) => {
        const widthPct = Math.max(4, Math.round((stage.count / top) * 100));
        return (
          <li key={stage.key}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
              <span className="font-medium text-text-primary">{stage.label}</span>
              <span className="flex items-baseline gap-2">
                <span className="font-semibold text-text-primary">{stage.count.toLocaleString("en-IN")}</span>
                {stage.conversionFromPrevious !== null && (
                  <span className="text-xs text-text-primary/55">
                    {stage.conversionFromPrevious}% conversion · {stage.dropOffFromPrevious}% drop-off
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-cream-bg">
              <div className="h-full rounded-full bg-primary-orange transition-[width] duration-150 ease-out" style={{ width: `${widthPct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
