import { CUSTOMERS, PRODUCTS } from "./fixtures";
import type { CommerceEvent, DashboardOrderStatus, ReturnReasonCode, ShippingMode, TrafficSource } from "./types";

/**
 * Deterministic 90-day commerce-event dataset powering the /admin dashboard
 * only. Kept in its own file (never touching fixtures.ts) so the existing
 * Product/Order/Customer demo data used by /admin/products, /admin/orders
 * etc. is never at risk of being overwritten. Generated once at module load
 * with a fixed PRNG seed — the output is identical on every run, so it is
 * "deterministic" in the sense the task requires (reproducible), not
 * regenerated per render or per request.
 */

const NOW = new Date("2026-08-04T09:00:00Z");
const DAYS = 90;
const SEED = 20260804;

function mulberry32(seed: number): () => number {
  let t = seed;
  return function random() {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick<T>(rng: () => number, items: [T, number][]): T {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let r = rng() * total;
  for (const [item, weight] of items) {
    if (r < weight) return item;
    r -= weight;
  }
  return items[items.length - 1][0];
}

const TRAFFIC_SOURCE_WEIGHTS: [TrafficSource, number][] = [
  ["direct", 20],
  ["instagram", 24],
  ["google_organic", 18],
  ["facebook", 9],
  ["meta_ads", 16],
  ["youtube", 7],
  ["other", 6],
];

const INDIA_LOCATIONS: [{ state: string; city: string }, number][] = [
  [{ state: "Tamil Nadu", city: "Chennai" }, 22],
  [{ state: "Tamil Nadu", city: "Coimbatore" }, 8],
  [{ state: "Tamil Nadu", city: "Madurai" }, 5],
  [{ state: "Karnataka", city: "Bengaluru" }, 14],
  [{ state: "Telangana", city: "Hyderabad" }, 9],
  [{ state: "Maharashtra", city: "Mumbai" }, 10],
  [{ state: "Maharashtra", city: "Pune" }, 7],
  [{ state: "Delhi", city: "New Delhi" }, 8],
  [{ state: "West Bengal", city: "Kolkata" }, 6],
  [{ state: "Gujarat", city: "Ahmedabad" }, 5],
  [{ state: "Kerala", city: "Kochi" }, 4],
  [{ state: "Uttar Pradesh", city: "Lucknow" }, 2],
];

const RETURN_REASON_WEIGHTS: [ReturnReasonCode, number][] = [
  ["damaged", 45],
  ["wrong_item", 30],
  ["other", 25],
];

/** Verified against mypetmart.org/policies/shipping-policy (2026-08-04): standard 4-8 business days, express 2-4 business days. Midpoints used as the demo transit-time constant. */
export const TRANSIT_DAYS: Record<ShippingMode, number> = { standard: 6, express: 3 };
/** Verified against mypetmart.org/policies/refund-policy (2026-08-04): 7-day return window from delivery. */
export const RETURN_WINDOW_DAYS = 7;

// prod-1 (grooming brush), prod-2 (anti-slip pads), prod-3 (dual leash) are the
// three products actually listed on the live mypetmart.org catalogue — weighted
// as the primary demo reference per the task brief; the remaining 11 fixture
// products share the rest of the traffic.
const FEATURED_PRODUCT_IDS = new Set(["prod-1", "prod-2", "prod-3"]);
const PRODUCT_WEIGHTS: [string, number][] = PRODUCTS.map((p) => [
  p.id,
  FEATURED_PRODUCT_IDS.has(p.id) ? 14 : 4,
]);

function isoAt(daysAgo: number, hour: number, minute: number): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

function addHours(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setTime(d.getTime() + hours * 3_600_000);
  return d.toISOString() > NOW.toISOString() ? NOW.toISOString() : d.toISOString();
}

function computeOrderStatus(rng: () => number, ageDays: number, shippingMode: ShippingMode): DashboardOrderStatus {
  if (rng() < 0.04) return "cancelled";
  const transit = TRANSIT_DAYS[shippingMode];
  if (ageDays < 1) return rng() < 0.5 ? "pending" : "confirmed";
  if (ageDays < 2) return "processing";
  if (ageDays < transit) return "shipped";
  if (ageDays >= transit + 7 && rng() < 0.06) return "return_requested";
  return "delivered";
}

function generateEvents(): CommerceEvent[] {
  const rng = mulberry32(SEED);
  const events: CommerceEvent[] = [];
  let sessionCounter = 0;
  let orderCounter = 0;
  let guestCounter = 0;

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const recency = DAYS - 1 - daysAgo; // 0 = oldest day, DAYS-1 = today
    const date = new Date(NOW);
    date.setUTCDate(date.getUTCDate() - daysAgo);
    const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    const growth = 1 + recency * 0.006;
    const base = 16 * growth * (isWeekend ? 1.25 : 1);
    const sessionsToday = Math.max(4, Math.round(base * (0.75 + rng() * 0.5)));

    for (let i = 0; i < sessionsToday; i += 1) {
      sessionCounter += 1;
      const sessionId = `sess-${sessionCounter}`;
      const hour = 8 + Math.floor(rng() * 14);
      const minute = Math.floor(rng() * 60);
      const at = isoAt(daysAgo, hour, minute);
      const source = weightedPick(rng, TRAFFIC_SOURCE_WEIGHTS);
      const location = weightedPick(rng, INDIA_LOCATIONS);
      const returningCustomer = rng() < 0.3 ? CUSTOMERS[Math.floor(rng() * CUSTOMERS.length)] : null;

      events.push({
        id: `${sessionId}-start`,
        type: "session_started",
        at,
        sessionId,
        customerId: returningCustomer?.id,
        source,
        state: location.state,
        city: location.city,
      });

      if (rng() >= 0.58) continue; // session bounced without viewing a product

      const viewedIds = new Set<string>();
      const numViewed = rng() < 0.25 ? 2 : 1;
      while (viewedIds.size < numViewed) {
        viewedIds.add(weightedPick(rng, PRODUCT_WEIGHTS));
      }
      for (const productId of viewedIds) {
        events.push({
          id: `${sessionId}-view-${productId}`,
          type: "product_viewed",
          at,
          sessionId,
          customerId: returningCustomer?.id,
          productId,
          source,
          state: location.state,
          city: location.city,
        });
      }

      if (rng() >= 0.34) continue; // viewed but never added to cart

      const primaryProductId = [...viewedIds][0];
      const cartQuantity = rng() < 0.12 ? 2 : 1;
      events.push({
        id: `${sessionId}-cart`,
        type: "added_to_cart",
        at,
        sessionId,
        customerId: returningCustomer?.id,
        productId: primaryProductId,
        quantity: cartQuantity,
        source,
        state: location.state,
        city: location.city,
      });

      if (rng() >= 0.52) continue; // added to cart, never started checkout

      events.push({
        id: `${sessionId}-checkout`,
        type: "checkout_started",
        at,
        sessionId,
        customerId: returningCustomer?.id,
        productId: primaryProductId,
        source,
        state: location.state,
        city: location.city,
      });

      if (rng() >= 0.66) continue; // checkout started, never completed

      orderCounter += 1;
      const orderId = `evt-order-${orderCounter}`;
      const customerId = returningCustomer ? returningCustomer.id : `guest-${(guestCounter += 1)}`;
      const shippingMode: ShippingMode = rng() < 0.72 ? "standard" : "express";
      const orderStatus = computeOrderStatus(rng, daysAgo, shippingMode);

      const lineItems: { productId: string; quantity: number }[] = [{ productId: primaryProductId, quantity: cartQuantity }];
      if (rng() < 0.2) {
        const upsellId = weightedPick(rng, PRODUCT_WEIGHTS);
        if (upsellId !== primaryProductId) lineItems.push({ productId: upsellId, quantity: 1 });
      }

      for (const item of lineItems) {
        const product = PRODUCTS.find((p) => p.id === item.productId);
        if (!product) continue;
        events.push({
          id: `${orderId}-${item.productId}`,
          type: "order_completed",
          at,
          sessionId,
          customerId,
          productId: item.productId,
          quantity: item.quantity,
          source,
          state: location.state,
          city: location.city,
          orderId,
          orderValue: product.price * item.quantity,
          orderStatus,
          shippingMode,
        });
      }

      if (orderStatus === "cancelled" || orderStatus === "pending" || orderStatus === "confirmed") continue;

      const processingHours = 4 + rng() * 26;
      const fulfilledAt = addHours(at, processingHours);
      events.push({
        id: `${orderId}-fulfilled`,
        type: "order_fulfilled",
        at: fulfilledAt,
        sessionId,
        customerId,
        source,
        state: location.state,
        city: location.city,
        orderId,
        orderStatus,
        shippingMode,
      });

      if (orderStatus === "return_requested") {
        const offsetDays = rng() < 0.85 ? 1 + rng() * 5 : 8 + rng() * 6;
        const returnAt = addHours(fulfilledAt, offsetDays * 24);
        events.push({
          id: `${orderId}-return`,
          type: "return_requested",
          at: returnAt,
          sessionId,
          customerId,
          productId: primaryProductId,
          source,
          state: location.state,
          city: location.city,
          orderId,
          orderStatus,
          shippingMode,
          returnReason: weightedPick(rng, RETURN_REASON_WEIGHTS),
        });
      }
    }
  }

  return events;
}

export const COMMERCE_EVENTS: CommerceEvent[] = generateEvents();
