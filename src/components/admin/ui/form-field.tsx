import type { ReactNode } from "react";

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-primary/70">
        {label} {optional && <span className="font-normal normal-case text-text-primary/45">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-text-primary/50">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs font-medium text-terracotta">
          {error}
        </p>
      )}
    </div>
  );
}

export const ADMIN_INPUT_CLASS =
  "block w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary transition-colors duration-150 ease-out focus-visible:border-primary-orange";
