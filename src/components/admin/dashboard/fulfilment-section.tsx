import { SectionCard } from "./section-card";
import { StatCard } from "../ui/stat-card";
import type { FulfilmentSummary } from "@/data/admin/types";

export function FulfilmentSection({ fulfilment }: { fulfilment: FulfilmentSummary }) {
  return (
    <SectionCard
      title="Shipping and fulfilment"
      description="From real Order status and Shipment records. “Delayed” is a heuristic: in-transit shipments still not delivered more than 5 days after shipping — there is no carrier SLA configured to compare against."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Awaiting fulfilment" value={String(fulfilment.awaitingFulfilment)} />
        <StatCard label="Packed" value={String(fulfilment.packed)} />
        <StatCard label="Shipped" value={String(fulfilment.shipped)} />
        <StatCard label="Delivered" value={String(fulfilment.delivered)} />
        <StatCard label="Delayed" value={String(fulfilment.delayed)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Avg. processing time" value={`${fulfilment.avgProcessingHours}h`} />
        <StatCard label="Avg. delivery time" value={`${fulfilment.avgDeliveryDays}d`} />
        <StatCard label="Standard orders" value={String(fulfilment.standardOrders)} />
        <StatCard label="Express orders" value={String(fulfilment.expressOrders)} />
      </div>
    </SectionCard>
  );
}
