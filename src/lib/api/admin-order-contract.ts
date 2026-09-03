/** Pure request-shape helpers for the Admin Order API. */
export function buildAdminOrderPath(orderId: number | string): string {
  return `/admin/orders/${encodeURIComponent(String(orderId))}`;
}

export function buildAdminOrderActionPath(
  orderId: number | string,
  action: "status" | "shipping-address" | "notes",
): string {
  return `${buildAdminOrderPath(orderId)}/${action}`;
}

export function serializeAdminOrderBody(body: object): string {
  return JSON.stringify(body);
}

export function buildAdminOrderQuery(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
}
