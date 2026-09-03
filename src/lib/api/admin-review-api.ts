import { adminApiRequest } from "@/lib/api/admin-api-client";

// Mirrors backend/src/models/ReviewModels/review.types.ts field-for-field.

export type ReviewStatus = "pending" | "approved" | "rejected";
export type ReviewSource = "customer" | "admin";

export type AdminReviewListItem = {
  id: number;
  productId: number;
  productName: string;
  userId: number | null;
  customerName: string;
  rating: number;
  title: string | null;
  review: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  reviewSource: ReviewSource;
  // Admin-set customer-facing review date ("YYYY-MM-DD") or null. createdAt /
  // updatedAt below stay the real system audit timestamps — never conflate them.
  reviewDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminReviewDetail = AdminReviewListItem & {
  orderItemId: number | null;
  customerEmail: string | null;
};

export type CreateAdminReviewInput = {
  productId: number;
  customerName?: string | null;
  rating: number;
  title?: string | null;
  review: string;
  status?: ReviewStatus;
  // Optional "YYYY-MM-DD". Omit to store NULL — never send today automatically.
  reviewDate?: string | null;
};

export type UpdateAdminReviewInput = {
  rating?: number;
  title?: string | null;
  review?: string;
  status?: ReviewStatus;
  // Omit to keep the stored review date; null clears it; "YYYY-MM-DD" sets it.
  reviewDate?: string | null;
};

export type ListAdminReviewsParams = {
  status?: ReviewStatus;
  rating?: number;
  productId?: number;
  source?: ReviewSource;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ListAdminReviewsResult = {
  items: AdminReviewListItem[];
  page: number;
  pageSize: number;
  total: number;
};

function reviewPath(reviewId: number | string): string {
  return `/admin/product-reviews/${encodeURIComponent(String(reviewId))}`;
}

export function listAdminReviews(params: ListAdminReviewsParams): Promise<ListAdminReviewsResult> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.rating) query.set("rating", String(params.rating));
  if (params.productId) query.set("productId", String(params.productId));
  if (params.source) query.set("source", params.source);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();
  return adminApiRequest<ListAdminReviewsResult>(`/admin/product-reviews${qs ? `?${qs}` : ""}`);
}

export function getAdminReview(reviewId: number | string): Promise<AdminReviewDetail> {
  return adminApiRequest<AdminReviewDetail>(reviewPath(reviewId));
}

export function updateAdminReviewStatus(reviewId: number | string, status: ReviewStatus): Promise<AdminReviewDetail> {
  return adminApiRequest<AdminReviewDetail>(reviewPath(reviewId), {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function updateAdminReview(reviewId: number | string, input: UpdateAdminReviewInput): Promise<AdminReviewDetail> {
  return adminApiRequest<AdminReviewDetail>(reviewPath(reviewId), {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function createAdminReview(input: CreateAdminReviewInput): Promise<AdminReviewDetail> {
  return adminApiRequest<AdminReviewDetail>("/admin/product-reviews", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function deleteAdminReview(reviewId: number | string): Promise<{ message: string }> {
  return adminApiRequest<{ message: string }>(reviewPath(reviewId), { method: "DELETE" });
}
