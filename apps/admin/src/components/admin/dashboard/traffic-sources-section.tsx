import { SectionCard } from "./section-card";
import { RankedBarList } from "./ranked-bar-list";
import type { DashboardFilter, TrafficSourceRow } from "@/data/admin/types";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function TrafficSourcesSection({
  sources,
  activeSource,
  onSourceClick,
}: {
  sources: TrafficSourceRow[];
  activeSource?: DashboardFilter["source"];
  onSourceClick: (source: string) => void;
}) {
  return (
    <SectionCard
      title="Traffic sources"
      description="Instagram, Facebook and YouTube are mypetmart.org's actual linked channels; source-level sessions/conversion here are demo figures until Meta Pixel, GA and Clarity are connected (see CLAUDE.md analytics scope)."
    >
      <RankedBarList
        ariaLabel="Sessions and revenue by traffic source"
        items={sources.map((s) => ({
          key: s.source,
          label: s.label,
          value: s.sessions,
          secondary: `${s.orders} orders · ${s.conversionRate}% conversion · ${currency.format(s.revenue)} revenue`,
        }))}
        formatValue={(v) => `${v.toLocaleString("en-IN")} sessions`}
        activeKey={activeSource}
        onItemClick={onSourceClick}
      />
    </SectionCard>
  );
}
