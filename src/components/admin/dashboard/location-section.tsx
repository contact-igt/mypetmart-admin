import { SectionCard } from "./section-card";
import { RankedBarList } from "./ranked-bar-list";
import type { DashboardFilter, LocationPerformance } from "@/data/admin/types";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function LocationSection({
  locations,
  activeState,
  onStateClick,
}: {
  locations: LocationPerformance[];
  activeState?: DashboardFilter["state"];
  onStateClick: (state: string) => void;
}) {
  return (
    <SectionCard title="India location performance" description="Ranked by revenue — click a city to filter the whole dashboard to it.">
      <RankedBarList
        ariaLabel="Orders by Indian state and city"
        items={locations.slice(0, 10).map((l) => ({
          key: `${l.state}|${l.city}`,
          filterValue: l.state,
          label: `${l.city}, ${l.state}`,
          value: l.revenue,
          secondary: `${l.orders} orders · ${l.customers} customers · ${currency.format(l.averageOrderValue)} AOV`,
        }))}
        formatValue={(v) => currency.format(v)}
        activeKey={activeState}
        onItemClick={onStateClick}
      />
    </SectionCard>
  );
}
