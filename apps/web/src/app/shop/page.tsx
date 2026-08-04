import type { Metadata } from "next";
import { ShopHero } from "@/components/shop/shop-hero";
import { ShopExplorer } from "@/components/shop/shop-explorer";

export const metadata: Metadata = {
  title: "Shop | MyPetMart",
  description: "Everything they need to wag, purr and play.",
};

export default function ShopPage() {
  return (
    <main className="flex-1">
      <ShopHero />
      <ShopExplorer />
    </main>
  );
}
