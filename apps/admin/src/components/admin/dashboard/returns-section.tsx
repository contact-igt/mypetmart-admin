import { SectionCard } from "./section-card";
import { StatCard } from "../ui/stat-card";
import type { ReturnsOverview } from "@/data/admin/types";

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  resolved: "Resolved",
};

export function ReturnsSection({ returns }: { returns: ReturnsOverview }) {
  return (
    <SectionCard
      title="Returns and service issues"
      description={`Eligibility rule: requests within ${returns.returnWindowDays} days of delivery are in-window (configurable demo rule, matching mypetmart.org's published refund policy). Resolution stays a manual admin decision — no automated refunds or pickups.`}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Open requests" value={String(returns.open)} />
        <StatCard label="Damaged product" value={String(returns.damaged)} />
        <StatCard label="Wrong item" value={String(returns.wrongItem)} />
        <StatCard label="Other reason" value={String(returns.other)} />
        <StatCard label="Within eligibility window" value={`${returns.eligibleWithinWindowPct}%`} />
      </div>
      <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-text-primary/55">Status distribution</h3>
      <ul className="flex flex-col gap-2">
        {returns.statusBreakdown.map((s) => {
          const pct = returns.open > 0 ? Math.round((s.count / returns.open) * 100) : 0;
          return (
            <li key={s.status} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-text-primary">{STATUS_LABELS[s.status]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-bg">
                <div className="h-full rounded-full bg-terracotta" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-semibold text-text-primary">{s.count}</span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
