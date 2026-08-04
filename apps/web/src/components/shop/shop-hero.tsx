import { ImagePlaceholder } from "@/components/image-placeholder";
import { PRODUCTS } from "@/data/products";

export function ShopHero() {
  return (
    <section className="bg-peach-hero pt-[var(--section-spacing-mobile)] pb-20 sm:pt-[var(--section-spacing-desktop)] sm:pb-28">
      <div className="site-container grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <span className="pill-label bg-white text-text-primary">The shop</span>
          <h1 className="display-heading mt-4 text-4xl text-text-primary sm:text-5xl">
            Everything they need to
            <span className="accent">wag, purr and play.</span>
          </h1>
        </div>
        <div className="relative">
          <ImagePlaceholder
            label="Group of kittens and puppies peeking over a table edge"
            tone="cream"
            className="aspect-[16/10] w-full"
          />
          <div className="warm-card absolute -bottom-8 left-6 bg-white px-5 py-4 sm:left-10">
            <span className="eyebrow text-text-primary/60">Showing</span>
            <p className="display-heading text-2xl text-text-primary">
              {PRODUCTS.length} products
            </p>
            <p className="body-copy text-sm text-text-primary/70">Handpicked, quality-checked.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
