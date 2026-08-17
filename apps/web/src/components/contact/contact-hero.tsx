import { ImagePlaceholder } from "@/components/image-placeholder";

export function ContactHero() {
  return (
    <section className="bg-peach-hero py-[var(--section-spacing-mobile)] sm:py-[var(--section-spacing-desktop)]">
      <div className="site-container grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <span className="pill-label bg-white text-text-primary">Contact</span>
          <h1 className="display-heading mt-4 text-4xl text-text-primary sm:text-5xl">
            We&apos;re all ears.
            <span className="accent">Even the floppy ones.</span>
          </h1>
          <p className="body-copy mt-4 max-w-md text-text-primary/85">
            Questions about a product, delivery or your order? Our team is ready to help.
          </p>
        </div>
        <ImagePlaceholder
          label="Row of kittens and puppies peeking over a table edge"
          tone="cream"
          className="aspect-[16/9] w-full"
        />
      </div>
    </section>
  );
}
