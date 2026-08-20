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
      description="Open = requested or approved Return Requests not yet resolved or rejected. Resolution stays a manual admin decision — no automated refunds or pickups."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Open requests" value={String(returns.open)} />
        {returns.statusBreakdown.map((s) => (
          <StatCard key={s.status} label={STATUS_LABELS[s.status]} value={String(s.count)} />
        ))}
      </div>
    </SectionCard>
  );
}
