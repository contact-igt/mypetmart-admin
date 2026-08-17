import { StatusBadge } from "../ui/status-badge";
import type { StatusCount } from "@/data/admin/types";

const STATUS_BAR_CLASSES: Record<string, string> = {
  pending: "bg-yellow-card",
  processing: "bg-peach-hero",
  shipped: "bg-mint-sage",
  delivered: "bg-primary-orange",
  cancelled: "bg-terracotta",
};

export function StatusOverview({ breakdown }: { breakdown: StatusCount[] }) {
  const total = Math.max(1, breakdown.reduce((sum, s) => sum + s.count, 0));

  return (
    <ul className="flex flex-col gap-3">
      {breakdown.map((entry) => {
        const pct = Math.round((entry.count / total) * 100);
        return (
          <li key={entry.status} className="flex items-center gap-3">
            <div className="w-24 shrink-0">
              <StatusBadge status={entry.status} />
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-bg">
              <div
                className={`h-full rounded-full ${STATUS_BAR_CLASSES[entry.status] ?? "bg-text-primary/30"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-sm font-semibold text-text-primary">
              {entry.count}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
