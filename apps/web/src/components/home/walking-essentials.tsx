import { ImagePlaceholder } from "@/components/image-placeholder";
import { ArrowRightIcon } from "@/components/icons";

export function WalkingEssentials() {
  return (
    <section className="section-block bg-terracotta">
      <div className="site-container grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <span className="pill-label bg-white text-text-primary">Walking essentials</span>
          <h2 className="display-heading mt-4 text-3xl text-white sm:text-4xl">
            Two happy dogs.
            <span
              className="mt-1 block text-2xl italic text-white/90 sm:text-3xl"
              style={{ fontFamily: "var(--font-display-italic)" }}
            >
              One easier walk.
            </span>
          </h2>
          <p
            className="mt-4 max-w-md italic text-white/85"
            style={{ fontFamily: "var(--font-display-italic)" }}
          >
            360&deg; tangle-free rotation, independent leash control, reflective stitching for
            evening walks and a padded comfort handle.
          </p>
          <button
            type="button"
            className="mt-6 inline-flex h-[var(--button-height)] items-center gap-2 rounded-full bg-white px-6 font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-cream-bg"
          >
            Meet the Dual Leash <ArrowRightIcon width={16} height={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ImagePlaceholder
            label="Golden retriever walking on a leash outdoors"
            tone="peach"
            className="aspect-[4/5] w-full"
          />
          <ImagePlaceholder
            label="Puppy running on grass"
            tone="mint"
            className="aspect-[4/5] w-full sm:translate-y-4"
          />
        </div>
      </div>
    </section>
  );
}
