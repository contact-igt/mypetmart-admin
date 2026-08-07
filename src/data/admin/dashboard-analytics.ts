import { COMMERCE_EVENTS, RETURN_WINDOW_DAYS, TRANSIT_DAYS } from "./dashboard-fixtures";
import { CUSTOMERS, PRODUCTS } from "./fixtures";
import type {
  CommerceEvent,
  CommerceEventType,
  DashboardAnalyticsResult,
  DashboardFilter,
  DashboardFilterOptions,
  DashboardOrderRow,
  DashboardOrderStatus,
  FunnelStage,
  MetricComparison,
  ShippingMode,
  TrafficSource,
} from "./types";

/**
 * Pure computation layer over the deterministic COMMERCE_EVENTS dataset.
 * Kept separate from mock-repository.ts so the (large) aggregation logic
 * doesn't crowd the CRUD methods there — mock-repository.ts just wraps
 * these calls in the repository's standard artificial delay().
 */

const NOW = new Date("2026-08-04T09:00:00Z");
const DATASET_START = (() => {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - 89);
  d.setUTCHours(0, 0, 0, 0);
  return d;
})();

const SOURCE_LABELS: Record<TrafficSource, string> = {
  direct: "Direct",
  instagram: "Instagram",
  facebook: "Facebook",
  google_organic: "Google / Organic",
  meta_ads: "Meta Ads",
  youtube: "YouTube",
  other: "Other",
};

const ORDER_STATUSES: DashboardOrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "return_requested",
];

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function startOfDayUTC(d: Date): Date {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

function endOfDayUTC(d: Date): Date {
  const c = new Date(d);
  c.setUTCHours(23, 59, 59, 999);
  return c;
}

function sumBy<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((sum, item) => sum + fn(item), 0);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

const ALL_STATES = [...new Set(COMMERCE_EVENTS.map((e) => e.state))].sort();

/** Earliest order_completed timestamp per customer across the FULL dataset (not filter-scoped) — this is what decides new vs. returning within any given window. */
const FIRST_ORDER_AT = (() => {
  const map = new Map<string, string>();
  for (const e of COMMERCE_EVENTS) {
    if (e.type !== "order_completed" || !e.customerId || e.orderStatus === "cancelled") continue;
    const existing = map.get(e.customerId);
    if (!existing || e.at < existing) map.set(e.customerId, e.at);
  }
  return map;
})();

export function getDashboardFilterOptions(): DashboardFilterOptions {
  return {
    products: PRODUCTS.map((p) => ({ id: p.id, name: p.name })),
    states: ALL_STATES,
    orderStatuses: ORDER_STATUSES,
    sources: (Object.keys(SOURCE_LABELS) as TrafficSource[]),
  };
}

function resolveRange(filter: DashboardFilter): { from: Date; to: Date } {
  if (filter.preset === "custom" && filter.from && filter.to) {
    const from = new Date(filter.from);
    const to = new Date(filter.to);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      return { from: startOfDayUTC(from), to: endOfDayUTC(to) };
    }
  }
  const to = endOfDayUTC(NOW);
  const spanDays = filter.preset === "today" ? 0 : filter.preset === "7d" ? 6 : filter.preset === "30d" ? 29 : 89;
  const from = new Date(NOW);
  from.setUTCDate(from.getUTCDate() - spanDays);
  return { from: startOfDayUTC(from), to };
}

function resolvePreviousRange(from: Date, to: Date): { from: Date; to: Date } {
  const spanMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - spanMs);
  return { from: startOfDayUTC(prevFrom), to: endOfDayUTC(prevTo) };
}

function inRange(iso: string, from: Date, to: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

/** State/source/date always narrow the whole session. A product filter narrows to sessions that touched that product at any funnel stage — this keeps every stage (including "sessions") describing "sessions relevant to product X" so the funnel still reads top-to-bottom decreasing. */
function scopeEvents(events: CommerceEvent[], from: Date, to: Date, filter: DashboardFilter): CommerceEvent[] {
  let scoped = events.filter((e) => inRange(e.at, from, to));
  if (filter.state) scoped = scoped.filter((e) => e.state === filter.state);
  if (filter.source) scoped = scoped.filter((e) => e.source === filter.source);
  if (filter.productId) {
    const relevantSessions = new Set(
      scoped.filter((e) => e.productId === filter.productId).map((e) => e.sessionId),
    );
    scoped = scoped.filter((e) => relevantSessions.has(e.sessionId));
  }
  return scoped;
}

/** Order-status filter, applied only to order-linked event types. Non-order events (sessions/views/cart/checkout) pass through untouched so top-of-funnel figures stay accurate. With no explicit status chosen, cancelled orders are excluded from revenue/order aggregates by default (they carry no realized revenue); choosing "Cancelled" explicitly still works, showing cancelled-order figures for inspection. */
function selectOrderEvents(scoped: CommerceEvent[], filter: DashboardFilter, type: CommerceEventType): CommerceEvent[] {
  const base = scoped.filter((e) => e.type === type);
  if (filter.orderStatus) return base.filter((e) => e.orderStatus === filter.orderStatus);
  return base.filter((e) => e.orderStatus !== "cancelled");
}

function comparison(value: number, previousValue: number, compare: boolean): MetricComparison {
  if (!compare) return { value, previousValue: 0, changePct: null };
  if (previousValue === 0) return { value, previousValue, changePct: value === 0 ? 0 : null };
  return { value, previousValue, changePct: round1(((value - previousValue) / previousValue) * 100) };
}

function computeFunnel(scoped: CommerceEvent[]): FunnelStage[] {
  const sessionsOf = (type: CommerceEventType) =>
    new Set(scoped.filter((e) => e.type === type).map((e) => e.sessionId)).size;

  const stageDefs: { key: FunnelStage["key"]; label: string; count: number }[] = [
    { key: "sessions", label: "Sessions", count: sessionsOf("session_started") },
    { key: "product_views", label: "Product views", count: sessionsOf("product_viewed") },
    { key: "added_to_cart", label: "Added to cart", count: sessionsOf("added_to_cart") },
    { key: "checkout_started", label: "Checkout started", count: sessionsOf("checkout_started") },
    {
      key: "purchase_completed",
      label: "Purchase completed",
      count: new Set(scoped.filter((e) => e.type === "order_completed").map((e) => e.orderId)).size,
    },
  ];

  return stageDefs.map((stage, i) => {
    if (i === 0) return { ...stage, conversionFromPrevious: null, dropOffFromPrevious: null };
    const prevCount = stageDefs[i - 1].count;
    const conversion = prevCount > 0 ? round1((stage.count / prevCount) * 100) : 0;
    return { ...stage, conversionFromPrevious: conversion, dropOffFromPrevious: round1(100 - conversion) };
  });
}

type Bucket = { key: string; label: string; start: Date; end: Date };

function buildBuckets(from: Date, to: Date, groupBy: "day" | "week"): Bucket[] {
  const buckets: Bucket[] = [];
  if (groupBy === "day") {
    const cursor = new Date(from);
    while (cursor <= to) {
      const start = startOfDayUTC(cursor);
      const end = endOfDayUTC(cursor);
      buckets.push({ key: start.toISOString().slice(0, 10), label: `${start.getUTCDate()}/${start.getUTCMonth() + 1}`, start, end });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    let start = startOfDayUTC(from);
    while (start <= to) {
      const rawEnd = new Date(start.getTime() + 6 * 86_400_000);
      const end = endOfDayUTC(rawEnd) < to ? endOfDayUTC(rawEnd) : to;
      buckets.push({ key: start.toISOString().slice(0, 10), label: `Wk ${start.getUTCDate()}/${start.getUTCMonth() + 1}`, start, end });
      start = new Date(start.getTime() + 7 * 86_400_000);
    }
  }
  return buckets;
}

function fillSeries(buckets: Bucket[], orderEvents: CommerceEvent[]) {
  return buckets.map((b) => {
    const inBucket = orderEvents.filter((e) => {
      const t = new Date(e.at).getTime();
      return t >= b.start.getTime() && t <= b.end.getTime();
    });
    return {
      date: b.key,
      label: b.label,
      sales: sumBy(inBucket, (e) => e.orderValue ?? 0),
      orders: new Set(inBucket.map((e) => e.orderId)).size,
      units: sumBy(inBucket, (e) => e.quantity ?? 0),
    };
  });
}

function computeProductRows(scoped: CommerceEvent[], orderEvents: CommerceEvent[], returnEvents: CommerceEvent[]) {
  const ids = new Set<string>();
  scoped.forEach((e) => {
    if (e.productId) ids.add(e.productId);
  });

  const performance: DashboardAnalyticsResult["productPerformance"] = [];
  const interest: DashboardAnalyticsResult["productInterest"] = [];
  let mostViewed: { name: string; views: number } | null = null;

  for (const productId of ids) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) continue;

    const viewEvents = scoped.filter((e) => e.type === "product_viewed" && e.productId === productId);
    const views = viewEvents.length;
    const uniqueVisitors = new Set(viewEvents.map((e) => e.sessionId)).size;
    const cartAdds = scoped.filter((e) => e.type === "added_to_cart" && e.productId === productId).length;
    const checkouts = scoped.filter((e) => e.type === "checkout_started" && e.productId === productId).length;
    const productOrderEvents = orderEvents.filter((e) => e.productId === productId);
    const unitsSold = sumBy(productOrderEvents, (e) => e.quantity ?? 0);
    const revenue = sumBy(productOrderEvents, (e) => e.orderValue ?? 0);
    const returnRequests = returnEvents.filter((e) => e.productId === productId).length;

    performance.push({
      productId,
      name: product.name,
      views,
      cartAdds,
      checkouts,
      unitsSold,
      conversionRate: views > 0 ? round1((unitsSold / views) * 100) : 0,
      revenue,
      returnRequests,
    });
    interest.push({
      productId,
      name: product.name,
      views,
      uniqueVisitors,
      cartAdds,
      viewToCartRate: views > 0 ? round1((cartAdds / views) * 100) : 0,
      cartToPurchaseRate: cartAdds > 0 ? round1((unitsSold / cartAdds) * 100) : 0,
    });

    if (!mostViewed || views > mostViewed.views) mostViewed = { name: product.name, views };
  }

  performance.sort((a, b) => b.revenue - a.revenue);
  interest.sort((a, b) => b.views - a.views);
  return { performance, interest, mostViewedProductName: mostViewed && mostViewed.views > 0 ? mostViewed.name : null };
}

function computeOrderStatusSlices(scoped: CommerceEvent[]) {
  const byOrder = new Map<string, DashboardOrderStatus>();
  scoped
    .filter((e) => e.type === "order_completed")
    .forEach((e) => {
      if (e.orderId && e.orderStatus) byOrder.set(e.orderId, e.orderStatus);
    });

  const counts = new Map<DashboardOrderStatus, number>(ORDER_STATUSES.map((s) => [s, 0]));
  byOrder.forEach((status) => counts.set(status, (counts.get(status) ?? 0) + 1));
  const total = Math.max(1, byOrder.size);
  return ORDER_STATUSES.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
    percentage: round1(((counts.get(status) ?? 0) / total) * 100),
  }));
}

function computeRecentOrders(orderEvents: CommerceEvent[]): DashboardOrderRow[] {
  const byOrder = new Map<string, CommerceEvent[]>();
  orderEvents.forEach((e) => {
    if (!e.orderId) return;
    const arr = byOrder.get(e.orderId) ?? [];
    arr.push(e);
    byOrder.set(e.orderId, arr);
  });

  const rows: DashboardOrderRow[] = [];
  for (const [orderId, events] of byOrder) {
    const first = events[0];
    const customer = first.customerId ? CUSTOMERS.find((c) => c.id === first.customerId) : undefined;
    rows.push({
      orderId,
      orderNumber: orderId.replace("evt-order-", "EVT-"),
      customerLabel: customer ? customer.name : first.customerId ? `Guest checkout (${first.customerId})` : "Guest checkout",
      total: sumBy(events, (e) => e.orderValue ?? 0),
      status: first.orderStatus ?? "pending",
      placedAt: first.at,
      itemCount: sumBy(events, (e) => e.quantity ?? 0),
    });
  }
  rows.sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  return rows.slice(0, 8);
}

function computeFulfilment(scoped: CommerceEvent[], orderEvents: CommerceEvent[]) {
  const statusByOrder = new Map<string, DashboardOrderStatus>();
  const shippingByOrder = new Map<string, ShippingMode>();
  const atByOrder = new Map<string, string>();
  orderEvents.forEach((e) => {
    if (!e.orderId) return;
    if (e.orderStatus) statusByOrder.set(e.orderId, e.orderStatus);
    if (e.shippingMode) shippingByOrder.set(e.orderId, e.shippingMode);
    if (!atByOrder.has(e.orderId)) atByOrder.set(e.orderId, e.at);
  });

  let awaitingFulfilment = 0;
  let packed = 0;
  let shipped = 0;
  let delivered = 0;
  let delayed = 0;
  let standardOrders = 0;
  let expressOrders = 0;

  for (const [orderId, status] of statusByOrder) {
    if (status === "pending" || status === "confirmed") awaitingFulfilment += 1;
    else if (status === "processing") packed += 1;
    else if (status === "shipped") shipped += 1;
    else if (status === "delivered" || status === "return_requested") delivered += 1;

    if (status === "processing" || status === "shipped") {
      const at = atByOrder.get(orderId);
      const mode = shippingByOrder.get(orderId) ?? "standard";
      if (at) {
        const ageDays = (NOW.getTime() - new Date(at).getTime()) / 86_400_000;
        if (ageDays > TRANSIT_DAYS[mode] + 2) delayed += 1;
      }
    }
  }
  for (const mode of shippingByOrder.values()) {
    if (mode === "standard") standardOrders += 1;
    else expressOrders += 1;
  }

  const orderIds = new Set(orderEvents.map((e) => e.orderId));
  const processingHours: number[] = [];
  const deliveryDays: number[] = [];
  scoped
    .filter((e) => e.type === "order_fulfilled" && e.orderId && orderIds.has(e.orderId))
    .forEach((fulfilled) => {
      const at = atByOrder.get(fulfilled.orderId!);
      if (!at) return;
      const hours = (new Date(fulfilled.at).getTime() - new Date(at).getTime()) / 3_600_000;
      processingHours.push(hours);
      const mode = shippingByOrder.get(fulfilled.orderId!) ?? "standard";
      deliveryDays.push(hours / 24 + TRANSIT_DAYS[mode]);
    });

  const avg = (arr: number[]) => (arr.length ? round1(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

  return {
    awaitingFulfilment,
    packed,
    shipped,
    delivered,
    delayed,
    avgProcessingHours: avg(processingHours),
    avgDeliveryDays: avg(deliveryDays),
    standardOrders,
    expressOrders,
  };
}

function computeLocations(orderEvents: CommerceEvent[]) {
  const byLoc = new Map<string, { state: string; city: string; orders: Set<string>; customers: Set<string>; revenue: number }>();
  orderEvents.forEach((e) => {
    const key = `${e.state}|${e.city}`;
    const entry = byLoc.get(key) ?? { state: e.state, city: e.city, orders: new Set<string>(), customers: new Set<string>(), revenue: 0 };
    if (e.orderId) entry.orders.add(e.orderId);
    if (e.customerId) entry.customers.add(e.customerId);
    entry.revenue += e.orderValue ?? 0;
    byLoc.set(key, entry);
  });
  return [...byLoc.values()]
    .map((v) => ({
      state: v.state,
      city: v.city,
      orders: v.orders.size,
      customers: v.customers.size,
      revenue: v.revenue,
      averageOrderValue: v.orders.size > 0 ? Math.round(v.revenue / v.orders.size) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function computeCustomerOverview(orderEvents: CommerceEvent[], from: Date) {
  const fromIso = from.toISOString();
  const byCustomer = new Map<string, { orderIds: Set<string>; revenue: number; lastAt: string }>();
  orderEvents.forEach((e) => {
    if (!e.customerId) return;
    const entry = byCustomer.get(e.customerId) ?? { orderIds: new Set<string>(), revenue: 0, lastAt: e.at };
    if (e.orderId) entry.orderIds.add(e.orderId);
    entry.revenue += e.orderValue ?? 0;
    if (e.at > entry.lastAt) entry.lastAt = e.at;
    byCustomer.set(e.customerId, entry);
  });

  let newCustomers = 0;
  let returningCustomers = 0;
  let returningCustomerRevenue = 0;
  const rows: { id: string; lastAt: string; isReturning: boolean }[] = [];

  for (const [customerId, entry] of byCustomer) {
    const firstEverAt = FIRST_ORDER_AT.get(customerId) ?? entry.lastAt;
    const isReturning = firstEverAt < fromIso;
    if (isReturning) {
      returningCustomers += 1;
      returningCustomerRevenue += entry.revenue;
    } else {
      newCustomers += 1;
    }
    rows.push({ id: customerId, lastAt: entry.lastAt, isReturning });
  }

  rows.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  const recentCustomers = rows.slice(0, 5).map((r) => {
    const known = CUSTOMERS.find((c) => c.id === r.id);
    return {
      id: r.id,
      name: known ? known.name : `Guest checkout (${r.id})`,
      joinedAt: known ? known.joinedAt : FIRST_ORDER_AT.get(r.id) ?? r.lastAt,
      isReturning: r.isReturning,
    };
  });

  const total = newCustomers + returningCustomers;
  return {
    newCustomers,
    returningCustomers,
    firstTimeBuyers: newCustomers,
    repeatPurchaseRate: total > 0 ? round1((returningCustomers / total) * 100) : 0,
    returningCustomerRevenue,
    recentCustomers,
  };
}

function computeReturns(scoped: CommerceEvent[], filter: DashboardFilter) {
  const returnEvents =
    filter.orderStatus && filter.orderStatus !== "return_requested"
      ? []
      : scoped.filter((e) => e.type === "return_requested");

  const fulfilledAtByOrder = new Map<string, string>();
  scoped
    .filter((e) => e.type === "order_fulfilled")
    .forEach((e) => {
      if (e.orderId) fulfilledAtByOrder.set(e.orderId, e.at);
    });

  let damaged = 0;
  let wrongItem = 0;
  let other = 0;
  let withinWindow = 0;
  const statusCounts = { requested: 0, approved: 0, rejected: 0, resolved: 0 };

  returnEvents.forEach((e, idx) => {
    if (e.returnReason === "damaged") damaged += 1;
    else if (e.returnReason === "wrong_item") wrongItem += 1;
    else other += 1;

    const fulfilledAt = e.orderId ? fulfilledAtByOrder.get(e.orderId) : undefined;
    if (!fulfilledAt) {
      withinWindow += 1;
    } else {
      const diffDays = (new Date(e.at).getTime() - new Date(fulfilledAt).getTime()) / 86_400_000;
      if (diffDays <= RETURN_WINDOW_DAYS) withinWindow += 1;
    }

    const ageDays = (NOW.getTime() - new Date(e.at).getTime()) / 86_400_000;
    if (ageDays < 3) statusCounts.requested += 1;
    else if (ageDays < 6) statusCounts.approved += 1;
    else if (idx % 6 === 0) statusCounts.rejected += 1;
    else statusCounts.resolved += 1;
  });

  const total = Math.max(1, returnEvents.length);
  return {
    open: returnEvents.length,
    damaged,
    wrongItem,
    other,
    statusBreakdown: (["requested", "approved", "rejected", "resolved"] as const).map((status) => ({
      status,
      count: statusCounts[status],
    })),
    eligibleWithinWindowPct: returnEvents.length > 0 ? round1((withinWindow / total) * 100) : 0,
    returnWindowDays: RETURN_WINDOW_DAYS,
  };
}

function computeTrafficSources(scoped: CommerceEvent[], orderEvents: CommerceEvent[]) {
  return (Object.keys(SOURCE_LABELS) as TrafficSource[])
    .map((source) => {
      const sessions = new Set(
        scoped.filter((e) => e.type === "session_started" && e.source === source).map((e) => e.sessionId),
      ).size;
      const sourceOrderEvents = orderEvents.filter((e) => e.source === source);
      const orders = new Set(sourceOrderEvents.map((e) => e.orderId)).size;
      return {
        source,
        label: SOURCE_LABELS[source],
        sessions,
        orders,
        conversionRate: sessions > 0 ? round1((orders / sessions) * 100) : 0,
        revenue: sumBy(sourceOrderEvents, (e) => e.orderValue ?? 0),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function computeInsights(params: {
  summary: DashboardAnalyticsResult["summary"];
  funnel: FunnelStage[];
  productPerformance: DashboardAnalyticsResult["productPerformance"];
  locations: DashboardAnalyticsResult["locations"];
  trafficSources: DashboardAnalyticsResult["trafficSources"];
  compare: boolean;
}): DashboardAnalyticsResult["insights"] {
  const { summary, funnel, productPerformance, locations, trafficSources, compare } = params;
  const insights: DashboardAnalyticsResult["insights"] = [];

  if (compare && summary.grossSales.changePct !== null && Math.abs(summary.grossSales.changePct) >= 5) {
    insights.push({
      id: "sales-change",
      tone: summary.grossSales.changePct >= 0 ? "positive" : "warning",
      text: `Gross sales ${summary.grossSales.changePct >= 0 ? "rose" : "fell"} ${Math.abs(summary.grossSales.changePct)}% versus the previous period.`,
    });
  }

  const dropoffs = funnel.slice(1).filter((s) => s.dropOffFromPrevious !== null);
  if (dropoffs.length) {
    const worst = dropoffs.reduce((a, b) => ((b.dropOffFromPrevious ?? 0) > (a.dropOffFromPrevious ?? 0) ? b : a));
    if ((worst.dropOffFromPrevious ?? 0) >= 30) {
      insights.push({
        id: "funnel-dropoff",
        tone: "warning",
        text: `The largest funnel drop-off is at "${worst.label}", losing ${worst.dropOffFromPrevious}% of sessions from the previous stage.`,
      });
    }
  }

  if (productPerformance.length && productPerformance[0].revenue > 0) {
    const top = productPerformance[0];
    insights.push({
      id: "top-product",
      tone: "positive",
      text: `${top.name} is the top-performing product with ${currency.format(top.revenue)} in revenue.`,
    });
  }

  if (locations.length && locations[0].revenue > 0) {
    const top = locations[0];
    insights.push({
      id: "top-location",
      tone: "neutral",
      text: `${top.city}, ${top.state} leads with ${currency.format(top.revenue)} in revenue from ${top.orders} order${top.orders === 1 ? "" : "s"}.`,
    });
  }

  const eligibleSources = trafficSources.filter((s) => s.sessions >= 10 && s.conversionRate > 0);
  if (eligibleSources.length) {
    const best = [...eligibleSources].sort((a, b) => b.conversionRate - a.conversionRate)[0];
    insights.push({
      id: "top-source",
      tone: "positive",
      text: `${best.label} has the highest conversion rate at ${best.conversionRate}% among sources with meaningful traffic.`,
    });
  }

  if (compare && summary.openReturns.changePct !== null && summary.openReturns.changePct >= 25 && summary.openReturns.value >= 2) {
    insights.push({
      id: "returns-spike",
      tone: "warning",
      text: `Return requests increased ${summary.openReturns.changePct}% versus the previous period.`,
    });
  }

  return insights;
}

export function computeDashboardAnalytics(filter: DashboardFilter): DashboardAnalyticsResult {
  const { from, to } = resolveRange(filter);
  const scoped = scopeEvents(COMMERCE_EVENTS, from, to, filter);
  const prevRange = resolvePreviousRange(from, to);
  const prevScoped = filter.compare ? scopeEvents(COMMERCE_EVENTS, prevRange.from, prevRange.to, filter) : [];

  const orderEvents = selectOrderEvents(scoped, filter, "order_completed");
  const prevOrderEvents = filter.compare ? selectOrderEvents(prevScoped, filter, "order_completed") : [];
  const returnEvents = selectOrderEvents(scoped, filter, "return_requested");
  const prevReturnEvents = filter.compare ? selectOrderEvents(prevScoped, filter, "return_requested") : [];

  const orderIds = new Set(orderEvents.map((e) => e.orderId));
  const prevOrderIds = new Set(prevOrderEvents.map((e) => e.orderId));
  const grossSalesValue = sumBy(orderEvents, (e) => e.orderValue ?? 0);
  const prevGrossSalesValue = sumBy(prevOrderEvents, (e) => e.orderValue ?? 0);
  const sessionsCount = new Set(scoped.filter((e) => e.type === "session_started").map((e) => e.sessionId)).size;
  const prevSessionsCount = new Set(prevScoped.filter((e) => e.type === "session_started").map((e) => e.sessionId)).size;
  const aovValue = orderIds.size > 0 ? grossSalesValue / orderIds.size : 0;
  const prevAovValue = prevOrderIds.size > 0 ? prevGrossSalesValue / prevOrderIds.size : 0;
  const conversionValue = sessionsCount > 0 ? (orderIds.size / sessionsCount) * 100 : 0;
  const prevConversionValue = prevSessionsCount > 0 ? (prevOrderIds.size / prevSessionsCount) * 100 : 0;
  const distinctCustomers = new Set(orderEvents.map((e) => e.customerId).filter(Boolean)).size;
  const prevDistinctCustomers = new Set(prevOrderEvents.map((e) => e.customerId).filter(Boolean)).size;

  const summary: DashboardAnalyticsResult["summary"] = {
    grossSales: comparison(grossSalesValue, prevGrossSalesValue, filter.compare),
    orders: comparison(orderIds.size, prevOrderIds.size, filter.compare),
    averageOrderValue: comparison(round1(aovValue), round1(prevAovValue), filter.compare),
    conversionRate: comparison(round1(conversionValue), round1(prevConversionValue), filter.compare),
    customers: comparison(distinctCustomers, prevDistinctCustomers, filter.compare),
    openReturns: comparison(returnEvents.length, prevReturnEvents.length, filter.compare),
  };

  const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const groupBy: "day" | "week" = spanDays > 31 ? "week" : "day";
  const timeSeries: DashboardAnalyticsResult["timeSeries"] = {
    current: fillSeries(buildBuckets(from, to, groupBy), orderEvents),
    previous: filter.compare ? fillSeries(buildBuckets(prevRange.from, prevRange.to, groupBy), prevOrderEvents) : [],
    groupBy,
  };

  const funnel = computeFunnel(scoped);
  const { performance: productPerformance, interest: productInterest, mostViewedProductName } = computeProductRows(
    scoped,
    orderEvents,
    returnEvents,
  );
  const orderStatus = computeOrderStatusSlices(scoped);
  const recentOrders = computeRecentOrders(orderEvents);
  const fulfilment = computeFulfilment(scoped, orderEvents);
  const locations = computeLocations(orderEvents);
  const customerOverview = computeCustomerOverview(orderEvents, from);
  const returns = computeReturns(scoped, filter);
  const trafficSources = computeTrafficSources(scoped, orderEvents);
  const insights = computeInsights({ summary, funnel, productPerformance, locations, trafficSources, compare: filter.compare });

  return {
    filter,
    isEmpty: sessionsCount === 0,
    summary,
    timeSeries,
    funnel,
    productPerformance,
    productInterest,
    mostViewedProductName,
    orderStatus,
    recentOrders,
    fulfilment,
    locations,
    customerOverview,
    returns,
    trafficSources,
    insights,
  };
}

export const DATASET_BOUNDS = { from: DATASET_START.toISOString().slice(0, 10), to: NOW.toISOString().slice(0, 10) };
