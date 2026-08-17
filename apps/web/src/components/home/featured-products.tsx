import { FEATURED_PRODUCTS } from "./home-data";
import { ProductCard } from "@/components/product-card";
import { ArrowRightIcon } from "@/components/icons";

export function FeaturedProducts() {
  return (
    <section className="section-block bg-cream-bg">
      <div className="site-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="pill-label bg-mint-sage text-text-primary">Tail-wagging favourites</span>
            <h2 className="display-heading mt-4 text-3xl text-text-primary sm:text-4xl">
              Loved by
              <span className="accent">pet parents.</span>
            </h2>
          </div>
          <button type="button" className="button-secondary">
            See all products <ArrowRightIcon width={16} height={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_PRODUCTS.map((product) => (
            <ProductCard key={product.name} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
