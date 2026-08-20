"use client";

import { useState } from "react";

export type BarChartPoint = { label: string; value: number };

/**
 * Small CSS-only bar chart (no chart library, per this task's constraints).
 * Bars are proportional-height divs; a tooltip on hover/focus shows the
 * exact value. Keyboard users can Tab through bars (each is a real button).
 */
export function BarChart({
  points,
  formatValue = (v) => String(v),
  ariaLabel,
}: {
  points: BarChartPoint[];
  formatValue?: (value: number) => string;
  ariaLabel: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const showEveryLabel = points.length <= 9;

  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <div className="flex h-40 items-end gap-1.5 lg:h-72">
        {points.map((point, index) => {
          const heightPct = Math.max(3, Math.round((point.value / max) * 100));
          return (
            <div key={`${point.label}-${index}`} className="group relative flex h-full flex-1 items-end">
              {activeIndex === index && (
                <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-deep-brown px-2 py-1 text-xs font-medium text-white">
                  {formatValue(point.value)}
                </div>
              )}
              <button
                type="button"
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                aria-label={`${point.label}: ${formatValue(point.value)}`}
                className="block w-full rounded-t-sm bg-primary-orange/70 transition-colors duration-150 ease-out hover:bg-primary-orange focus-visible:bg-primary-orange"
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {points.map((point, index) => (
          <div key={`${point.label}-label-${index}`} className="flex-1 text-center text-[10px] text-text-primary/50">
            {showEveryLabel || index % Math.ceil(points.length / 7) === 0 ? point.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
