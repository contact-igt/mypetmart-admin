"use client";

import { ImagePlaceholder } from "@/components/image-placeholder";
import { SearchIcon, ArrowRightIcon } from "@/components/icons";

export function HeroSection() {
  return (
    <section className="section-block bg-orange-hero">
      <div className="site-container flex flex-col gap-10">
        <form onSubmit={(event) => event.preventDefault()} className="mx-auto w-full max-w-xl">
          <label htmlFor="hero-search" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <SearchIcon
              width={18}
              height={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-primary/60"
            />
            <input
              id="hero-search"
              name="q"
              type="search"
              placeholder="Search for grooming, leashes, paw care…"
              className="field-control pl-11"
            />
          </div>
        </form>

        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="flex flex-col items-start gap-6">
            <span className="pill-label bg-white/70 text-text-primary">Welcome to My Pet Mart</span>
            <h1 className="display-heading text-4xl text-text-primary sm:text-5xl lg:text-6xl">
              Better little things for happier pets.
            </h1>
            <p className="body-copy max-w-lg text-text-primary/90">
              Discover practical grooming, walking and everyday pet-care essentials made to
              bring more comfort, confidence and joy to life with your pet.
            </p>
            <div className="flex flex-wrap gap-4">
              <button type="button" className="button-primary">
                Shop Bestsellers <ArrowRightIcon width={16} height={16} />
              </button>
              <button type="button" className="button-secondary">
                Explore All Products
              </button>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-md grid-cols-2 grid-rows-2 gap-4 sm:h-[26rem] sm:max-w-none">
            <ImagePlaceholder
              label="Golden retriever standing outdoors"
              tone="terracotta"
              className="col-span-2 aspect-[5/4] sm:col-span-1 sm:row-span-2 sm:aspect-auto sm:h-full"
            />
            <ImagePlaceholder
              label="Kitten standing upright against a teal background"
              tone="mint"
              className="aspect-square sm:aspect-auto sm:h-full"
            />
            <ImagePlaceholder
              label="Puppy running on grass"
              tone="cream"
              className="aspect-square sm:aspect-auto sm:h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
