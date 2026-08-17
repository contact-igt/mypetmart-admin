"use client";

import type { ReactNode } from "react";
import { useFocusTrap } from "./use-focus-trap";
import { CloseIcon } from "@/components/icons";

export function Dialog({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  const panelRef = useFocusTrap(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-deep-brown/50"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        tabIndex={-1}
        className={`relative z-10 w-full ${maxWidthClassName} max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="admin-dialog-title" className="text-lg font-semibold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-primary/60 transition-colors duration-150 ease-out hover:bg-cream-bg hover:text-text-primary"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
