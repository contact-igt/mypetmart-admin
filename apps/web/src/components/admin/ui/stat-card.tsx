import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-primary/55">{label}</p>
        {icon && <span className="text-text-primary/40">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-primary/55">{hint}</p>}
    </div>
  );
}
