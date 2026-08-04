import Link from "next/link";
import { ImagePlaceholder } from "@/components/image-placeholder";
import { CATEGORIES, CATEGORY_PROMO_TEXT, type HomeCategory } from "./home-data";
import { ArrowRightIcon } from "@/components/icons";

function CategoryTile({ category, className }: { category: HomeCategory; className?: string }) {
  return (
    <Link
      href={category.href}
      className={`group relative block aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] sm:aspect-auto ${className ?? ""}`}
    >
      <ImagePlaceholder label={category.imageLabel} tone={category.tone} className="h-full w-full rounded-[var(--radius-card)]" />
      <div className="absolute inset-x-0 bottom-0 rounded-b-[var(--radius-card)] bg-gradient-to-t from-black/70 via-black/15 to-transparent p-4">
        <p className="eyebrow text-white/80">{category.eyebrow}</p>
        <p className="display-heading text-lg text-white">{category.label}</p>
      </div>
    </Link>
  );
}

function PromoTile({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-[var(--radius-card)] bg-yellow-card p-6 text-center ${className ?? ""}`}
    >
      <p
        className="text-2xl italic text-text-primary"
        style={{ fontFamily: "var(--font-display-italic)" }}
      >
        {CATEGORY_PROMO_TEXT}
      </p>
    </div>
  );
}

export function CategoryGrid() {
  const [grooming, walking, cat, pawCare, dogEssentials] = CATEGORIES;

  return (
    <section className="section-block bg-cream-bg">
      <div className="site-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="pill-label bg-peach-hero text-text-primary">Categories</span>
            <h2 className="display-heading mt-4 text-3xl text-text-primary sm:text-4xl">
              Tail-Wagging
              <span className="accent">favourites.</span>
            </h2>
          </div>
          <Link
            href="/shop"
            className="body-copy inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"
          >
            See everything <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:grid-rows-[repeat(2,14rem)]">
          <CategoryTile category={grooming} className="sm:col-start-1 sm:row-start-1 sm:row-span-2" />
          <PromoTile className="sm:col-start-2 sm:row-start-1" />
          <CategoryTile category={walking} className="sm:col-start-2 sm:row-start-2" />
          <CategoryTile category={cat} className="sm:col-start-3 sm:row-start-1 sm:row-span-2" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CategoryTile category={pawCare} className="sm:h-48" />
          <CategoryTile category={dogEssentials} className="sm:h-48" />
          <div
            className="hidden rounded-[var(--radius-card)] bg-deep-brown sm:block sm:h-48"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
