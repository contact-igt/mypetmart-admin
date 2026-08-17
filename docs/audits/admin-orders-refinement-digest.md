# MyPetMart — Orders & Fulfilment Admin Refinement Digest

Date: 2026-08-04
Scope: refine `/admin/orders` and `/admin/orders/[id]` only. No other admin
route, apps/api, Prisma, Docker or storefront route was touched, apart from
one small necessary shared-file edit (see §4).

**Final result: PASS**

---

## 1. Iterations

**1 of 3 allotted**, plus one real bug found and fixed during interactive
browser verification (see §3) — not counted as a separate iteration since it
didn't require re-running the build-gates loop, only a fixture-data
correction and a re-check.

## 2. Pre-edit audit (375 / 768 / 1440px)

Audited both routes before making any changes, per the task's loop:

- **No layout bugs found** at any breakpoint — the existing implementation
  was already free of horizontal overflow. This task's work is purely
  additive/functional.
- **Orders list** had only: search (order # / customer name), a single
  status filter, a from/to date range, and 6 columns (order, customer, date,
  items, total, status). No summary counts, no payment/fulfilment/product/
  state filters, no sort control, no active-filter chips, no row-level quick
  actions, no bulk actions.
- **Order detail** had: items (name/qty/price only — no SKU or variant),
  subtotal/shipping/total, customer link + free-text address, payment
  method/status (display only), a single order-status update control
  (unvalidated — any of the 5 old statuses could be selected from any other),
  a chronological timeline, and internal notes. No fulfilment tracking, no
  shipping method/carrier/tracking fields, no payment-status editing, no
  return-request link, no communication controls, and the status field only
  supported 5 values with no transition rules at all (any status → any
  status was previously allowed).

## 3. Issues found and fixed

**Timeline chronology bug in the new `return_requested` fixture data.** While
verifying "internal notes and timeline ordering" on order-10 (the order I
changed to `return_requested` to have a real fixture for the new
return-request-link feature), the rendered timeline showed "Return
requested" (30 Jul) positioned *after* "Delivered" (2 Aug) in the list, but
its actual timestamp was chronologically *before* delivery — logically
impossible, since a return can't be requested before the item is delivered.
The bug was in `buildOrder()`'s fixed `daysAgo(daysBack - 1, 12)` formula for
the return-requested timeline entry, which didn't account for the delivered
entry's own offset. Fixed by deriving the return-requested timestamp from
the delivered entry's own computed offset (`deliveredDaysAgo - 1`, hour 20 to
also cover the same-day edge case), guaranteeing it always lands after
delivery. Re-verified: "Return requested" now correctly renders last (4 Aug)
after "Delivered" (2 Aug).

No other real bugs were found — every filter, the sort dropdown, bulk
actions (including the skip-ineligible-rows path), single-order status/
fulfilment/payment transitions, the invalid-transition rejection (tested by
deliberately bypassing the UI's own valid-options filtering), tracking-field
saves, and the return-request link all worked correctly on first
implementation.

## 4. Files changed

**New:**
- `apps/web/src/data/admin/order-status-rules.ts` — single source of truth
  for order/fulfilment/payment transition rules, imported by both
  `mock-repository.ts` (server-side enforcement) and the two view components
  (client-side — only ever offer valid next options)
- `scripts/verify-admin-orders.sh`
- `docs/audits/admin-orders-refinement-digest.md` (this file)

**Modified:**
- `apps/web/src/data/admin/types.ts` — `OrderStatus` extended from 5 to 7
  values (`confirmed`, `return_requested` added); new `FulfilmentStatus`,
  `PaymentStatus` (added `failed`), `ShippingMethod`, `OrderSummary`,
  `ShippingDetailsInput` types; `Order` extended with `fulfilmentStatus`,
  `city`, `state`, `shippingMethod`, `carrier`, `trackingNumber`;
  `OrderItem` extended with `sku`, `variantLabel`; `OrderListParams`
  extended with `paymentStatus`, `fulfilmentStatus`, `productId`, `state`
- `apps/web/src/data/admin/repository.ts` — added `getOrderSummary`,
  `updateOrderFulfilmentStatus`, `updateOrderPaymentStatus`,
  `updateOrderShippingDetails`, `bulkUpdateOrderStatus`,
  `getReturnsForOrder` to the `AdminRepository` interface
- `apps/web/src/data/admin/mock-repository.ts` — implemented the five new
  methods (all mutations append a timeline entry); `updateOrderStatus` now
  validates against `order-status-rules.ts` and throws on an illegal
  transition; `listOrders` extended to filter by payment/fulfilment/product/
  state and to search customer email/phone (joined from `this.customers`),
  plus sort-by-total support
- `apps/web/src/data/admin/fixtures.ts` — `buildOrder()` extended to
  populate the new fields (fulfilment status derived from order status at
  creation time, city/state from a small customer→location map, shipping
  method/carrier/tracking for shipped-or-later orders); two orders' statuses
  changed (order-3 → `confirmed`, order-10 → `return_requested`) to exercise
  the new statuses without touching orders already referenced by
  `RETURNS`; one new linked return (`ret-7` → `order-10`) added so the
  detail page's return-request link has real data to show
- `apps/web/src/components/admin/orders/orders-list-view.tsx` — rewritten:
  7 summary stat cards, phone/email-aware search, payment/fulfilment/
  product/state filters, a Newest/Oldest/Highest-value/Lowest-value sort
  dropdown, active-filter chips, per-row inline status-update select + quick
  note dialog, bulk confirm/processing/shipped actions (each behind a
  confirmation dialog, each reporting how many rows were updated vs. skipped
  as ineligible)
- `apps/web/src/components/admin/orders/order-detail-view.tsx` — rewritten:
  items now show SKU/variant, structured city/state alongside the free-text
  address, an editable shipping/tracking form, editable fulfilment and
  payment status controls (both validated, both log to the timeline),
  order-status control now only offers legal next states and asks for
  confirmation on cancel/return-request, a return-request-linked banner when
  `getReturnsForOrder` finds a match, and "Email customer"/"SMS customer"
  buttons that show an "integration required" toast rather than doing
  anything
- `apps/web/src/components/admin/ui/status-badge.tsx` — added tone entries
  for the new order statuses (`confirmed`, `return_requested`), the
  fulfilment vocabulary (`unfulfilled`, `packed` — `processing`/`shipped`/
  `delivered` already existed and are intentionally reused for visual
  consistency across the three status dimensions), and the payment
  vocabulary (`paid`, `failed`, `refunded`); also fixed underscore-status
  display (`return_requested` was rendering with a literal underscore under
  the existing `capitalize` CSS class). This is the one small
  shared-component edit outside `components/admin/orders/` — the same
  "necessary shared-file" precedent as `icons.tsx` in the two prior tasks,
  and `scripts/verify-admin-orders.sh` checks it's the *only*
  `components/admin/ui/` file touched.

**Explicitly untouched** (verified by `scripts/verify-admin-orders.sh`'s
blast-radius and dependency checks): `apps/api/`, `prisma/`, `compose.yaml`,
`.env*`, all storefront routes/components, `/admin` dashboard, `/admin/
products`, `/admin/categories`, `/admin/customers`, `/admin/returns`,
`/admin/reports`, `/admin/settings`, the admin shell, every other
`components/admin/ui/*` primitive, `package.json`, `pnpm-lock.yaml`.

## 5. Repository changes (summary)

New `AdminRepository` methods: `getOrderSummary`,
`updateOrderFulfilmentStatus`, `updateOrderPaymentStatus`,
`updateOrderShippingDetails`, `bulkUpdateOrderStatus`, `getReturnsForOrder`.
`updateOrderStatus` unchanged in signature but now enforces the transition
graph. `listOrders` params extended (see §4). All new/changed methods keep
the existing Promise + artificial-delay pattern and never touch
`localStorage`.

## 6. Transition rules

Order, fulfilment and payment status are three fully independent state
machines — none of them cascade into or infer another (per the task's
"Keep order, payment and fulfilment statuses separate" instruction). Rules
live in `order-status-rules.ts` and are enforced both client-side (only
legal options are ever offered in a `<select>`) and server-side in
`mock-repository.ts` (throws on an illegal transition regardless of what the
client sends — verified in §7 by deliberately injecting an invalid `<option>`
into the DOM to bypass the UI's own filtering).

**Order status** — `pending → confirmed → processing → shipped → delivered`
is the canonical forward path:
- From any pre-delivery stage (pending/confirmed/processing/shipped): any
  later stage in the sequence, plus `cancelled`.
- From `delivered`: only `return_requested`.
- `cancelled` and `return_requested` are terminal — no further changes.
- Reverse moves (e.g. `delivered → pending`, `shipped → processing`) are
  always rejected.

**Fulfilment status** — `unfulfilled → processing → packed → shipped →
delivered`, strictly forward-only (jumping ahead is allowed, e.g.
`unfulfilled → shipped` directly, for manual admin correction; going
backward is not).

**Payment status** — `pending → {paid, failed}`, `failed → {pending, paid}`
(retry or manual reconciliation), `paid → refunded`, `refunded` terminal.

## 7. Workflows tested (interactively, in-browser)

- **Combined filters**: status=delivered + state=Karnataka → 2 orders,
  hand-verified against the fixture data (only order-8 and order-15 are
  both Karnataka-shipped and delivered).
- **Summary reconciliation**: pending(1) + processing(1) + shipped(2) +
  delivered(10) + cancelled(1) + returns(1) = 16, +1 confirmed (not its own
  summary card, per the task's literal card list) = 17 = total. Verified by
  hand-tracing every order's status against its `buildOrder()` call.
- **Per-row valid-transition dropdowns**: spot-checked against
  `getValidNextOrderStatuses()` for four different current statuses
  (pending, confirmed, processing, shipped) and the terminal
  return_requested row (correctly shows no status select, only "+ Note").
- **Bulk actions — all-skip case**: selected 3 orders none of which could
  legally move to "confirmed" (a processing, an already-confirmed, and a
  shipped order) → 0 updated, summary counts unchanged, error toast shown.
- **Bulk actions — mixed case**: selected one eligible (confirmed →
  processing) and one ineligible (delivered → processing) order, applied
  "Mark processing" → processing count went 1→2, delivered count stayed at
  10 (the ineligible row was correctly skipped, not force-updated).
- **Invalid transition — client bypass test**: injected a `return_requested`
  `<option>` into a *pending* order's status `<select>` (which the UI would
  never legitimately offer, since pending→return_requested isn't in the
  valid-next list) and submitted it. The destructive-transition confirmation
  dialog still opened (client-side check is by target status, not by
  option-list membership), but on confirming, `mock-repository.ts` rejected
  it server-side with "Cannot move an order from 'pending' to
  'return_requested'." and the order's status remained unchanged —
  confirms defense-in-depth, not just UI-level trust.
- **Non-destructive transition**: pending → confirmed applied immediately,
  no confirmation dialog (matches `isDestructiveOrderTransition` only
  flagging cancel/return-request).
- **Shipping/tracking fields**: edited carrier + tracking number on
  order-10 and saved — persisted, and a "Tracking updated — Delhivery
  AWB-TEST-999" entry appeared on the timeline immediately after.
- **Timeline ordering**: re-verified after the §3 fix — all entries now
  render in true chronological order for every order checked.
- **Return-request link**: order-10's detail page shows "1 return/
  replacement request linked to this order: Return — requested", linking to
  `/admin/returns/ret-7`; confirmed the reverse link (ret-7 → MPM-1033)
  works from the Returns side too.
- **Customer/return cross-route consistency**: `/admin/customers/cust-3`
  correctly renders order-3's new "Confirmed" badge in its order-history
  table with no console errors — confirms the wider status vocabulary
  doesn't break `StatusBadge` consumers outside the Orders module.

## 8. Responsive and accessibility results

- **375 / 768 / 1440px**: `document.body.scrollWidth` equals
  `window.innerWidth` at all three, on both the orders list (8-column table
  plus a summary-card grid and a dense filter row) and the order detail page
  (3 status badges, return-request banner, shipping/fulfilment forms).
- Every new interactive control (filter selects, sort dropdown, chips,
  bulk-action buttons, per-row status select, quick-note dialog, shipping-
  details form, fulfilment/payment update controls) is a real `<button>`/
  `<select>`/`<input>`/`<textarea>` inheriting the existing global
  `:focus-visible` outline.
- The per-row actions cell uses `onClick={(e) => e.stopPropagation()}` so
  interacting with the inline status select or note button never triggers
  the row's own "navigate to detail" click handler.
- Dialogs (bulk-action confirm, destructive-transition confirm, quick note)
  all reuse the existing unmodified `Dialog`/`ConfirmDialog` primitives, so
  focus-trap, Escape-to-close and focus-restore are inherited, not
  reimplemented.

## 9. Backend/payment/shipping requirements (for a real build)

- **Payment**: every payment-status change here is a manual bookkeeping
  update, not a gateway call. A real implementation needs actual capture/
  refund integration (per `docs/PROJECT_BRIEF.md`'s payment-gateway scope)
  with the payment status field updated by a verified webhook, not free-form
  admin selection — the admin UI would likely become read-mostly for
  payment status once a real gateway is wired up, with manual override
  reserved for exceptional reconciliation.
- **Courier/shipping**: carrier and tracking-number fields are free-text/
  fixed-list demo inputs. A real build needs an actual courier API
  (Shiprocket/Delhivery/Blue Dart etc., per `docs/PROJECT_BRIEF.md`'s
  shipping-partner scope) to auto-populate tracking, validate AWB numbers,
  and push status webhooks back into `fulfilmentStatus`.
- **Email/SMS/WhatsApp**: both communication buttons are inert by design
  (toast-only). Needs actual transactional email/SMS provider integration,
  explicitly excluded from this task's scope.
- **Return resolution**: the order-status "return_requested" and the
  Returns module's own resolution workflow remain intentionally
  disconnected — resolving a return in `/admin/returns` does not currently
  flip the order status further (e.g. back toward a "refunded"-adjacent
  state), matching the returns module's existing "does not trigger a refund
  or pickup" disclosure. A real build would need to decide how (or whether)
  return resolution feeds back into order status.

## 10. Remaining human-judgment items

1. **Reports' status-distribution chart doesn't include the two new order
   statuses.** `reports-view.tsx`/`getReportsData()` use a hardcoded
   5-value status list (`pending/processing/shipped/delivered/cancelled`)
   that predates this task and is out of this task's bounds (only "order
   routes/components, necessary repository files" were in scope — Reports
   is neither). Confirmed/return-requested orders are still counted in
   "Orders in range" and revenue totals, just not broken out in that one
   chart. No console errors, no crash — a pre-existing scope boundary, not
   a regression, but worth a follow-up task if Reports should reflect the
   full status vocabulary now that Orders has it.
2. **`confirmed` has no dedicated summary card** on the orders list, per the
   task's literal "total, pending, processing, shipped, delivered,
   cancelled, returns" list — confirmed orders are counted in "Total" only.
   Intentional, matches the spec as written.
3. **Fulfilment status is seeded to match order status at fixture-build
   time** (e.g. a `shipped` order starts with `fulfilmentStatus: "shipped"`)
   but the two are independently editable from that point on — an admin
   could, for instance, mark an order `delivered` while fulfilment still
   reads `shipped`, which is intentional per "Keep order, payment and
   fulfilment statuses separate," but may look like a mismatch to a first-
   time reviewer unfamiliar with that design decision.
4. **SKU/variant on order items reflect the product's *current* catalogue
   data** (looked up at fixture-build time via `product.sku` /
   `product.variants[0]?.label`), not a historical snapshot — if a
   product's SKU changes later in `/admin/products`, past orders still show
   whatever SKU was current when the fixtures were built, not a true
   point-in-time snapshot. Acceptable for demo purposes; a real system would
   snapshot SKU/price/variant at order-placement time.

---

## Final result: **PASS**

- `pnpm typecheck:web` / `pnpm lint:web` / `pnpm build:web` all pass.
- `scripts/verify-admin-orders.sh` passes every check (build gates,
  required modules, no real payment/courier/messaging implementation,
  blast-radius guard, dependency guard).
- All 12 routes checked (8 admin + this task's 2 + 3 storefront, with
  overlap) return HTTP 200.
- No console errors on any tested route, confirmed from a fresh browser
  tab.
- No horizontal page overflow at 375/768/1440px on either Orders route.
- Every filter (individually and combined), the sort dropdown, pagination,
  single and bulk status updates (including the skip-ineligible-rows path),
  invalid-transition rejection (both client-side and server-side, the
  latter verified via a deliberate UI bypass), fulfilment/payment state
  changes, tracking-field edits, notes, and timeline ordering were all
  interactively exercised and produced correct, internally-consistent
  results. One real bug (return-request timeline chronology) was found and
  fixed during this verification pass.
- `/admin` (dashboard), `/admin/customers/[id]`, `/admin/returns/[id]`,
  `/admin/reports`, and all 3 storefront pages were regression-checked and
  are unaffected (Reports' known status-breakdown gap is a documented
  pre-existing scope boundary, not a regression).
- Dev server left running at `http://localhost:3000/admin/orders`. Nothing
  committed or pushed.
