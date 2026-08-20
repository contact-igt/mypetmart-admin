import type { NewsletterSubscriber, NewsletterSubscriberStatus } from "@/data/admin/types";
import { adminApiRequest } from "@/lib/api/admin-api-client";

export type ListNewsletterSubscribersParams = {
  search?: string;
  status?: NewsletterSubscriberStatus;
  page?: number;
  pageSize?: number;
};

export type ListNewsletterSubscribersResult = {
  items: NewsletterSubscriber[];
  total: number;
  page: number;
  pageSize: number;
};

type BackendNewsletterSubscriberJSON = {
  id: number;
  email: string;
  status: NewsletterSubscriberStatus;
  source: string | null;
  verifiedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

export async function fetchAdminNewsletterSubscribers(
  params?: ListNewsletterSubscribersParams,
): Promise<ListNewsletterSubscribersResult> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.pageSize) queryParams.set("limit", String(params.pageSize));
  if (params?.status) queryParams.set("status", params.status);
  if (params?.search?.trim()) queryParams.set("search", params.search.trim());

  const data = await adminApiRequest<{
    items: BackendNewsletterSubscriberJSON[];
    pagination: { totalItems: number; page: number; limit: number };
  }>(`/admin/newsletter/subscribers?${queryParams.toString()}`);

  return {
    items: data.items.map((item) => ({
      id: String(item.id),
      email: item.email,
      status: item.status,
      source: item.source,
      verifiedAt: item.verifiedAt,
      unsubscribedAt: item.unsubscribedAt,
      createdAt: item.createdAt,
    })),
    total: data.pagination.totalItems,
    page: data.pagination.page,
    pageSize: data.pagination.limit,
  };
}
