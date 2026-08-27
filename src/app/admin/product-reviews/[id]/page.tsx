"use client";

import { useParams } from "next/navigation";
import { ReviewDetailView } from "@/components/admin/product-reviews/review-detail-view";

export default function AdminProductReviewDetailPage() {
  const params = useParams<{ id: string }>();
  return <ReviewDetailView reviewId={params.id} />;
}
