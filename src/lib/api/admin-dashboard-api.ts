import { adminApiRequest } from "@/lib/api/admin-api-client";
import type { DashboardAnalyticsResult, DashboardFilter, DashboardFilterOptions } from "@/data/admin/types";
import { buildDashboardQuery } from "./admin-dashboard-contract";

export function getDashboardFilterOptions(): Promise<DashboardFilterOptions> {
  return adminApiRequest<DashboardFilterOptions>("/admin/dashboard/filter-options");
}

export function getDashboardAnalytics(filter: DashboardFilter): Promise<DashboardAnalyticsResult> {
  return adminApiRequest<DashboardAnalyticsResult>(`/admin/dashboard/summary?${buildDashboardQuery(filter)}`);
}
