import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle bg-white px-6 py-14 text-center">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-primary/60">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-white px-6 py-14 text-sm text-text-primary/60">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-border-subtle border-t-primary-orange"
      />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-terracotta/30 bg-terracotta/5 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-terracotta">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-terracotta/40 px-3 py-1.5 text-sm font-medium text-terracotta transition-colors duration-150 ease-out hover:bg-terracotta/10"
        >
          Try again
        </button>
      )}
    </div>
  );
}
