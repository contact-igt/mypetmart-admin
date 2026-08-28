"use client";

import { ReviewForm } from "@/components/admin/product-reviews/review-form";

export default function NewReviewPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Add review</h1>
        <p className="mt-1 text-sm text-text-primary/60">Manually add a Review for a Product. Never shows as a Verified Purchase.</p>
      </div>
      <ReviewForm />
    </div>
  );
}
