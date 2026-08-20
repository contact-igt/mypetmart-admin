import { adminApiRequest } from "@/lib/api/admin-api-client";
import type { DashboardAnalyticsResult, DashboardFilter, DashboardFilterOptions } from "@/data/admin/types";

export function getDashboardFilterOptions(): Promise<DashboardFilterOptions> {
  return adminApiRequest<DashboardFilterOptions>("/admin/dashboard/filter-options");
}

export function getDashboardAnalytics(filter: DashboardFilter): Promise<DashboardAnalyticsResult> {
  const params = new URLSearchParams();
  params.set("from", filter.from);
  params.set("to", filter.to);
  if (filter.compare) params.set("compare", "true");
  if (filter.productId) params.set("productId", String(filter.productId));
  if (filter.orderStatus) params.set("orderStatus", filter.orderStatus);
  if (filter.state) params.set("state", filter.state);
  return adminApiRequest<DashboardAnalyticsResult>(`/admin/dashboard/summary?${params.toString()}`);
}
