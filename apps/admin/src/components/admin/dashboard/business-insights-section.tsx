import { SectionCard } from "./section-card";
import type { BusinessInsight } from "@/data/admin/types";

const TONE_CLASSES: Record<BusinessInsight["tone"], string> = {
  positive: "border-mint-sage bg-mint-sage/30",
  warning: "border-terracotta/40 bg-terracotta/10",
  neutral: "border-border-subtle bg-cream-bg/60",
};

export function BusinessInsightsSection({ insights }: { insights: BusinessInsight[] }) {
  return (
    <SectionCard title="Business insights" description="Generated from the filtered data above — only shown when the numbers support them.">
      {insights.length === 0 ? (
        <p className="py-4 text-sm text-text-primary/55">Not enough signal in this filtered range to surface an insight yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {insights.map((insight) => (
            <li key={insight.id} className={`rounded-lg border px-3 py-2.5 text-sm text-text-primary ${TONE_CLASSES[insight.tone]}`}>
              {insight.text}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
