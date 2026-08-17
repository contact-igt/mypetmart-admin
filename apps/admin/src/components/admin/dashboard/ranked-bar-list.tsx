export type RankedBarItem = {
  key: string;
  label: string;
  value: number;
  secondary?: string;
  /** Value passed to onItemClick / compared against activeKey — defaults to `key`. Separate from `key` because list rows aren't always uniquely identified by the thing they filter on (e.g. several cities share one state filter value). */
  filterValue?: string;
};

/**
 * Shared horizontal ranked-bar primitive — reused by Product performance,
 * India location performance and Traffic sources so the three "top N" lists
 * on the dashboard share one visual language.
 */
export function RankedBarList({
  items,
  formatValue,
  ariaLabel,
  activeKey,
  onItemClick,
  emptyLabel = "No data for the current filters.",
}: {
  items: RankedBarItem[];
  formatValue: (value: number) => string;
  ariaLabel: string;
  activeKey?: string;
  onItemClick?: (key: string) => void;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-text-primary/55">{emptyLabel}</p>;
  }

  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul aria-label={ariaLabel} className="flex flex-col gap-2.5">
      {items.map((item) => {
        const widthPct = Math.max(3, Math.round((item.value / max) * 100));
        const targetValue = item.filterValue ?? item.key;
        const isActive = activeKey === targetValue;
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium text-text-primary">{item.label}</span>
              <span className="shrink-0 font-semibold text-text-primary">{formatValue(item.value)}</span>
            </div>
            {item.secondary && <p className="mt-0.5 text-xs text-text-primary/55">{item.secondary}</p>}
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-bg">
              <div
                className={`h-full rounded-full transition-[width] duration-150 ease-out ${isActive ? "bg-terracotta" : "bg-primary-orange"}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={item.key}>
            {onItemClick ? (
              <button
                type="button"
                onClick={() => onItemClick(targetValue)}
                aria-pressed={isActive}
                className={`block w-full rounded-lg p-1.5 text-left transition-colors duration-150 ease-out hover:bg-cream-bg ${isActive ? "bg-cream-bg" : ""}`}
              >
                {content}
              </button>
            ) : (
              <div className="p-1.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
