import { ImagePlaceholder } from "@/components/image-placeholder";
import type { Product } from "@/data/products";
import { HeartIcon, StarIcon } from "@/components/icons";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="warm-card overflow-hidden p-0">
      <div className="relative">
        <ImagePlaceholder
          label={product.imageLabel}
          tone={product.tone}
          className="aspect-[4/5] w-full rounded-none"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isNew && (
            <span className="pill-label bg-teal-mint-accent text-text-primary">New</span>
          )}
          <span className="pill-label bg-terracotta text-white">-{product.discountPercent}%</span>
        </div>
        <button
          type="button"
          aria-label="Add to wishlist"
          title="Add to wishlist"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-text-primary transition-colors duration-150 ease-out hover:bg-white"
        >
          <HeartIcon width={16} height={16} />
        </button>
      </div>
      <div className="bg-peach-hero p-5">
        <div className="mb-2 flex items-center gap-1.5 text-text-primary/35">
          <StarIcon width={14} height={14} />
          <span className="text-xs">Rating coming soon</span>
        </div>
        <p className="body-copy font-semibold text-text-primary">{product.name}</p>
        <p className="body-copy mt-1 flex items-baseline gap-2">
          <span className="text-lg font-bold text-text-primary">
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          <span className="text-sm text-text-primary/50 line-through">
            ₹{product.originalPrice.toLocaleString("en-IN")}
          </span>
        </p>
      </div>
    </div>
  );
}
