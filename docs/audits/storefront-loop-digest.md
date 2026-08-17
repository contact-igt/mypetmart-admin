# Storefront build/verify loop — digest

Date: 2026-07-30
Scope: Home audit-and-fix, Shop build, Contact build, `scripts/verify-storefront.sh`.

---

## Iterations completed

**1 of 4 allotted.** Everything below — Home audit, Shop build, Contact build,
verifier authored and green, full 3×3 browser matrix — completed inside the
first implementation pass. No re-implementation cycle was needed; the only
retries were environmental (dev-server cache recovery, described below), not
functional fixes to application code.

---

## Files changed

**New — data (shared fixtures):**
- `apps/web/src/data/products.ts` — single 8-product catalog (was duplicated
  across Home's `home-data.ts`); `featured: boolean` flag drives Home's
  3-product subset, Shop shows all 8.
- `apps/web/src/data/categories.ts` — moved `CATEGORIES`/`CATEGORY_PROMO_TEXT`
  out of `home-data.ts` so Shop's CATEGORY filter reuses the same list.
- `apps/web/src/data/contact-data.ts` — `CONTACT_INFO`, `ENQUIRY_TYPES`,
  `FAQ_QUESTIONS` (questions only, no answer copy — see Human-review below).

**New — shared components:**
- `apps/web/src/components/image-placeholder.tsx` (moved from `components/home/`)
- `apps/web/src/components/product-card.tsx` (moved from `components/home/`)

**New — Shop:**
- `apps/web/src/app/shop/page.tsx`
- `apps/web/src/components/shop/shop-hero.tsx`
- `apps/web/src/components/shop/shop-explorer.tsx` (client — search/pet/category
  filters + sort, functional; price/rating/checkbox facets present but inert)

**New — Contact:**
- `apps/web/src/app/contact/page.tsx`
- `apps/web/src/components/contact/contact-hero.tsx`
- `apps/web/src/components/contact/contact-form-section.tsx` (client — form is
  a cosmetic no-op submit, same pattern as the existing newsletter/hero-search
  forms; no backend exists yet)
- `apps/web/src/components/contact/common-questions.tsx`

**New — tooling:**
- `scripts/verify-storefront.sh`

**Modified:**
- `apps/web/src/components/home/home-data.ts` — re-exports products/categories
  from `data/` instead of duplicating them; Home-only content (grooming
  bullets, steps, USP cards) stayed in place.
- `apps/web/src/components/home/{hero-section,category-grid,grooming-feature-story,grooming-steps-section,walking-essentials}.tsx` —
  import path updated from `./image-placeholder` to `@/components/image-placeholder`.
- `apps/web/src/components/home/featured-products.tsx` — import path updated
  from `./product-card` to `@/components/product-card`.
- `apps/web/src/components/home/hero-section.tsx` — hero image collage
  restructured to a proper asymmetric grid (see Home audit below).
- `apps/web/src/components/home/grooming-steps-section.tsx` — heading
  typography split + STEP badge colour cycle (see Home audit below).
- `apps/web/src/components/home/walking-essentials.tsx` — image offset moved
  to the correct tile (see Home audit below).
- `docs/STATUS.md` — updated (this task's completion + prior Home-audit entry).

**Deleted:**
- `apps/web/src/components/home/image-placeholder.tsx` (moved to shared)
- `apps/web/src/components/home/product-card.tsx` (moved to shared)

No files were touched under `apps/api/`, `prisma/`, or any `.env*` path.

---

## Verifier results

`scripts/verify-storefront.sh` — **exit 0**, all checks pass:

```
Build gates       — typecheck:web / lint:web / build:web        OK / OK / OK
Routes            — /, /shop, /contact page.tsx present          OK
Required sections — 8 Home + 2 Shop + 3 Contact components wired OK
Forbidden claims  — LOW STOCK / verified / COD / pan-India /
                     fixed delivery days / fake star ratings      none found
Blast-radius      — no apps/api, prisma, or .env changes          OK
```

The forbidden-claims check was validated negatively: a temporary file
containing `"Cash on Delivery is available on all orders. LOW STOCK"` was
added, confirmed the script caught both violations and exited 1, then
removed — restoring the clean exit-0 state before this digest was written.

**One environmental gotcha, not a code defect:** running `pnpm build:web`
while the Claude Browser preview's `next dev` server is live against the
same `apps/web/.next` directory produces a `.next/types/*.d 2.ts` duplicate-
definition TypeScript error (`TS6200`/`TS2300`) purely from the two processes
racing to write the same generated-types directory. The verifier is correct
in isolation (confirmed via a clean `rm -rf .next` + standalone run); this
only surfaces when a dev server and `next build` share one `.next` folder
concurrently, which a real CI run would never do. Documented previously in
`docs/STATUS.md`'s "Known risks" section from the earlier shell-build task.

---

## Route and breakpoint results

| Route | 375px | 768px | 1440px | HTTP | Console |
|---|---|---|---|---|---|
| `/` | no overflow | no overflow | no overflow | 200 | clean |
| `/shop` | no overflow | no overflow | no overflow | 200 | clean |
| `/contact` | no overflow | no overflow | no overflow | 200 | clean |

- **Navigation links:** verified functional — confirmed via `elementFromPoint`
  (correct element, unobstructed) and a real `.click()` dispatch (navigates
  correctly, active-page underline updates). The Browser pane's synthetic
  mouse-coordinate clicks intermittently failed to trigger Next.js `<Link>`
  client-side navigation in this session (a tooling quirk of the preview
  pane, reproduced twice) — noted under Human-review below, not a page bug.
- **Keyboard focus:** confirmed visible — Tab-focused the Shop search input,
  computed style showed `outline: 2px solid rgb(53, 34, 27)` (the shared
  `:focus-visible` rule in `globals.css`, inherited by every new page with no
  extra CSS needed).
- **Shop filtering:** confirmed functional in the live UI — typing "grooming"
  in search + activating the Grooming category pill compounded correctly to
  "1 product"; Clear filters reset both.

---

## Home sections completed (audit pass)

Full pixel-comparison against `project-reference/rendered/ui-home-*`. Three
corrections applied on top of the previously-completed Home build:

1. **Hero image collage** (`hero-section.tsx`) — was a plain `grid-cols-2`
   with no row template, so the third tile wrapped under the first instead
   of stacking beside the second. Rebuilt with `grid-rows-2` + `row-span-2`
   on the first tile — now correctly shows one large photo spanning full
   height on the left with two stacked tiles on the right, matching the
   reference's asymmetric composition.
2. **Grooming-steps heading** (`grooming-steps-section.tsx`) — reference
   splits "Less fur." (italic) and "Happier pets." (bold) on the same line;
   was rendering the whole phrase in the block-level all-italic `.accent`
   style. Rebuilt as inline mixed-style spans.
3. **STEP badge colours** (`grooming-steps-section.tsx`) — reference shows
   STEP 1/2/3 in three different fills (white/yellow/teal); all three were
   rendering white. Now cycles `bg-white` → `bg-yellow-card` →
   `bg-teal-mint-accent`.
4. **Walking-essentials image offset** (`walking-essentials.tsx`) — the
   vertical offset (`sm:translate-y-4`) was on the left tile; reference
   offsets the right (puppy) tile downward. Swapped — confirmed via
   `getBoundingClientRect()` (16px offset on the correct tile).

Everything else audited (category-grid asymmetric placement, product-card
aspect ratios/badge order, USP-card colour alternation, per-section eyebrow
treatment, bullet-list column counts, section-to-section colour rhythm)
already matched and needed no change.

---

## Shop sections completed

- Hero: "THE SHOP" pill, "Everything they need to *wag, purr and play.*"
  heading, image placeholder with an overlapping "Showing 8 products /
  Handpicked, quality-checked." card (count computed from `PRODUCTS.length`,
  not hardcoded).
- Filters sidebar: Search (functional, substring match) · Pet (functional,
  Dogs/Cats/All) · Category (functional, reuses Home's `CATEGORIES` +
  "New Arrivals") · Max price slider, Minimum rating pills, and the three
  checkboxes (present, visually composed, `disabled` — see scope note below)
  · Clear filters (resets all state).
- Sort control: Featured / Price low-high / Price high-low, functional.
- Product grid: all 8 fixture products via the shared `ProductCard`, same
  NEW/discount badge stack and "Rating coming soon" treatment as Home.
- Empty state when a filter combination matches nothing.

## Contact sections completed

- Hero: "CONTACT" pill, "We're all ears. *Even the floppy ones.*" heading,
  body copy, image placeholder.
- Form: Name/Email (required) · Phone (optional) · Enquiry type (select) ·
  Order number (optional) · Message (required) · consent checkbox (required)
  · Send message button — submission is a `preventDefault` no-op, matching
  the existing newsletter/hero-search cosmetic-form pattern (no backend
  exists yet).
- Info column: "Say hi / We love pet mail." image banner, phone/email/address
  card (icons reused from the shared icon set), "Follow the pack" Instagram
  card.
- Common questions: the 4 reference questions, **no answer copy** — two of
  the four touch unconfirmed claims (COD, pan-India shipping) per
  `docs/DESIGN_SYSTEM.md` §18, so only the question text renders.

---

## Remaining visual differences per page

**Home** — all previously documented and unchanged by this pass: placeholder
imagery throughout, honest "coming soon" reviews/ratings, omitted
COD/pan-India/verified-review claims, simplified decorative micro-details,
and the dual grooming-story sections preserved per the reference's literal
capture order (§13 ambiguity, still unresolved pending live-site access).

**Shop** — placeholder imagery for all 8 products and the hero photo (no
licensed photography); "Rating coming soon" instead of the reference's
fabricated star numbers; "LOW STOCK" badge omitted entirely (no real
inventory data); Max price / Minimum rating / the three checkboxes are
visually present but non-functional (see Human-review below — a scope
interpretation, not an oversight).

**Contact** — placeholder imagery for the hero and "We love pet mail." banner;
FAQ renders questions only, no answers (two of the four touch unconfirmed
claims); form has no backend, submission is cosmetic.

---

## Items requiring human judgment

1. **"Basic" vs. "advanced" Shop filters.** CLAUDE.md excludes "advanced
   filters" without defining the line, and `DESIGN_SYSTEM.md` §20 item 9
   flags this ambiguity explicitly. This pass treated Search, Pet, and
   Category as functional ("basic") and Max price, Minimum rating, and the
   three checkboxes as visually-present-but-inert ("advanced"), since rating
   filtering also doubles as an unconfirmed-claim (star ratings) concern.
   Confirm this split is correct before treating Shop filtering as final.
2. **Dual grooming-story section on Home** (`docs/DESIGN_SYSTEM.md` §13/§20
   item 1) — still unresolved from the original Home build; this task's
   audit did not have live-site access to confirm whether it's an
   intentional two-section design or a PDF-capture artifact of a
   scroll-pinned animation.
3. **Contact FAQ answers** — currently show questions only. Once COD,
   pan-India shipping, and delivery-time policy are confirmed (`OI-003`,
   `OI-004`, `OI-012` in `docs/OPEN_ITEMS.md`), the four answers can be
   written in.
4. **Browser-pane click-simulation quirk.** In this session, the preview
   pane's synthetic mouse-coordinate clicks intermittently failed to trigger
   Next.js `<Link>` navigation (reproduced twice, on both Shop→Contact and
   Contact→Home), while `elementFromPoint` confirmed correct, unobstructed
   targeting and a real `.click()` dispatch always navigated correctly. This
   reads as a tooling limitation of the verification environment, not an
   application bug — worth a second opinion if it recurs during a future
   session's browser verification.
5. **"Handpicked, quality-checked."** replaces the reference's "Handpicked,
   honestly reviewed." on the Shop hero card — "reviewed" could be read as a
   customer-review claim, so it was softened. Confirm the substitute copy is
   acceptable.

---

## Final status: **PASS**

All build gates green, all three routes render correctly at 375/768/1440px
with no overflow and no console errors, the verifier script is authored and
returns exit 0 (validated both positively and negatively), and the blast
radius stayed within the allowed paths. Nothing was committed or pushed.
