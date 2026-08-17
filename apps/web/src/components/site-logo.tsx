import Link from "next/link";

/**
 * Dog+cat heart mark, simplified from the reference logo (see docs/STATUS.md
 * shell-build entry) — an inline SVG reinterpretation, not a pixel trace,
 * since no vector source asset exists.
 */
function LogoMark({ tone }: { tone: "brand" | "inverted" }) {
  const dog = tone === "brand" ? "var(--color-logo-navy)" : "currentColor";
  const cat = tone === "brand" ? "var(--color-primary-orange)" : "currentColor";
  const heartId = tone === "brand" ? "heart-brand" : "heart-inverted";

  return (
    <svg viewBox="0 0 48 44" width="40" height="36" aria-hidden="true">
      <defs>
        <clipPath id={heartId}>
          <path d="M24 40C13 33 4 26 4 16.5 4 10.7 8.6 6 14.3 6c3.8 0 7.2 2 9.7 5.4C26.5 8 29.9 6 33.7 6 39.4 6 44 10.7 44 16.5 44 26 35 33 24 40Z" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${heartId})`}>
        <rect x="4" y="4" width="20" height="38" fill={dog} />
        <rect x="24" y="4" width="20" height="38" fill={cat} />
        {/* dog ear fold */}
        <path d="M10 12c2.5 1 4 3.4 4 6.4-3-.3-5.6-2.4-6-5.4-.2-1.2.8-1.6 2-1Z" fill={tone === "brand" ? "var(--color-cream-bg)" : "none"} opacity={0.5} />
      </g>

      {/* paw print accent, top-right negative space */}
      <g fill={dog} opacity={tone === "brand" ? 1 : 0.85}>
        <circle cx="35.5" cy="8.5" r="1.7" />
        <circle cx="39.5" cy="7" r="1.5" />
        <circle cx="43" cy="9" r="1.4" />
        <ellipse cx="39.5" cy="12" rx="2.6" ry="2.1" />
      </g>

      <path
        d="M24 40C13 33 4 26 4 16.5 4 10.7 8.6 6 14.3 6c3.8 0 7.2 2 9.7 5.4C26.5 8 29.9 6 33.7 6 39.4 6 44 10.7 44 16.5 44 26 35 33 24 40Z"
        fill="none"
        stroke={tone === "inverted" ? "currentColor" : "none"}
        strokeWidth={tone === "inverted" ? 1.5 : 0}
      />
    </svg>
  );
}

export function SiteLogo({
  tone = "brand",
  className,
}: {
  tone?: "brand" | "inverted";
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 ${className ?? ""}`}
      aria-label="My Pet Mart — home"
    >
      <LogoMark tone={tone} />
      <span className="display-heading text-xl leading-none sm:text-2xl">
        {tone === "brand" ? (
          <>
            <span style={{ color: "var(--color-logo-navy)" }}>My</span>{" "}
            <span style={{ color: "var(--color-primary-orange)" }}>Pet</span>{" "}
            <span style={{ color: "var(--color-logo-navy)" }}>Mart</span>
          </>
        ) : (
          <span>My Pet Mart</span>
        )}
      </span>
    </Link>
  );
}
