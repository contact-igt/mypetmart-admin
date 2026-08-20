/** @typedef {import("../data/admin/types").DashboardAnalyticsResult} DashboardAnalyticsResult */

function csvCell(value) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

/**
 * @param {DashboardAnalyticsResult} data
 * @param {{ from: string; to: string }} range
 */
export function buildReportsCsv(data, range) {
  const rows = [
    ["Section", "Date", "Product ID", "Product", "Status", "Orders / Count", "Units sold", "Revenue (INR)", "Percentage"],
    ["Summary", `${range.from} to ${range.to}`, "", "", "", data.summary.orders.value, "", data.summary.grossSales.value, ""],
    ...data.timeSeries.current.map((point) => ["Orders over time", point.date, "", "", "", point.orders, point.units, point.sales, ""]),
    ...data.orderStatus.map((item) => ["Order status", "", "", "", item.status, item.count, "", "", item.percentage]),
    ...data.productPerformance.map((product) => ["Product performance", "", product.productId, product.name, "", "", product.unitsSold, product.revenue, ""]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
