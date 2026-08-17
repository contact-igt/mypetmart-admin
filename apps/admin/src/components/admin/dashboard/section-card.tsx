import type { ReactNode } from "react";
import { AlertIcon } from "@/components/icons";

export function SectionCard({
  title,
  description,
  demoLabel,
  action,
  children,
}: {
  title: string;
  description?: string;
  /** e.g. "Demo preview only — not live inventory" — rendered as a small inline notice under the title. */
  demoLabel?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border-subtle bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-text-primary/55">{description}</p>}
          {demoLabel && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-terracotta">
              <AlertIcon width={12} height={12} /> {demoLabel}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
