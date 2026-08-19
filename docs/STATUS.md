# MyPetMart — Project Status

Last updated: 2026-08-18 (Admin consolidated onto one authoritative app; after-sales migrations 035–038 applied to the dev database.)

---

## Admin application (2026-08-18)

**AUTHORITATIVE ADMIN:** `mypetmart-admin/` (the Next.js app under `mypetmart-admin/src/`). Real JWT auth (`/admin/login`), real backend API bindings for every module including Returns/Refunds/Replacement.

**DEPRECATED ADMIN:** `mypetmart-admin/apps/admin` (package `@mypetmart/admin`). Frozen early-stage scaffold — in-memory mock repository, no real auth, no Refund feature, Replacement is a label only. Kept for reference only; see `apps/admin/DEPRECATED.md`. Do not add new features here or point deployments at it.

**ADMIN DEV COMMAND:** `pnpm dev:admin` (root `package.json`) now runs the authoritative app (`next dev -p 4000` from the repo root). `pnpm build:admin` / `pnpm lint:admin` / `pnpm typecheck:admin` likewise target it. The deprecated app is still reachable, deliberately not by default, via `pnpm dev:admin-legacy` / `pnpm build:admin-legacy` / etc.

**AFTER-SALES MIGRATIONS:** 035–038 (refunds table, `return_requests.quantity`, `partially_refunded` payment status, replacements table) applied to the dev database on 2026-08-18. `db:migrate:status` shows 0 pending; `db:schema:verify` passes.

**RETURNS:** implemented (backend, storefront, authoritative admin).
**REFUNDS:** implemented (backend, storefront display, authoritative admin — PayU refund initiation is code-complete and verified but requires `BACKEND_PUBLIC_ORIGIN` to actually call PayU, same as the existing payment-webhook limitation; not yet set locally).
**REPLACEMENT:** implemented (backend, storefront, authoritative admin) — verified live end-to-end against the migrated dev database on 2026-08-18: request → approve (inventory allocated, decremented exactly once) → mark complete.
**SHIPPING:** not implemented.

## Returns + Refunds (2026-08-17)

Status: **Implemented and tested, live on the real backend for both storefront and admin.**

- Backend: `refunds` table + Refund model, `return_requests.quantity` (item-level partial returns), `RefundFinalizationService` (mirrors `PaymentFinalizationService`'s lock/monotonicity pattern), PayU V1 refund client (`cancel_refund_transaction` / `check_action_status_txnid`, verified against live docs.payu.in 2026-08-17), refund webhook that re-verifies via the Status API rather than trusting its own payload. `partially_refunded` added to the shared payment-status enum.
- Storefront (`mypetmart-frontend`): `/account/returns` list + detail, inline "Request Return" form on delivered order items, refund status display.
- Admin (`mypetmart-admin` root `src/`): `/admin/returns` list/detail now hit the real backend (previously mock-only, and previously had an id-type contract mismatch with the Order→Return link — both fixed). Refund initiation gated to `super_admin` via `authorize.middleware.ts` (previously unused).
- 45 new backend tests (eligibility, concurrency, RBAC, refund idempotency/amount-authority, PayU client contract, finalization monotonicity/security) — all passing. Full existing suite (614 tests) re-verified for regressions.
- Replacement flow: implemented in a later pass (2026-08-18) — see "Admin application (2026-08-18)" above. This line originally said "not implemented" when this section was written; corrected 2026-08-18 to match runtime truth.

## Completed foundation work

| Task | Date |
|------|------|
| Baseline audit performed | 2026-07-30 |
| Project-local git repository initialised (branch: main) | 2026-07-30 |
| Root `.gitignore` created | 2026-07-30 |
| fnm installed via Homebrew (1.39.0) | 2026-07-30 |
| Node 24.18.1 installed and pinned via `.nvmrc` + `.node-version` | 2026-07-30 |
| Corepack enabled; pnpm 11.18.0 activated | 2026-07-30 |
| Root `package.json` created (packageManager pin) | 2026-07-30 |
| `pnpm-workspace.yaml` created (monorepo workspace declaration) | 2026-07-30 |
| fnm shell hook added to `~/.zshrc`; automatic activation verified | 2026-07-30 |
| `CLAUDE.md` created | 2026-07-30 |
| `README.md` created | 2026-07-30 |
| `docs/PROJECT_BRIEF.md` created | 2026-07-30 |
| `docs/DECISIONS.md` created | 2026-07-30 |
| `docs/OPEN_ITEMS.md` created | 2026-07-30 |
| `docs/STATUS.md` created | 2026-07-30 |
| `docs/DESIGN_SYSTEM.md` created | 2026-07-30 |
| Poppler installed; all 3 UI references rendered to readable JPEGs (`project-reference/rendered/`) | 2026-07-30 |
| Full visual-system extraction completed — every rendered page/slice inspected, 8 exact colour tokens pixel-sampled, typography/layout/component specs recorded | 2026-07-30 |
| `docs/DESIGN_SYSTEM.md` rewritten with complete token set; `CLAUDE.md`, `docs/DECISIONS.md` updated to reference it | 2026-07-30 |
| M0 foundation audit performed — result: PASS | 2026-07-30 |
| First local commit created — all M0 files committed to `main` | 2026-07-30 |
| `apps/web` scaffolded — Next.js 16.2.12, App Router, TypeScript (strict), Tailwind CSS 4.3.3 | 2026-07-30 |
| `pnpm install`, `typecheck:web`, `lint:web`, `build:web` all pass | 2026-07-30 |
| Dev server verified at http://localhost:3000 — HTTP 200, title "MyPetMart", no console errors | 2026-07-30 |
| Design-token implementation completed — semantic CSS custom properties + Tailwind v4 `@theme inline` in `globals.css`, token IDs traceable to `DESIGN_SYSTEM.md` §3–6 | 2026-07-30 |
| Global visual foundation completed — base styles, reduced-motion support, shared component classes (`.site-container`, `.section-block`, `.eyebrow`, `.display-heading`, `.body-copy`, `.button-primary`, `.button-secondary`, `.field-control`, `.warm-card`, `.pill-label`) | 2026-07-30 |
| Temporary fonts wired via `next/font/google`: Fredoka (display), Fraunces italic (accent), Inter (body) — approximate, see D013 | 2026-07-30 |
| Visual foundation preview available at `apps/web/src/app/page.tsx` — not the final homepage | 2026-07-30 |
| Skill-principle scoping recorded — Ponytail/Emil Kowalski/taste-skill application zones aligned in `CLAUDE.md`, `DESIGN_SYSTEM.md` §2, `DECISIONS.md` D014 | 2026-07-30 |
| Shared site shell built — announcement strip, desktop header (logo, centered nav, search/wishlist/account/cart icon cluster), responsive mobile header with slide-open nav panel, newsletter section, footer (contact details, social links, bottom bar) | 2026-07-30 |
| New component directory `apps/web/src/components/` — `site-header`, `primary-nav`, `mobile-nav-panel`, `icon-button`, `announcement-strip`, `newsletter-card`, `site-footer`, `site-logo`, `icons` | 2026-07-30 |
| `typecheck:web`, `lint:web`, `build:web` re-verified clean after shell build; manually checked at 375/768/1440px, keyboard nav, focus-visible, no horizontal overflow, zero console errors | 2026-07-30 |
| Shared storefront shell committed to `main` (`35a5720`) | 2026-07-30 |
| Real Home page built — hero (embedded search, headline, image collage), category grid (asymmetric "Tail-Wagging favourites"), grooming feature story (mint), featured products ("Loved by pet parents"), three-step grooming section (orange, STEP badges), walking essentials (terracotta), "Why My Pet Mart" USP cards, customer-feedback placeholder grid | 2026-07-30 |
| New `apps/web/src/components/home/` directory — `hero-section`, `category-grid`, `featured-products`, `product-card`, `grooming-feature-story`, `grooming-steps-section`, `walking-essentials`, `why-mypetmart`, `customer-feedback`, `image-placeholder`, `home-data` (central typed fixture file) | 2026-07-30 |
| `StarIcon`, `ArrowRightIcon` added to shared `icons.tsx`; `--color-teal-mint-accent` token added to `globals.css` for the "NEW" product badge | 2026-07-30 |
| `typecheck:web`, `lint:web`, `build:web` re-verified clean after Home page build; manually checked at 375/768/1440px, no horizontal overflow, zero console errors (aside from an expected `/shop` prefetch 404 — Shop page not built yet) | 2026-07-30 |
| Home page audited pixel-by-pixel against `project-reference/rendered/ui-home-*` at 375/768/1440px; 4 measurable corrections applied (see below); `typecheck:web`/`lint:web`/`build:web` re-verified clean | 2026-07-30 |
| Product/category fixtures consolidated into `apps/web/src/data/` (`products.ts`, `categories.ts`, `contact-data.ts`); `ProductCard`/`ImagePlaceholder` moved from `components/home/` to shared `components/` so Shop can reuse them | 2026-07-30 |
| Real Shop page built at `/shop` — hero with dynamic product-count card, filter sidebar (search/pet/category functional, price/rating/checkboxes visually present but non-functional per §18), sort control, 8-product grid | 2026-07-30 |
| Real Contact page built at `/contact` — hero, enquiry form (cosmetic no-op submit), contact-info/Instagram column, "Common questions" FAQ (questions only, no answers) | 2026-07-30 |
| `scripts/verify-storefront.sh` created — gates typecheck/lint/build, route existence, required-section presence, forbidden-claim scanning, and blast-radius (no apps/api/prisma/.env changes); validated both positive (exit 0) and negative (exit 1 on injected violation) | 2026-07-30 |
| Full storefront verified in-browser at 375/768/1440px across `/`, `/shop`, `/contact` — HTTP 200, no overflow, no console errors, keyboard focus visible, Shop filtering confirmed functional | 2026-07-30 |
| Full findings recorded in `docs/audits/storefront-loop-digest.md` | 2026-07-30 |
| `apps/api` scaffolded — Express 5.2 + TypeScript (ESM, `nodenext`), app/server separation (`app.ts`/`server.ts`), central config (`config/env.ts`, Node-native `process.loadEnvFile`, no dotenv), error middleware (`HttpError` + central handler, never leaks raw DB errors), `GET /health` | 2026-08-04 |
| Prisma ORM wired under `apps/api/prisma/schema.prisma` — pinned to `prisma`/`@prisma/client` 6.19.2 (not npm `latest` 7.9.1 — see digest); `prisma:validate` and `prisma:generate` both pass | 2026-08-04 |
| `compose.yaml` added at repo root — MySQL 8.4, healthcheck, named persistent volume; structurally validated but never run (Docker not installed on this machine) | 2026-08-04 |
| `.env.example` added at repo root (shared by `compose.yaml` + `apps/api`); no real `.env` created or committed | 2026-08-04 |
| Root scripts added: `dev:api`, `typecheck:api`, `lint:api`, `test:api`, `prisma:validate`, `prisma:generate` — all pass except the DB-dependent portion of `/health` | 2026-08-04 |
| `apps/api` test suite added via Node's built-in test runner (`node --test`, native `fetch`, no supertest) — 2/2 passing, asserts `/health` never leaks the connection string or credentials regardless of DB state | 2026-08-04 |
| `pnpm-workspace.yaml` `allowBuilds` extended for `prisma`/`@prisma/client`/`@prisma/engines` (same pattern as existing `sharp`/`unrs-resolver` entries) — required workspace-wide fix, approved before applying since it was outside the task's original blast radius | 2026-08-04 |
| Full findings recorded in `docs/audits/api-foundation-digest.md` | 2026-08-04 |
| Admin panel frontend built on demo data — all 13 routes (`/admin` dashboard, products list/new/edit, categories, orders list/detail, customers list/detail, returns list/detail, reports, settings); shared shell (sidebar, mobile drawer, breadcrumbs, search, demo-mode banner) and UI primitives (toast, dialog, drawer, data table, pagination, empty/loading/error states) hand-built with no new packages | 2026-08-04 |
| Typed `AdminRepository` + in-memory `mockAdminRepository` under `apps/web/src/data/admin/` — one fixture location, Promise-based, session-only state (no localStorage), designed for a drop-in REST swap later | 2026-08-04 |
| `apps/web/src/app/layout.tsx` updated to route storefront chrome (header/footer) around `/` `/shop` `/contact` only, via new `storefront-chrome.tsx`, so `/admin/*` gets its own shell — the only shared file this task touched; storefront rendering confirmed byte-identical before/after | 2026-08-04 |
| Product/category/order/return demo CRUD flows interactively verified in-browser (not just inspected) — create/edit/delete/bulk-delete products, reorder/deactivate/add categories, update order status + notes, toast on CSV-export attempt; two real bugs found and fixed (invisible mobile-nav-drawer text, focus-restore timing on dialog close) | 2026-08-04 |
| `typecheck:web`, `lint:web`, `build:web` all pass; all 16 routes (13 admin + 3 storefront) return HTTP 200; no horizontal overflow at 375/768/1440px; storefront regression-checked | 2026-08-04 |
| Full findings recorded in `docs/audits/admin-ui-loop-digest.md`; plan recorded in `docs/ADMIN_PANEL_PLAN.md` | 2026-08-04 |
| `/admin` dashboard refined into a filterable commerce analytics view — verified against the live `mypetmart.org` (catalogue, shipping policy, refund policy, official social links) before implementation; deterministic 90-day `CommerceEvent` dataset (`apps/web/src/data/admin/dashboard-fixtures.ts`) and pure aggregation engine (`dashboard-analytics.ts`) added, kept fully separate from the existing Product/Order/Customer fixtures | 2026-08-04 |
| Global filters (date preset/custom range, compare-to-previous-period, product, order status, state, traffic source) plus all 12 dashboard sections (commerce summary, sales/orders/units trend, conversion funnel, product performance, product-interest tracking with a labelled wishlist-inactive notice, order-status donut with click-to-filter, shipping & fulfilment, India location performance, customer overview, returns & service issues, traffic sources, deterministic business insights) built with no new packages — charts are hand-built SVG/CSS | 2026-08-04 |
| One real bug found and fixed during interactive verification — duplicate React keys in the location ranked-list (state used as key when multiple cities share a state); fixed by separating the list's React key from its filter value | 2026-08-04 |
| `scripts/verify-admin-dashboard.sh` added — gates typecheck/lint/build, required-module presence, forbidden out-of-scope features, live-wishlist-claim scanning, and blast-radius/dependency guards scoped by file mtime against the prior task's digest (git status alone can't distinguish this task's edits from earlier uncommitted work in the same session) | 2026-08-04 |
| Full findings recorded in `docs/audits/admin-dashboard-refinement-digest.md` — all filters (individually and combined), funnel/location/traffic-source math, custom date range, empty state, keyboard focus and 375/768/1440px layouts interactively verified; Reports page (shares `bar-chart.tsx`/`status-overview.tsx` with the old dashboard) and all 3 storefront pages regression-checked with zero console errors | 2026-08-04 |
| Product/Category admin management refined — data layer extended with `PetType`, multi-image `ProductImage[]` (replacing the single imageLabel/tone pair), SKU, tags, featured flag, meta title/description, and category description/petType/derived productCount; all 14 fixture products and 6 categories migrated to the new shape without touching `dashboard-fixtures.ts` (which only reads id/price, confirmed unaffected) | 2026-08-04 |
| Products list rebuilt — 5 summary stat cards (total/active/draft/archived/out-of-stock), category/pet-type/status/stock-level filters, a Newest/Name/Price/Stock sort dropdown alongside existing column-header sorting, active-filter chips, bulk activate/deactivate/archive (added to existing bulk delete), per-row duplicate action | 2026-08-04 |
| Product editor rebuilt — sectioned layout (basic info, pricing/inventory, variants, SEO, images), multi-image manager (add/remove/reorder/set-primary/alt text, "Storage integration required" notice), tag chips, SEO meta fields with a live search-result preview, sticky save-draft/publish footer, unsaved-changes dirty tracking with a `beforeunload` guard and cancel-discard confirmation, duplicate-as-new-draft action (unique id/slug/SKU) | 2026-08-04 |
| Categories refined — description/pet-type fields, live product-count per category, delete action that blocks and suggests deactivation when products are assigned (with a one-click "Deactivate instead" shortcut), reorder/edit/activate flows unchanged and re-verified | 2026-08-04 |
| `scripts/verify-admin-products.sh` added — same build-gate/blast-radius/dependency-guard pattern as the dashboard verifier, scoped against `admin-dashboard-refinement-digest.md`'s mtime | 2026-08-04 |
| Full findings recorded in `docs/audits/admin-products-refinement-digest.md` — search/filter/sort/pagination combinations, bulk actions, create→edit→duplicate→delete chain, image manager, validation, unsaved-changes warning, category CRUD/reorder/delete-prevention all interactively verified; `/admin` dashboard and `/admin/orders` regression-checked with zero console errors | 2026-08-04 |
| Orders & Fulfilment admin management refined — `OrderStatus` extended from 5 to 7 values (added `confirmed`, `return_requested`); new independent `FulfilmentStatus` (unfulfilled→processing→packed→shipped→delivered) and extended `PaymentStatus` (added `failed`) state machines; `order-status-rules.ts` added as the single source of truth for legal transitions, enforced both client-side (only valid options ever offered) and server-side in `mock-repository.ts` (rejects illegal transitions regardless of what the client sends) | 2026-08-04 |
| Orders list rebuilt — 7 summary stat cards, phone/email-aware search, payment/fulfilment/product/state filters, Newest/Oldest/Highest/Lowest-value sort, active-filter chips, per-row inline status update + quick note, bulk confirm/processing/shipped (each confirmed, each reporting updated-vs-skipped-as-ineligible counts) | 2026-08-04 |
| Order detail rebuilt — items now show SKU/variant, structured city/state address, editable shipping method/carrier/tracking-number demo fields, independently editable fulfilment and payment status (both validated, both timeline-logged), order-status control restricted to legal next states with confirmation on cancel/return-request, a return-request-linked banner (new `getReturnsForOrder` method), and "Email/SMS customer" buttons that honestly show an "integration required" toast | 2026-08-04 |
| One real bug found and fixed during interactive verification — a new `return_requested` fixture order's timeline entry was timestamped *before* its "Delivered" entry (logically impossible); fixed by deriving the return-requested timestamp from the delivered entry's own offset | 2026-08-04 |
| `scripts/verify-admin-orders.sh` added — same build-gate/blast-radius/dependency-guard pattern as the two prior verifiers, scoped against `admin-products-refinement-digest.md`'s mtime; also greps for payment-gateway SDK usage, live courier API calls, and fake email/SMS/refund success claims | 2026-08-04 |
| Full findings recorded in `docs/audits/admin-orders-refinement-digest.md` — combined filters, bulk-action skip/update reporting, invalid-transition rejection (verified via a deliberate client-side bypass), fulfilment/payment/tracking edits, timeline ordering, return-request linking, and cross-route consistency (`/admin/customers/[id]`) all interactively verified; dashboard, returns, reports and all 3 storefront pages regression-checked with zero console errors | 2026-08-04 |

---

## Home page visual audit (2026-07-30)

Full pixel-comparison pass against `project-reference/rendered/ui-home-*` at
375/768/1440px. Four measurable corrections were made:

1. **Hero image collage restructured** (`hero-section.tsx`) — the collage
   used a plain `grid-cols-2` with no explicit rows, so the third tile
   wrapped underneath the first tile instead of stacking beside the second,
   producing an empty gap rather than the reference's asymmetric
   large-photo-left / two-stacked-photos-right composition. Fixed with an
   explicit `grid-rows-2` + `row-span-2` on the first tile, and portrait/
   landscape-appropriate placeholder sizing on the two right-hand tiles.
2. **Grooming-steps heading typography** (`grooming-steps-section.tsx`) —
   the reference splits "Less fur." (italic) and "Happier pets." (bold,
   same line) within the second heading line; the implementation had
   wrapped the whole phrase in the block-level `.accent` italic style.
   Rebuilt as inline mixed-style spans.
3. **STEP badge colours** (`grooming-steps-section.tsx`) — the reference
   shows STEP 1/2/3 pills in three different fills (white, yellow, teal);
   all three were rendering as plain white. Now cycles
   white → `bg-yellow-card` → `bg-teal-mint-accent`.
4. **Walking-essentials image offset** (`walking-essentials.tsx`) — the
   reference offsets the right-hand (puppy) photo downward relative to the
   left-hand (dog) photo; the vertical offset had been applied to the wrong
   tile. Swapped `sm:translate-y-4` to the second tile — confirmed via
   computed `getBoundingClientRect()` (16px offset, matches `translate-y-4`
   at the default root font size).

Everything else audited (category grid asymmetric placement, product-card
aspect ratios/badge stacking order, USP-card colour alternation, feature-
story eyebrow/pill treatment per section, bullet-list column counts,
section-to-section colour rhythm) already matched the reference and needed
no change.

`typecheck:web` / `lint:web` / `build:web` all pass after the corrections;
375px, 768px (via desktop-preset resize) and 1440px re-checked with zero
horizontal overflow and zero unexpected console errors.

---

## Current module

**M4 — Customer-facing pages (Frontend Foundation)**
Status: **In progress** — shared site shell (header, nav, footer, newsletter)
implemented across all pages via `layout.tsx`; Home, Shop and Contact all now
have real content built inside that shell. Only Product Detail remains
unbuilt for M4.

**Known gaps / judgement calls made during the Shop + Contact build (see
`docs/audits/storefront-loop-digest.md` for full detail):**
- Shop's filter sidebar treats Search/Pet/Category as functional ("basic")
  and Max price/Minimum rating/the three checkboxes as visually-present-but-
  inert ("advanced") — CLAUDE.md excludes "advanced filters" without
  defining the line, and `DESIGN_SYSTEM.md` §20 item 9 flags this exact
  ambiguity. Revisit if this split needs adjusting.
- Contact's "Common questions" render the 4 reference questions with no
  answer copy — two touch unconfirmed claims (COD, pan-India shipping) per
  §18; write real answers once `OI-003`/`OI-004`/`OI-012` are resolved.
- Contact form has no backend (M3/M5 unbuilt) — submission is a cosmetic
  `preventDefault` no-op, matching the existing newsletter/hero-search
  pattern.
- Shop hero's "Handpicked, quality-checked." softens the reference's
  "Handpicked, honestly reviewed." to avoid any customer-review-claim
  ambiguity — confirm the substitution reads correctly.
- All Shop product and hero imagery is a placeholder (no licensed
  photography); "Rating coming soon" replaces the reference's fabricated
  star numbers; "LOW STOCK" badge omitted entirely (no real inventory).

**Known gaps / judgement calls made during the Home page build:**
- No licensed product/pet photography is available yet. Every image slot
  (hero collage, category cards, feature-story photos, product images,
  walking-essentials photos) renders as an accessible, clearly-labelled
  colour-block placeholder (`components/home/image-placeholder.tsx`) sized to
  the reference's aspect ratio and radius — not a fabricated photo. Swap for
  real photography once available.
- The Home reference's "Premium grooming. Less fur. Happier pets." feature
  story appears twice in the render (§13/§20 item 1) — a compact mint version
  and a fuller orange version with STEP 1/2/3 badges. Built as **two**
  sections in sequence, matching the reference's literal capture order,
  rather than collapsing them — no live-site access was available to confirm
  which is the intentional single version.
- Star ratings and review counts on product cards render as a "Rating coming
  soon" placeholder — no real rating data exists yet, and CLAUDE.md's
  unconfirmed-claims list explicitly names "customer ratings." The row's
  vertical space is preserved per `DESIGN_SYSTEM.md` §18.
- "LOW STOCK" badges from the reference are omitted entirely (no real
  inventory data exists).
- The reference's 3 hero trust pills (verified reviews, Cash on Delivery,
  shipping across India) are all unconfirmed claims — omitted; no partial
  row remained worth preserving once all three were removed.
- The "Little things, done well" USP row keeps its 4-card layout but 3 of 4
  reference cards (Verified reviews / Cash on Delivery / Ships across India)
  were unconfirmed claims. Replaced with neutral, true copy ("Small-batch
  curation," "Easy to reach us," "Built with care") rather than collapsing
  to a 1-card row, per the task's "keep unsupported claims neutral"
  instruction.
- The "Real pet parents. Real happy tails." review grid has no real
  testimonials yet (no auth/orders exist to source them from). Built as an
  honest "coming soon" placeholder grid that preserves the reference's
  varied-colour card rhythm — no fabricated quotes, names, star ratings or
  "VERIFIED" badges, per `DESIGN_SYSTEM.md` §18 and CLAUDE.md's no-fake-
  reviews rule.
- Decorative micro-details from the reference (sparkles, paw prints, dashed
  connector lines, blob shapes, the arch behind the hero cat photo) were
  simplified or omitted to keep the build scoped to structure/composition —
  section order, colour blocking, spacing and typography hierarchy match;
  the ambient decoration does not.
- Product names/prices reuse the locked reference's own fixture content
  (e.g. "Mist-Powered Pet Grooming Brush," ₹899/₹1,499) as temporary catalog
  data pending the real Product API (M3) — not a live/authoritative price.

**Known gaps carried over from the shell build (still open):**
- The header's trailing dark pill is ambiguous in the reference (§20 item 2 —
  cart vs. menu, inconsistent between Home and Shop/Contact). Implemented as a
  cart icon on desktop; the hamburger/mobile-nav toggle only appears at
  mobile/tablet widths. Revisit if a live-site reference becomes available.
- Search, wishlist, account and cart header icons are present but
  intentionally non-functional (no onClick) — consistent with the wishlist
  treatment already specified in `DESIGN_SYSTEM.md` §18 — since auth (M2),
  product search (M4/Shop), and cart (M5) do not exist yet. The Home hero's
  embedded search input (§7) is likewise a cosmetic no-op (`preventDefault`),
  matching the newsletter form's existing pattern, pending the Shop page's
  real search/filtering.
- Nav links to `/shop` and `/contact` point at routes that don't exist yet
  (will 404 until those pages are built) — expected at this stage of M4.
- Footer "Cash on Delivery" payment claim omitted per D010/§18; the payments
  row itself is preserved.
- Logo mark is an inline-SVG reinterpretation of the reference dog+cat heart
  icon, not a pixel trace (no source vector asset available).
- One new colour value was pixel-sampled and used for the logo wordmark navy
  (`--color-logo-navy: #0B1F49` in `globals.css`) — not yet present in
  `DESIGN_SYSTEM.md` §3. Needs a documentation-only follow-up task to
  formally add it to the token table (this task's scope only allowed
  updating `docs/STATUS.md`).

Next task: build the Product Detail page — the only remaining M4 page. Shop
and Contact are both now built and verified (`docs/audits/storefront-loop-digest.md`).

---

## M7 — Admin dashboard + product management (2026-08-04)

Status: **Frontend complete on demo data.** All 13 routes built, shared
shell + UI primitives hand-built (no new packages), typed `AdminRepository`
+ in-memory mock implementation under `apps/web/src/data/admin/`. Full
details, interaction test results and the two bugs found+fixed during
verification are in `docs/audits/admin-ui-loop-digest.md`; the
information-architecture plan is in `docs/ADMIN_PANEL_PLAN.md`.

**Explicitly not done yet (out of this task's scope):**
- No authentication — the admin panel is reachable at `/admin` with no
  login gate. Settings' "Admin users" section says so explicitly. Needs M2
  (JWT auth) before this is real.
- No real backend — every read/write goes through `mockAdminRepository`,
  an in-memory singleton that resets on a hard page reload. Swapping in a
  `RestAdminRepository` against `apps/api` is future work; the interface
  is already shaped for it.
- No real product images — the Products form's image panel is explicit
  that this needs Cloudflare R2 (M3, OI-007).
- Payment gateway, shipping partner, CSV export, analytics — all visually
  present as clearly labelled "Integration required" placeholders, not
  silently faked.

**Known judgement calls:**
- Category reorder uses move-up/move-down buttons, not drag-and-drop
  (keyboard-accessible by construction; avoids needing a DnD library under
  the "install no packages" constraint).
- `apps/web/src/app/layout.tsx` was modified — the only shared/root file
  this task touched, needed so `/admin/*` doesn't inherit the storefront's
  header/footer/newsletter. `/`, `/shop`, `/contact` confirmed to render
  identically to before.

**2026-08-04 refinement — `/admin` dashboard only:** the dashboard route was
rebuilt into a filterable, India-focused commerce analytics view powered by
a new deterministic 90-day event dataset, verified against the live
`mypetmart.org` site first. Full details in
`docs/audits/admin-dashboard-refinement-digest.md`. Products, Categories,
Orders, Customers, Returns and Settings were not redesigned — only the
dashboard route and its own data/component files changed. One notable
judgement call: the dashboard's "Recent orders" table is drawn from the new
event dataset (`EVT-###` order numbers), a separate analytics rollup from
the small `Order[]` fixture `/admin/orders` uses — the same
analytics-vs-management-detail split most real commerce platforms have, not
an oversight.

---

## Deferred (not blocking frontend)

**M1 — Database schema + Prisma migrations**
Pre-requisites:
- MySQL 8.4 available (OI-008 — updated: `compose.yaml` is ready, blocked
  only on Docker being installed — see Blockers)
- `apps/api` scaffolded with Prisma initialised — **done** (2026-08-04,
  `docs/audits/api-foundation-digest.md`); schema has no models yet, that's
  M1's actual work

Prisma tooling (`prisma:validate`/`prisma:generate`) is live and passing.
Actual schema design + migrations remain deferred until Docker is available
to verify against a real database. Does not block M4.

**M3 — Product API + R2 image upload**
Pre-requisites:
- Cloudflare R2 credentials (OI-007 — unresolved)
- `apps/api` scaffolded — **done** (2026-08-04)

---

## Blockers

| ID | Blocker | Affects |
|----|---------|---------|
| OI-008 | MySQL 8.4 not installed locally, no host selected — **updated 2026-08-04**: `compose.yaml` is ready and structurally validated; the actual blocker now is Docker/Docker Compose not being installed on this machine at all (not just the container). `docker compose up -d` once Docker exists should unblock this immediately. | M1 |
| OI-001 | Payment gateway not selected | M5 |
| OI-002 | Shipping provider not selected | M5 |
| OI-007 | Cloudflare R2 credentials not available | M3 |
| OI-005 | Verified reviews claim — scope conflict with UI references | Product detail |

See `docs/OPEN_ITEMS.md` for the full dependency list.

---

## Known risks

- No remote git host configured yet (GitHub/GitLab). Remote must be set up
  before team collaboration or CI can begin.
- fnm shell hook lives in `~/.zshrc` (interactive zsh only). Non-interactive
  shells (CI, `.claude/launch.json`) must use the absolute pnpm binary path
  under the fnm Node 24 installation, or explicitly run
  `eval "$(fnm env --shell bash)"` before any Node/pnpm commands.
- The dev server launched via `.claude/launch.json` runs under the system
  Node 26.5.0 (pnpm binary is at the correct fnm path, but node itself
  resolves to system version in that launch context). Functional for
  development; pnpm emits an engines warning. Use the interactive zsh terminal
  with fnm activated for production builds and CI.

## Unresolved visual uncertainties (see `docs/DESIGN_SYSTEM.md` §20 for full detail)

- **Exact font families are unconfirmed** — not extractable from a
  rasterised PDF. Implemented in code as of this pass: Fredoka (display),
  Fraunces italic (accent), Inter (body) via `next/font/google` — see
  `docs/DECISIONS.md` D013. These are placeholders, not confirmed matches;
  swap immediately if a higher-fidelity source becomes available.
- **Several colour tokens are approximate, not exact**: `color-text-primary`,
  `color-teal-mint-accent`, `color-sale-badge` — 8 other tokens were
  pixel-sampled and are exact (`docs/DESIGN_SYSTEM.md` §3). Two further
  tokens were *derived* (not sampled) for this implementation pass:
  `color-text-muted` and `color-border-subtle` (`color-mix()` off existing
  tokens — no new hex invented, see D013). `color-state-success` has no
  locked value at all and currently aliases `color-mint-sage` as a
  placeholder.
- **Exact layout measurements are proportional estimates**, not measured CSS
  values (max-width, gutters, header height, button/input height, card radii).
  These estimates are now encoded as CSS custom properties in
  `apps/web/src/app/globals.css` — still approximate, easy to correct
  centrally once real measurements are available.
- **The Home page appears to show the "Premium grooming" feature story
  twice**, in two different visual treatments — most likely a scroll-pinned
  animation artifact from the PDF capture tool, not an intentional duplicate
  section. Needs live-site confirmation before M4 build.
- **Header trailing control is inconsistent between references** — Shop/
  Contact show a black pill (likely cart), Home shows a hamburger/menu icon
  in the same slot.
- **No tablet or mobile reference exists** — all three PDFs are desktop-only
  captures; responsive behaviour in `DESIGN_SYSTEM.md` §15 is inherited
  convention, not extracted fact.
