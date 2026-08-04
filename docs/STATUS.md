# MyPetMart — Project Status

Last updated: 2026-07-30 (Shop + Contact pages built; Home audit corrections applied; scripts/verify-storefront.sh added)

---

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

## Deferred (not blocking frontend)

**M1 — Database schema + Prisma migrations**
Pre-requisites:
- MySQL 8.4 available (OI-008 — unresolved)
- `apps/api` scaffolded with Prisma initialised

MySQL provisioning and Prisma setup are deferred. They do not block M4.

**M3 — Product API + R2 image upload**
Pre-requisites:
- Cloudflare R2 credentials (OI-007 — unresolved)
- `apps/api` scaffolded

---

## Blockers

| ID | Blocker | Affects |
|----|---------|---------|
| OI-008 | MySQL 8.4 not installed locally, no host selected | M1 |
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
