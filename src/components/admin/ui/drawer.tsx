"use client";

import type { ReactNode } from "react";
import { useFocusTrap } from "./use-focus-trap";
import { CloseIcon } from "@/components/icons";

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "right",
  tone = "light",
  maxWidthClassName = "max-w-sm",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
  /** "dark" matches the admin sidebar's bg-deep-brown — use when the
   *  drawer's content (e.g. AdminNavList) is styled for a dark surface. */
  tone?: "light" | "dark";
  maxWidthClassName?: string;
}) {
  const panelRef = useFocusTrap(open, onClose);

  if (!open) return null;

  const sideClass = side === "right" ? "right-0" : "left-0";
  const isDark = tone === "dark";

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-deep-brown/50"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-drawer-title"
        tabIndex={-1}
        className={`absolute top-0 ${sideClass} flex h-full w-full ${maxWidthClassName} flex-col shadow-2xl ${
          isDark ? "bg-deep-brown" : "bg-white"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-4 border-b px-5 py-4 ${
            isDark ? "border-white/10" : "border-border-subtle"
          }`}
        >
          <h2
            id="admin-drawer-title"
            className={`text-base font-semibold ${isDark ? "text-white" : "text-text-primary"}`}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 ease-out ${
              isDark
                ? "text-white/60 hover:bg-white/10 hover:text-white"
                : "text-text-primary/60 hover:bg-cream-bg hover:text-text-primary"
            }`}
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
