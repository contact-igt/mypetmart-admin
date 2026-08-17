import { SectionCard } from "./section-card";
import { StatCard } from "../ui/stat-card";
import type { CustomerOverview } from "@/data/admin/types";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

export function CustomerOverviewSection({ overview }: { overview: CustomerOverview }) {
  return (
    <SectionCard title="Customer overview">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="New customers" value={String(overview.newCustomers)} />
        <StatCard label="Returning customers" value={String(overview.returningCustomers)} />
        <StatCard label="Repeat purchase rate" value={`${overview.repeatPurchaseRate}%`} />
        <StatCard label="Returning-customer revenue" value={currency.format(overview.returningCustomerRevenue)} />
      </div>
      <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-text-primary/55">Recent customers</h3>
      {overview.recentCustomers.length === 0 ? (
        <p className="text-sm text-text-primary/55">No customer activity in this range.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {overview.recentCustomers.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm">
              <span className="truncate font-medium text-text-primary">{c.name}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-text-primary/55">
                {c.isReturning && (
                  <span className="rounded-full bg-mint-sage px-2 py-0.5 font-semibold text-text-primary">Returning</span>
                )}
                Since {dateFormat.format(new Date(c.joinedAt))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
