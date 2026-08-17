import { HeroSection } from "@/components/home/hero-section";
import { CategoryGrid } from "@/components/home/category-grid";
import { GroomingFeatureStory } from "@/components/home/grooming-feature-story";
import { FeaturedProducts } from "@/components/home/featured-products";
import { GroomingStepsSection } from "@/components/home/grooming-steps-section";
import { WalkingEssentials } from "@/components/home/walking-essentials";
import { WhyMyPetMart } from "@/components/home/why-mypetmart";
import { CustomerFeedback } from "@/components/home/customer-feedback";

export default function Home() {
  return (
    <main className="flex-1">
      <HeroSection />
      <CategoryGrid />
      <GroomingFeatureStory />
      <FeaturedProducts />
      <GroomingStepsSection />
      <WalkingEssentials />
      <WhyMyPetMart />
      <CustomerFeedback />
    </main>
  );
}
