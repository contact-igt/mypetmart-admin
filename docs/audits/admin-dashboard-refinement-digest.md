# MyPetMart — Admin Dashboard Refinement Digest

Date: 2026-08-04
Scope: refine `/admin` only into a filterable, India-focused commerce
dashboard powered by a new deterministic 90-day event dataset. No other
admin route, apps/api, Prisma, Docker or storefront route was touched.

**Final result: PASS**

---

## 1. Verified website/proposal findings

Research was done directly against `https://mypetmart.org` (Browser tool)
before any code was written, per the task's SOURCE PRIORITY. Nothing below
was invented.

| Finding | Source | Used for |
|---|---|---|
| Live catalogue has exactly 3 products: Dog Anti-Slip Pads (₹599 sale / ₹1,199 regular), Pet Grooming Brush (₹1,399 / ₹2,999), "Double Leash — Double Joy" (₹3,499 / ₹4,999) | `mypetmart.org` homepage + `/collections` (3 products) | Named as the "primary demo reference" in Product performance's description text; mapped to the existing fixture products `prod-2`, `prod-1`, `prod-3` (weighted highest in the event generator) rather than inventing new SKUs |
| Standard shipping: 4–8 business days. Express (prepaid only): 2–4 business days. Free shipping via Blue Dart. | `/policies/shipping-policy` | `TRANSIT_DAYS = { standard: 6, express: 3 }` (midpoints) in `dashboard-fixtures.ts`, cited in the Fulfilment section's demo-label copy |
| 7-day return window from delivery; unboxing-video requirement for damage claims; no automated refund process described | `/policies/refund-policy` | `RETURN_WINDOW_DAYS = 7` constant driving the Returns section's eligibility indicator; confirmed no refund/pickup automation was built |
| Support contact: `mypetmartstore@gmail.com` | `/policies/contact-information` + homepage | Matches the existing `STORE_SETTINGS.supportEmail` fixture — no change needed |
| Official linked channels: Instagram (`instagram.com/my.petmart`), YouTube (`@MypetMart-MPM`), Facebook (unlinked root) | Footer social links | Confirms Instagram/Facebook/YouTube as legitimate entries in the Traffic sources list (alongside Direct/Google organic/Meta Ads/Other, which are not claimed as linked-and-verified) |
| No public follower counts, engagement stats, or review counts were extracted or used | — | Enforced by `scripts/verify-admin-dashboard.sh`'s "No social follower/engagement statistics" check |

No Shopify visual patterns were copied — only the *idea* of a filterable,
sectioned commerce dashboard (summary → trend → funnel → catalogue →
fulfilment → geography → customers → service → acquisition → insights)
informed the information hierarchy, per the task's "Shopify-inspired, not a
copy" instruction.

---

## 2. Iterations completed

**1 of 3 allotted**, plus one in-loop bug found and fixed during interactive
browser verification (see §7). No repeated failures on the same issue.

1. Read all required docs + the live site, designed the analytics data
   model, built the deterministic event generator, extended
   `AdminRepository`, built every chart primitive and section, rewrote
   `dashboard-view.tsx`.
2. `typecheck:web` / `lint:web` / `build:web` all passed on the first run
   (errors seen were all in the *old* dashboard-view.tsx being replaced,
   confirmed by inspecting the error list before the rewrite landed).
3. Interactive browser verification found one real bug (duplicate React
   keys in the location list), fixed and re-verified.

---

## 3. Files changed

**New files:**
- `apps/web/src/data/admin/dashboard-fixtures.ts` — seeded PRNG (`mulberry32`), India location/traffic-source/product weights, the `COMMERCE_EVENTS: CommerceEvent[]` generator (90 days, computed once at module load)
- `apps/web/src/data/admin/dashboard-analytics.ts` — pure computation engine: date-range resolution, filter scoping, funnel/summary/time-series/product/location/customer/returns/traffic/insights aggregation
- `apps/web/src/components/admin/dashboard/dashboard-filter-bar.tsx`
- `apps/web/src/components/admin/dashboard/sales-orders-chart.tsx`
- `apps/web/src/components/admin/dashboard/conversion-funnel.tsx`
- `apps/web/src/components/admin/dashboard/order-status-donut.tsx`
- `apps/web/src/components/admin/dashboard/order-status-section.tsx`
- `apps/web/src/components/admin/dashboard/product-performance-section.tsx`
- `apps/web/src/components/admin/dashboard/product-interest-section.tsx`
- `apps/web/src/components/admin/dashboard/fulfilment-section.tsx`
- `apps/web/src/components/admin/dashboard/location-section.tsx`
- `apps/web/src/components/admin/dashboard/customer-overview-section.tsx`
- `apps/web/src/components/admin/dashboard/returns-section.tsx`
- `apps/web/src/components/admin/dashboard/traffic-sources-section.tsx`
- `apps/web/src/components/admin/dashboard/business-insights-section.tsx`
- `apps/web/src/components/admin/dashboard/ranked-bar-list.tsx`
- `apps/web/src/components/admin/dashboard/metric-comparison-card.tsx`
- `apps/web/src/components/admin/dashboard/section-card.tsx`
- `scripts/verify-admin-dashboard.sh`
- `docs/audits/admin-dashboard-refinement-digest.md` (this file)

**Modified:**
- `apps/web/src/data/admin/types.ts` — removed the old `DashboardStats` type (only the replaced dashboard used it); added `TrafficSource`, `CommerceEventType`, `DashboardOrderStatus`, `CommerceEvent`, `DashboardFilter`, `DashboardFilterOptions`, `MetricComparison`, `CommerceSummary`, `TimeSeriesPoint`/`TimeSeries`, `FunnelStage`, `ProductPerformanceRow`, `ProductInterestRow`, `OrderStatusSlice`, `DashboardOrderRow`, `FulfilmentSummary`, `LocationPerformance`, `CustomerOverview`, `ReturnsOverview`, `TrafficSourceRow`, `BusinessInsight`, `DashboardAnalyticsResult`
- `apps/web/src/data/admin/repository.ts` — replaced `getDashboardStats()` with `getDashboardFilterOptions()` and `getDashboardAnalytics(filter)`
- `apps/web/src/data/admin/mock-repository.ts` — dashboard methods now delegate to `dashboard-analytics.ts`; removed the now-dead `NOW`/`isSameDay` helpers that only the old dashboard method used
- `apps/web/src/components/admin/dashboard/dashboard-view.tsx` — fully rewritten as the filter-state + data-fetch orchestrator for all 12 sections

**Explicitly untouched** (verified by `scripts/verify-admin-dashboard.sh`'s
blast-radius and dependency checks): `apps/api/`, `prisma/`, `compose.yaml`,
`.env*`, all storefront routes/components, `/admin/products`,
`/admin/categories`, `/admin/orders`, `/admin/customers`, `/admin/returns`,
`/admin/settings`, `/admin/reports` (including the shared `bar-chart.tsx` /
`status-overview.tsx` primitives that Reports still imports — confirmed
working, unchanged), the admin shell, `package.json`, `pnpm-lock.yaml`.

---

## 4. Filters and sections completed

All 12 requested sections were built and all read from one
`DashboardAnalyticsResult` produced by a single `getDashboardAnalytics(filter)`
call — no section fetches or filters independently.

Global filters: date preset (Today/7d/30d/90d/Custom with min/max clamped to
the dataset's actual bounds) · compare-with-previous-period toggle · product
· order status · Indian state · traffic source · active-filter chips (each
individually removable) · Clear all (verified restores the exact unfiltered
30-day baseline, byte-for-byte on the KPI values).

Sections: Commerce summary (6 metrics with comparison badges) · Sales/orders/units
combined chart (bar + previous-period line overlay, day/week auto-grouping) ·
Store conversion funnel (5 stages, click-free, always logically decreasing) ·
Product performance (ranked chart + full table) · Product-interest tracking
(+ wishlist "not enabled in current project scope" notice) · Order status
donut (click-to-filter recent orders) · Shipping & fulfilment (demo-labelled)
· India location performance (ranked, click-to-filter by state) · Customer
overview (new/returning/repeat-rate/recent list) · Returns & service issues
(demo eligibility rule) · Traffic sources (demo-labelled, ranked) · Business
insights (deterministic, conditionally rendered).

---

## 5. Metric definitions

- **Gross sales / Orders / AOV**: derived from `order_completed` events, one
  event per order line item. Cancelled orders are excluded by default; if
  the user explicitly filters to `orderStatus = Cancelled`, the same metrics
  instead show cancelled-order figures (an intentional, documented choice —
  see §8).
- **Conversion rate**: distinct completed orders ÷ distinct sessions in the
  filtered window, as a percentage.
- **Funnel stages**: counted by **distinct session**, not raw event count,
  for the first four stages; the final stage counts distinct **orders**.
  Funnel always reflects full behavior regardless of the order-status filter
  (status is a post-purchase concept) — documented as a deliberate scope
  boundary, not a bug.
- **Product performance vs. Product-interest**: "views"/"cart adds" are raw
  event counts (impressions); "unique visitors" in the interest table is
  distinct sessions. `cartToPurchaseRate` is units-sold ÷ cart-adds as a
  reasonable demo proxy, not a strict cohort match.
- **New vs. returning customer**: a customer's *first-ever* `order_completed`
  event across the **full 90-day dataset** (not just the filtered window)
  decides whether they're "new" or "returning" within that window — this is
  why toggling filters can move a customer between the two buckets.
- **Fulfilment "delayed"**: a `processing`/`shipped` order whose age exceeds
  its shipping mode's expected transit time (§1) by more than 2 days.
- **Returns eligibility**: `return_requested.at` minus the matching order's
  `order_fulfilled.at`, compared against the 7-day window from §1.

---

## 6. Calculation checks (performed against the live 30-day default view)

All of the following were confirmed by hand-summing the rendered numbers,
not just inspected visually:

- **Location revenue sums to Gross sales**: ₹10,938 + ₹10,936 + ₹7,291 +
  ₹6,145 + ₹5,742 + ₹5,043 + ₹4,397 + ₹3,147 + ₹2,798 + ₹1,997 = **₹58,434**,
  exactly matching the Gross sales KPI card.
- **Traffic-source orders sum to the Orders KPI**: 12+5+11+7+7+4+4 = **50**.
- **Traffic-source revenue sums to Gross sales**: ₹11,635+₹11,141+₹10,988+
  ₹9,140+₹7,789+₹5,795+₹1,946 = **₹58,434**.
- **Order-status donut total minus cancelled equals Orders KPI**: 0+1+3+8+
  37+2+1 = 52 total; 52 − 2 cancelled = **50**, matching Orders.
- **Customer overview total equals the Customers KPI**: 38 new + 7
  returning = **45**.
- **Funnel is strictly non-increasing** at every stage in every filter
  combination tested: 748 → 440 → 151 → 77 → 52 (unfiltered); 95 → 95 → 40 →
  22 → 15 (product-filtered — the first two stages tie exactly, which is
  correct: filtering to sessions that viewed product X makes "sessions" and
  "product views" the same set by construction).
- **Business insights only cite numbers that appear elsewhere on the same
  filtered page** (top product, top location, top source, largest
  drop-off) — spot-checked against the tables/lists they reference.
- **Custom date range** (2026-06-01 to 2026-06-30) produced different,
  internally consistent figures (₹63,025 / 56 orders), confirming the date
  picker actually re-scopes the dataset rather than being cosmetic.

---

## 7. Bug found and fixed during verification

**Duplicate React keys in the India location list.** `location-section.tsx`
originally keyed each `RankedBarList` row by `l.state` alone. Since several
cities share a state (Chennai/Coimbatore/Madurai are all Tamil Nadu;
Mumbai/Pune are both Maharashtra), React logged "two children with the same
key" for Maharashtra and Tamil Nadu. The visible list still happened to
render all 10 cities correctly (React's key-collision fallback didn't drop
any in this case), but this is unsupported behavior per React's own warning
and would risk row-identity bugs on future edits.

Fixed by separating the list item's **React key** (now the unique
`${state}|${city}` pair) from its **filter value** (the plain state name
passed to the click handler) — added an optional `filterValue` field to
`RankedBarItem` in `ranked-bar-list.tsx` so `key` and "what clicking this row
filters by" are no longer required to be the same string. Re-verified with a
completely fresh browser tab (to rule out a stale console buffer from a
prior HMR cycle) — zero console errors after the fix, and clicking a city
correctly sets `state` in the shared filter (confirmed Chennai → "State:
Tamil Nadu" chip → location list narrows to exactly the 3 Tamil Nadu rows,
summing to the filtered Gross sales figure).

---

## 8. Responsive and accessibility results

- **375 / 768 / 1440px**: `document.body.scrollWidth` equals
  `window.innerWidth` at all three (no page-level horizontal scroll). The
  only elements wider than the viewport are `DataTable`'s own
  `overflow-x-auto` wrapper and its `min-w-[640px]` table — scrolling
  independently inside their own container by design, consistent with the
  existing admin panel's established pattern.
- Filter bar wraps to a stacked layout on mobile; KPI cards go 2-column on
  mobile, up to 6-column on desktop; the order-status donut + legend stack
  vertically below `sm:` and sit side-by-side above it.
- Chart bars and ranked-list rows are real `<button>` elements — Tab reaches
  them and `onFocus` shows the same tooltip/highlight as hover, matching the
  existing `BarChart` primitive's established pattern (unmodified, still
  used by Reports).
- Global `:focus-visible { outline: 2px solid var(--color-focus-ring) }` in
  `globals.css` was not touched and still applies to every new interactive
  element (buttons, selects, date inputs) — no new component opts out of it.
- Donut/legend rows, location rows, and traffic-source rows all use
  `aria-pressed` to expose filter-active state to assistive tech.
- Empty state (`state=Uttar Pradesh` + `source=YouTube` + `Today`) renders a
  clear "No activity matches these filters" message with a working "Clear
  all filters" button — confirmed it restores the exact unfiltered baseline.

---

## 9. Demo vs. live-integration labelling

Every section that isn't purely computed from real fixture text carries an
explicit label:
- Fulfilment: "Demo figures until a real shipping partner integration is
  connected" (cites the verified mypetmart.org shipping policy as the basis
  for the modelled ranges).
- Traffic sources: "demo figures until Meta Pixel, GA and Clarity are
  connected."
- Returns: eligibility rule stated as "a configurable demo rule."
- Product-interest: wishlist explicitly "not enabled in current project
  scope," never shown as a KPI or given a number.
- The dashboard's top-level subtitle states the whole page is "demo data,
  deterministic across reloads" with the dataset's actual date bounds shown.

No follower counts, engagement rates, review counts, or other unverifiable
social statistics were displayed anywhere (enforced by the verify script).

---

## 10. Backend, analytics and event-tracking requirements (for a real build)

To replace this demo layer with live data, a future `RestAdminRepository`
implementing the same `AdminRepository.getDashboardAnalytics()` /
`getDashboardFilterOptions()` interface would need a backend that:
1. Emits the same 7 event types (`session_started`, `product_viewed`,
   `added_to_cart`, `checkout_started`, `order_completed`,
   `order_fulfilled`, `return_requested`) with timestamp, session, optional
   customer, product, source, state/city and order-value fields — i.e. a
   real analytics/event pipeline (Meta Pixel, GA, Clarity — already scoped
   as "setup only" in `docs/PROJECT_BRIEF.md`) feeding a server-side store.
2. Attributes traffic source server-side (UTM/referrer parsing) rather than
   the client-declared source this demo generator assigns.
3. Ties `order_fulfilled`/delivery timestamps to real shipment tracking
   (currently modelled from the published shipping-policy transit-time
   ranges, not real carrier data).
4. Computes the same aggregates (funnel, product/location/source rollups,
   new-vs-returning) either in the API layer or a scheduled materialization
   job, since the current in-browser computation over ~6–12k events is only
   practical at demo scale.

---

## 11. Remaining human-judgment items

1. **Funnel doesn't respect the order-status filter** by design (status is
   post-purchase) — flagged in §5/§6; confirm this reads correctly to a
   human reviewer rather than looking like a missed filter.
2. **Cancelled-order handling**: default views exclude cancelled orders from
   revenue; explicitly filtering to "Cancelled" status shows cancelled-order
   figures instead of zero. This is documented behavior, not universally
   obvious — worth a tooltip in a future pass if it causes confusion.
3. **Conversion funnel desktop/mobile layout**: built as one responsive
   horizontal-bar list (proportional width, stacked top-to-bottom) rather
   than two structurally different chart shapes, since a true side-by-side
   desktop funnel needs bespoke trapezoid shapes that add complexity without
   adding readability. Documented in `conversion-funnel.tsx`'s own comment.
4. **"First-time buyers" equals "New customers"** by definition in this
   model (§5) — intentionally not a separate independent metric, since
   there's no additional signal in the event data that would make them
   differ.
5. **Recent orders on the dashboard are drawn from the new event dataset**
   (`EVT-###` order numbers), not the small 17-row `Order[]` fixture that
   `/admin/orders` uses — a deliberate separation (analytics rollup vs.
   order-management detail, the same split most real commerce platforms
   have) documented in `types.ts`'s `CommerceEvent` doc comment, not a
   silent inconsistency.

---

## Final result: **PASS**

- `pnpm typecheck:web` / `pnpm lint:web` / `pnpm build:web` all pass.
- `scripts/verify-admin-dashboard.sh` passes every check (build gates,
  required modules, forbidden-scope-feature scan, wishlist-claim scan,
  blast-radius guard, dependency guard).
- All 16 routes (13 admin + 3 storefront) return HTTP 200.
- No console errors on any route, confirmed from a fresh browser tab.
- No horizontal page overflow at 375/768/1440px.
- Every filter (individually and combined), the compare toggle, funnel
  math, chart tooltips, donut click-to-filter, location/source
  click-to-filter, custom date range, empty state, and reset were all
  interactively exercised and produced internally-consistent numbers.
- Existing admin CRUD flows, the Reports page (which still imports the
  original `bar-chart.tsx`/`status-overview.tsx`), and all 3 storefront
  pages were regression-checked and are unaffected.
- Dev server left running at `http://localhost:3000/admin`. Nothing
  committed or pushed.
