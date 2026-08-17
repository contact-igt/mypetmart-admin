import type { PlaceholderTone } from "@/components/image-placeholder";

/**
 * Single typed product catalog shared by the Home ("Loved by pet parents")
 * and Shop pages — temporary fixture data pending the real Product API (M3).
 * Ratings/review counts and "LOW STOCK" labels from the locked reference are
 * intentionally omitted: both are unconfirmed public claims per CLAUDE.md.
 */
export type ProductCategory =
  | "Grooming"
  | "Walking Essentials"
  | "Paw Care"
  | "Dog Essentials"
  | "Cat Essentials";

export type Product = {
  slug: string;
  name: string;
  imageLabel: string;
  tone: PlaceholderTone;
  price: number;
  originalPrice: number;
  discountPercent: number;
  category: ProductCategory;
  pet: "dog" | "cat";
  isNew?: boolean;
  featured?: boolean;
};

export const PRODUCTS: Product[] = [
  {
    slug: "mist-powered-pet-grooming-brush",
    name: "Mist-Powered Pet Grooming Brush",
    imageLabel: "Small dog being groomed with a mist brush",
    tone: "terracotta",
    price: 899,
    originalPrice: 1499,
    discountPercent: 40,
    category: "Grooming",
    pet: "dog",
    isNew: true,
    featured: true,
  },
  {
    slug: "dog-anti-slip-paw-pads",
    name: "Dog Anti-Slip Paw Pads",
    imageLabel: "Two small dogs wearing paw pads",
    tone: "cream",
    price: 549,
    originalPrice: 799,
    discountPercent: 31,
    category: "Paw Care",
    pet: "dog",
    featured: true,
  },
  {
    slug: "ultimate-dual-dog-leash",
    name: "Ultimate Dual Dog Leash",
    imageLabel: "Red dual dog leash coiled on a wooden surface",
    tone: "brown",
    price: 1299,
    originalPrice: 1899,
    discountPercent: 32,
    category: "Walking Essentials",
    pet: "dog",
    featured: true,
  },
  {
    slug: "warm-clay-slow-feed-bowl",
    name: "Warm Clay Slow-Feed Bowl",
    imageLabel: "Small dog eating from a slow-feed bowl outdoors",
    tone: "mint",
    price: 649,
    originalPrice: 899,
    discountPercent: 28,
    category: "Dog Essentials",
    pet: "dog",
    isNew: true,
  },
  {
    slug: "arch-cave-cat-bed",
    name: "Arch Cave Cat Bed",
    imageLabel: "Ginger and white cat sitting on a pathway",
    tone: "peach",
    price: 1799,
    originalPrice: 2499,
    discountPercent: 28,
    category: "Cat Essentials",
    pet: "cat",
    isNew: true,
  },
  {
    slug: "everyday-walking-harness",
    name: "Everyday Walking Harness",
    imageLabel: "Puppy running on grass at golden hour",
    tone: "orange",
    price: 1099,
    originalPrice: 1499,
    discountPercent: 27,
    category: "Walking Essentials",
    pet: "dog",
  },
  {
    slug: "hydrating-paw-balm",
    name: "Hydrating Paw Balm",
    imageLabel: "French bulldog wearing a yellow hoodie against a blue background",
    tone: "peach",
    price: 349,
    originalPrice: 499,
    discountPercent: 30,
    category: "Paw Care",
    pet: "dog",
  },
  {
    slug: "rubber-bone-chew-toy",
    name: "Rubber Bone Chew Toy",
    imageLabel: "Golden retriever standing outdoors on a dirt path",
    tone: "cream",
    price: 449,
    originalPrice: 649,
    discountPercent: 31,
    category: "Dog Essentials",
    pet: "dog",
  },
];

export const FEATURED_PRODUCTS: Product[] = PRODUCTS.filter((product) => product.featured);
