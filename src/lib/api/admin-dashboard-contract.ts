export type DashboardRequestFilter = {
  from: string;
  to: string;
  compare?: boolean;
  productId?: number;
  orderStatus?: string;
  state?: string;
};

export function buildDashboardQuery(filter: DashboardRequestFilter): string {
  const params = new URLSearchParams({ from: filter.from, to: filter.to });
  if (filter.compare) params.set("compare", "true");
  if (filter.productId) params.set("productId", String(filter.productId));
  if (filter.orderStatus) params.set("orderStatus", filter.orderStatus);
  if (filter.state) params.set("state", filter.state);
  return params.toString();
}

export function buildRecentOrdersQuery(filter: DashboardRequestFilter): Record<string, unknown> {
  return {
    page: 1,
    pageSize: 8,
    from: `${filter.from}T00:00:00.000Z`,
    to: `${filter.to}T23:59:59.999Z`,
    productId: filter.productId,
    status: filter.orderStatus,
    state: filter.state,
    sortBy: "placedAt",
    sortDir: "DESC",
  };
}
