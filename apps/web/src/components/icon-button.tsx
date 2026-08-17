import type { ReactNode } from "react";

/**
 * Header icon slot for a feature that isn't built yet (search, wishlist,
 * account, cart). Rendered as a real, focusable, keyboard-operable button —
 * not a dead link — so the layout and interaction rhythm are correct today
 * and only the click behaviour needs wiring once the backing module (auth,
 * cart, product search) exists. Same non-functional-icon-slot pattern
 * docs/DESIGN_SYSTEM.md §18 specifies for wishlist.
 */
export function IconButton({
  label,
  children,
  variant = "ghost",
  hideBelowSm = false,
}: {
  label: string;
  children: ReactNode;
  variant?: "ghost" | "solid";
  hideBelowSm?: boolean;
}) {
  const variantClass =
    variant === "solid"
      ? "h-11 w-11 bg-deep-brown text-white hover:opacity-90"
      : "h-10 w-10 text-text-primary hover:bg-white/60";
  const displayClass = hideBelowSm ? "hidden sm:inline-flex" : "inline-flex";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`${displayClass} items-center justify-center rounded-full transition-colors duration-150 ease-out ${variantClass}`}
    >
      {children}
    </button>
  );
}
