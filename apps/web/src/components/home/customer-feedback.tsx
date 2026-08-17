const CARD_TONE_CLASSES = [
  "bg-white",
  "bg-orange-hero",
  "bg-yellow-card",
  "bg-terracotta text-white",
  "bg-peach-hero",
  "bg-cream-bg border border-border-subtle",
];

/**
 * No real customer reviews exist yet (auth + orders are not built). This
 * preserves the reference's varied-colour testimonial grid rhythm without
 * fabricating quotes, names or star ratings — see docs/DESIGN_SYSTEM.md §18.
 */
export function CustomerFeedback() {
  return (
    <section className="section-block bg-peach-hero">
      <div className="site-container">
        <span className="pill-label bg-white text-text-primary">Real pet parents</span>
        <h2 className="display-heading mt-4 text-3xl text-text-primary sm:text-4xl">
          Real pet parents.
          <span className="accent">Real happy tails.</span>
        </h2>
        <p className="body-copy mt-4 max-w-lg text-text-primary/80">
          We&apos;re collecting genuine feedback from pet parents shopping with us. Real
          reviews will appear here once they&apos;re in.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARD_TONE_CLASSES.map((toneClass, index) => (
            <div
              key={toneClass}
              className={`warm-card flex min-h-[11rem] flex-col justify-between ${toneClass} ${
                index === 0 ? "lg:row-span-2 lg:min-h-[24rem]" : ""
              }`}
            >
              <span className="eyebrow opacity-60">Coming soon</span>
              <p
                className="italic opacity-70"
                style={{ fontFamily: "var(--font-display-italic)" }}
              >
                A real story from a pet parent will live here.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
