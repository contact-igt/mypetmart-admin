"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { SearchIcon } from "@/components/icons";
import { CATEGORIES } from "@/data/categories";
import { PRODUCTS, type ProductCategory } from "@/data/products";

type CategoryFilter = "all" | ProductCategory | "new-arrivals";
type PetFilter = "all" | "dog" | "cat";
type SortOrder = "featured" | "price-asc" | "price-desc";

const SORT_LABELS: Record<SortOrder, string> = {
  featured: "Sort · Featured",
  "price-asc": "Sort · Price: Low to High",
  "price-desc": "Sort · Price: High to Low",
};

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pill-label border transition-colors duration-150 ease-out ${
        active
          ? "border-deep-brown bg-deep-brown text-white"
          : "border-border-subtle bg-white text-text-primary hover:border-deep-brown"
      }`}
    >
      {children}
    </button>
  );
}

function AllPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`All ${label}`}
      title={`All ${label}`}
      className={`h-8 w-8 shrink-0 rounded-full border transition-colors duration-150 ease-out ${
        active ? "border-deep-brown bg-deep-brown" : "border-border-subtle bg-white"
      }`}
    />
  );
}

/**
 * "Basic" filters (search, pet, category) are functional per
 * docs/DESIGN_SYSTEM.md §18 — advanced facets (rating, price range, on-sale/
 * in-stock toggles) render for visual composition only and stay inert,
 * since "Advanced filters" is a CLAUDE.md scope exclusion and star ratings
 * are an unconfirmed public claim.
 */
export function ShopExplorer() {
  const [search, setSearch] = useState("");
  const [pet, setPet] = useState<PetFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortOrder>("featured");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let results = PRODUCTS.filter((product) => {
      if (query && !product.name.toLowerCase().includes(query)) return false;
      if (pet !== "all" && product.pet !== pet) return false;
      if (category === "new-arrivals" && !product.isNew) return false;
      if (category !== "all" && category !== "new-arrivals" && product.category !== category)
        return false;
      return true;
    });
    if (sort === "price-asc") results = [...results].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") results = [...results].sort((a, b) => b.price - a.price);
    return results;
  }, [search, pet, category, sort]);

  const clearFilters = () => {
    setSearch("");
    setPet("all");
    setCategory("all");
    setSort("featured");
  };

  return (
    <section className="section-block !pt-0 bg-cream-bg">
      <div className="site-container grid gap-10 lg:grid-cols-[280px_1fr]">
        <aside className="warm-card h-fit">
          <div>
            <span className="eyebrow text-text-primary/60">Search</span>
            <div className="relative mt-2">
              <SearchIcon
                width={16}
                height={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-primary/50"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products…"
                aria-label="Search products"
                className="field-control pl-10 text-sm"
              />
            </div>
          </div>

          <div className="mt-6">
            <span className="eyebrow text-text-primary/60">Pet</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AllPill active={pet === "all"} onClick={() => setPet("all")} label="pets" />
              <FilterPill active={pet === "dog"} onClick={() => setPet(pet === "dog" ? "all" : "dog")}>
                Dogs
              </FilterPill>
              <FilterPill active={pet === "cat"} onClick={() => setPet(pet === "cat" ? "all" : "cat")}>
                Cats
              </FilterPill>
            </div>
          </div>

          <div className="mt-6">
            <span className="eyebrow text-text-primary/60">Category</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AllPill
                active={category === "all"}
                onClick={() => setCategory("all")}
                label="categories"
              />
              {CATEGORIES.map((item) => (
                <FilterPill
                  key={item.label}
                  active={category === item.label}
                  onClick={() =>
                    setCategory(category === item.label ? "all" : (item.label as ProductCategory))
                  }
                >
                  {item.label}
                </FilterPill>
              ))}
              <FilterPill
                active={category === "new-arrivals"}
                onClick={() => setCategory(category === "new-arrivals" ? "all" : "new-arrivals")}
              >
                New Arrivals
              </FilterPill>
            </div>
          </div>

          <div className="mt-6">
            <span className="eyebrow text-text-primary/60">Max price: ₹2,500</span>
            <input
              type="range"
              min={0}
              max={2500}
              defaultValue={2500}
              disabled
              aria-label="Maximum price (coming soon)"
              className="mt-3 w-full accent-deep-brown opacity-50"
            />
          </div>

          <div className="mt-6">
            <span className="eyebrow text-text-primary/60">Minimum rating</span>
            <div className="mt-2 flex flex-wrap items-center gap-2 opacity-50">
              <span
                aria-hidden="true"
                className="h-8 w-8 shrink-0 rounded-full border border-border-subtle bg-deep-brown"
              />
              {["3+★", "4+★", "4.5+★"].map((label) => (
                <span key={label} className="pill-label border border-border-subtle bg-white text-text-primary">
                  {label}
                </span>
              ))}
            </div>
            <p className="body-copy mt-1.5 text-xs text-text-primary/50">
              Coming soon — no rating data yet.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2 opacity-50">
            {["New arrivals only", "On sale", "In stock"].map((label) => (
              <label key={label} className="body-copy flex items-center gap-2 text-sm">
                <input type="checkbox" disabled className="h-4 w-4" />
                {label}
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="body-copy mt-6 text-sm font-semibold underline underline-offset-4"
          >
            Clear filters
          </button>
        </aside>

        <div>
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="body-copy text-sm text-text-primary/70">
              {filtered.length} product{filtered.length === 1 ? "" : "s"}
            </p>
            <label className="relative">
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOrder)}
                className="field-control h-11 w-auto cursor-pointer pr-8 text-sm font-semibold"
              >
                {(Object.keys(SORT_LABELS) as SortOrder[]).map((value) => (
                  <option key={value} value={value}>
                    {SORT_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          ) : (
            <div className="warm-card text-center">
              <p className="body-copy font-semibold text-text-primary">
                No products match your filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="button-secondary mt-4 inline-flex"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
