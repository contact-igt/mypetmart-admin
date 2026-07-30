export default function Home() {
  return (
    <main className="flex-1">
      <section className="section-block bg-orange-hero">
        <div className="site-container flex flex-col items-start gap-6">
          <span className="eyebrow">Visual foundation preview</span>
          <h1 className="display-heading max-w-2xl text-4xl text-text-primary sm:text-5xl lg:text-6xl">
            MyPetMart
            <span className="accent mt-2 text-2xl sm:text-3xl lg:text-4xl">
              Thoughtful essentials for happier pets.
            </span>
          </h1>
          <p className="body-copy max-w-xl">
            This is a visual foundation preview, not the final homepage. The{" "}
            <a href="#">locked storefront UI</a> will be implemented next.
          </p>
          <div className="flex flex-wrap gap-4">
            <button type="button" className="button-primary">
              Primary action
            </button>
            <button type="button" className="button-secondary">
              Secondary action
            </button>
          </div>
        </div>
      </section>

      <section className="section-block bg-cream-bg">
        <div className="site-container">
          <h2 className="display-heading mb-8 text-2xl text-text-primary">
            Foundation components
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="warm-card">
              <p className="eyebrow">Warm card</p>
              <p className="body-copy mt-3">
                A rounded, warm-toned surface used for cards across the
                storefront.
              </p>
            </div>

            <div className="warm-card flex flex-col overflow-hidden p-0">
              <div className="relative aspect-[4/5] bg-orange-hero">
                <span className="pill-label absolute left-3 top-3 bg-white text-text-primary">
                  Preview
                </span>
              </div>
              <div className="bg-peach-hero p-5">
                <p className="body-copy font-semibold">Sample product card</p>
              </div>
            </div>

            <div className="warm-card">
              <label htmlFor="preview-email" className="eyebrow mb-3 block">
                Email address
              </label>
              <input
                id="preview-email"
                name="email"
                type="email"
                autoComplete="off"
                placeholder="you@example.com"
                className="field-control"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
