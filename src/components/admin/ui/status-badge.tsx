const TONE_CLASSES: Record<string, string> = {
  // order statuses
  pending: "bg-yellow-card text-text-primary",
  confirmed: "bg-orange-hero text-text-primary",
  processing: "bg-peach-hero text-text-primary",
  shipped: "bg-mint-sage text-text-primary",
  delivered: "bg-primary-orange/15 text-primary-orange",
  cancelled: "bg-terracotta/15 text-terracotta",
  return_requested: "bg-deep-brown/10 text-deep-brown",
  // fulfilment statuses
  unfulfilled: "bg-cream-bg text-text-primary/70 border border-border-subtle",
  packed: "bg-peach-hero text-text-primary",
  // payment statuses
  paid: "bg-mint-sage text-text-primary",
  failed: "bg-terracotta/15 text-terracotta",
  refunded: "bg-deep-brown/10 text-deep-brown",
  // product statuses
  active: "bg-mint-sage text-text-primary",
  draft: "bg-cream-bg text-text-primary/70 border border-border-subtle",
  archived: "bg-deep-brown/10 text-deep-brown",
  // customer account statuses
  disabled: "bg-terracotta/15 text-terracotta",
  // return statuses
  requested: "bg-yellow-card text-text-primary",
  approved: "bg-mint-sage text-text-primary",
  rejected: "bg-terracotta/15 text-terracotta",
  resolved: "bg-primary-orange/15 text-primary-orange",
};

export function StatusBadge({ status }: { status: string }) {
  const toneClass = TONE_CLASSES[status] ?? "bg-cream-bg text-text-primary";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${toneClass}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
