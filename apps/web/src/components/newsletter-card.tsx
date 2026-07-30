"use client";

/**
 * Visual newsletter section (docs/DESIGN_SYSTEM.md §8). No email-capture
 * backend exists yet, so submission is a safe no-op rather than a real
 * subscribe action or an unhandled form navigation.
 */
export function NewsletterCard() {
  return (
    <div className="site-container relative z-10 -mb-16 sm:-mb-20">
      <div className="warm-card bg-orange-hero px-6 py-8 sm:px-10 sm:py-10">
        <span className="pill-label bg-white text-text-primary">Newsletter</span>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-sm">
            <h2 className="display-heading text-2xl text-text-primary sm:text-3xl">
              Treats for your inbox.
            </h2>
            <p className="body-copy mt-2 italic text-text-primary/80">
              Product drops, gentle pet-care tips and a little extra cuteness —
              never spam.
            </p>
          </div>

          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@paws.com"
              className="field-control flex-1"
            />
            <button
              type="submit"
              className="inline-flex h-[var(--button-height)] items-center justify-center rounded-full bg-deep-brown px-6 font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
