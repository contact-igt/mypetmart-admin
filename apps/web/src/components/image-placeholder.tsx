import { HeartIcon } from "@/components/icons";

export type PlaceholderTone =
  | "peach"
  | "orange"
  | "mint"
  | "terracotta"
  | "brown"
  | "yellow"
  | "cream";

const TONE_CLASSES: Record<PlaceholderTone, string> = {
  peach: "bg-peach-hero",
  orange: "bg-orange-hero",
  mint: "bg-mint-sage",
  terracotta: "bg-terracotta",
  brown: "bg-deep-brown",
  yellow: "bg-yellow-card",
  cream: "bg-cream-bg border border-border-subtle",
};

const TONE_ICON_CLASSES: Record<PlaceholderTone, string> = {
  peach: "text-text-primary/20",
  orange: "text-white/40",
  mint: "text-text-primary/20",
  terracotta: "text-white/30",
  brown: "text-white/25",
  yellow: "text-text-primary/20",
  cream: "text-text-primary/15",
};

/**
 * Temporary image slot — no licensed product/pet photography is available
 * yet. Renders as an accessible, clearly-labelled colour block matching the
 * reference layout's aspect ratio and radius, not a fabricated photo.
 */
export function ImagePlaceholder({
  label,
  tone = "peach",
  className,
}: {
  label: string;
  tone?: PlaceholderTone;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex items-center justify-center rounded-[var(--radius-card)] ${TONE_CLASSES[tone]} ${className ?? ""}`}
    >
      <HeartIcon width={28} height={28} className={TONE_ICON_CLASSES[tone]} />
    </div>
  );
}
