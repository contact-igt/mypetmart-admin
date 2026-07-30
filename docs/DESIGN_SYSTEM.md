# MyPetMart — Design System

Last updated: 2026-07-30
Extraction method: pixel-level inspection of `project-reference/rendered/*.jpg`
(rendered at 120 DPI from the locked PDFs via Poppler), plus direct pixel
colour sampling from the source PDFs via `pdftoppm` crops.

---

## 1. Visual source-of-truth statement

`project-reference/UI_HOME.pdf`, `UI_SHOP.pdf` and `UI_CONTACT.pdf.pdf` are
the **locked visual source of truth** for MyPetMart's customer-facing design.
They may not be redesigned, modernised, simplified or reinterpreted.

Precedence order for this project:
1. **Final Proposal PDF** — controls functional scope (what gets built).
2. **UI_HOME / UI_SHOP / UI_CONTACT** — control visual design (how it looks).
3. **This document** — the extracted, implementation-ready translation of #2.
4. **CLAUDE.md** — concise implementation rules referencing this document.

Where the proposal excludes a feature that is visually present in the
references (see §18), the surrounding layout, spacing and visual rhythm must
be preserved — remove the feature, not the composition around it.

All three reference pages were captured from a live preview
(`happy-tails-build.preview.emergentagent.com`) via the `html.to.design`
Figma plugin. Each PDF is a single very tall page representing the full
scrolled desktop viewport at approximately 2200pt wide.

---

## 2. Design principles

- **Warm, playful, premium** — rounded display type, warm orange/peach/cream
  palette, soft illustrated pet photography, never clinical or discount-y.
- **Desktop-dense, not sparse** — generous but not excessive whitespace;
  multiple content sections visible per scroll (VISUAL_DENSITY=6).
- **Editorial storytelling** — "Feature Story" sections pair a product photo
  with a headline in mixed serif/script display type, similar to a modern
  DTC brand landing page, not a generic template grid.
- **Consistent card language** — every content type (product, review,
  category, USP) uses the same rounded-card + colour-block vocabulary.
- **Trust signals woven into layout, not bolted on** — badges, verified
  marks and payment icons are part of the compositional rhythm (hero pills,
  footer bar), not isolated banners.

Taste-skill dials: DESIGN_VARIANCE=5 · MOTION_INTENSITY=3 · VISUAL_DENSITY=6

---

## 3. Colour tokens

All values below were sampled directly from rendered pixels using
`pdftoppm` crops converted to BMP and read byte-for-byte. Each is labelled
**EXACT** (directly measured, reproducible) or **APPROXIMATE** (estimated
from visual inspection, not pixel-sampled).

| Token | Hex | Certainty | Where it appears |
|-------|-----|-----------|-------------------|
| `color-cream-bg` | `#FFF5E9` | EXACT | Primary page background across all three pages (body background behind sections) |
| `color-peach-hero` | `#F6D3A9` | EXACT | Contact page hero block background; Shop hero block background; Shop product-card price/footer band |
| `color-orange-hero` | `#ECA469` | EXACT | Home page hero background (more saturated than the peach used on Shop/Contact heroes) |
| `color-primary-orange` | `#D65E2A` | EXACT | Primary CTA buttons ("Send message", "Shop Bestsellers", "Meet the Grooming Brush") |
| `color-terracotta` | `#BB5036` | EXACT | "Two happy dogs" feature section background; some review-card backgrounds |
| `color-mint-sage` | `#D4ECD6` | EXACT | "Premium grooming" (compact) feature-story section background |
| `color-deep-brown` | `#35221B` | EXACT | Footer background; dark text on light backgrounds appears close to this tone |
| `color-yellow-card` | `#FFD96A` | EXACT | "Follow the pack" card (Contact); "WHY MY PET MART" eyebrow pill fill; one review card background |
| `color-white` | `#FFFFFF` | EXACT | Form input backgrounds, some product/review card surfaces |
| `color-text-primary` | `#2B1B14` (approx.) | APPROXIMATE | Body copy and headings — very dark warm brown, close to but not identical to `color-deep-brown`; not independently sampled from glyph pixels |
| `color-teal-mint-accent` | `#7FE0C8` (approx.) | APPROXIMATE | "MEOW" badge pill, decorative blob shape top-right of Home hero, "TAIL-WAGGING FAVOURITES" eyebrow pill — a brighter teal/mint than the sage-green section background; not pixel-sampled |
| `color-success-stock` | not observed as a distinct colour | — | "LOW STOCK" badge uses the same warm-yellow family as `color-yellow-card`; no separate green "in stock" indicator was observed in any card |
| `color-sale-badge` | `#BB5036` family (approx.) | APPROXIMATE | Percentage-off badges (`-31%`, `-40%`, etc.) appear to reuse the terracotta/red family; not independently sampled — verify against `color-terracotta` before using as the same token |

**Rule:** do not invent additional hex values beyond this table. If a new
colour is needed during implementation, sample it from the rendered
reference using the same method (or request a fresh visual audit) rather
than guessing.

---

## 4. Typography roles

**Font family: PENDING.** No font name is embedded/extractable from a
rasterised PDF render. The following is a qualitative description of each
role's visible characteristics, with implementation-safe alternatives.

| Role | Visible characteristics | Closest category | Safe alternatives (pending confirmation) |
|------|--------------------------|-------------------|---------------------------------------------|
| Display heading (hero, section titles) | Extra-bold, rounded terminals, friendly geometric sans with slightly bouncy letterforms (e.g. "Better little things", "Two happy dogs") | Rounded/geometric display sans (font family in the "Fredoka / Baloo 2 / Cabinet Grotesk Bold" character) | `Fredoka` or `Baloo 2` (Google Fonts, similar rounded weight and warmth) |
| Display heading — italic accent | Same sections often pair the bold display line with an elegant italic serif line directly below/inline (e.g. "for happier *pets.*", "*Even the floppy ones.*") | Transitional serif italic, editorial character | `Fraunces` (italic) or `Playfair Display` (italic) |
| Body copy | Regular-weight clean sans, comfortable line height, dark warm-brown on light background | Neutral humanist sans | `Inter` or `Plus Jakarta Sans` |
| Navigation | Regular-weight sans, same family as body copy, small size | Same as body | Same as body copy token |
| Eyebrow / label / badge text | Small, uppercase or small-caps, letter-spaced, sans-serif, often inside a pill | Neutral sans, tracked | Same as body copy token, `letter-spacing: 0.04em`, `text-transform: uppercase` |
| Button label | Semi-bold to bold, sans-serif, white or dark text depending on button fill | Same as display sans at a smaller weight | `Fredoka`/`Baloo 2` at 600 weight, or body sans at 600 weight if display font is too playful for buttons — confirm from live reference |
| Price | Bold numerals paired with a smaller strikethrough original price beside it | Same as body sans, bold | Body sans, 700 weight for the discounted price, 400 weight + strikethrough for original |
| Review quote | Italic serif, matching the display-heading italic accent style | Same as display italic accent | `Fraunces` italic |

**Do not treat any font name above as confirmed.** Use the alternatives only
as a starting implementation choice; swap immediately if the client or a
higher-fidelity source (e.g. a live site inspection or Figma export) provides
the actual font family.

**Hierarchy rule:** one dominant display size per section — do not let two
headings of similar visual weight compete on the same screen. Body copy
never exceeds the eyebrow/label styling in visual prominence.

---

## 5. Spacing rhythm

- Base unit: **4px**.
- Observed spacing scale (multiples of 4): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128px.
- Section vertical padding: large, approximately **96–140px** desktop (measured
  between section background-colour transitions in the renders) — scale down
  proportionally on mobile (suggest 48–64px).
- Card internal padding: approximately **24–32px** (product cards, review
  cards, USP cards).
- Form field vertical gap: approximately **16–20px**.
- Hero content block padding: generous, approximately **64–96px** on all sides
  at desktop width.
- Product grid gap: approximately **24px** between cards, both axes.

All values above are **approximate** — derived from proportional
measurement against the known 3667px render width, not exact pixel
measurement of a live DOM. Treat as a strong starting point; verify against
a live build once implemented.

---

## 6. Layout and breakpoints

- **Desktop render width:** all three reference PDFs were captured at
  2200pt (≈ 3667px at 120 DPI), implying a desktop design width in the
  1400–1600px CSS-pixel range at typical browser DPI. Treat **1440px** as
  the working desktop max content width unless a live inspection says
  otherwise — **APPROXIMATE**.
- **Outer gutters (desktop):** approximately 96–130px each side at full
  render width — **APPROXIMATE**.
- **Tablet / mobile gutters:** not present in the references (desktop-only
  captures). Apply standard responsive gutters — 24px mobile, 40px tablet —
  as a starting point pending a mobile reference.
- **Grid:**
  - Shop product grid: **3 columns** desktop.
  - Home "Loved by pet parents" bestseller row: **3 columns** desktop.
  - Home "Tail-Wagging favourites" category grid: mixed-size grid — one
    large card, one tall "promo" card, one large card in row 1; three
    smaller cards in row 2 (asymmetric, not a uniform grid).
  - Home hero image collage: asymmetric 4-photo grid, not a uniform grid.
  - Contact page: 2-column (form left, info column right) on desktop.
- **Header height:** approximately 95–100px (including logo, nav, icons),
  plus a thin dark announcement strip above it (~15–20px) — **APPROXIMATE**.
- **Announcement strip:** a thin dark-brown bar above the header, content
  not legible at this render resolution — height ~15–20px — **APPROXIMATE,
  content unconfirmed**.
- **Card radii:** consistently rounded, approximately **16–24px** on
  product cards, review cards and category cards; hero image cards use a
  larger radius, approximately **24–32px** — **APPROXIMATE**.
- **Button height:** approximately 48–56px for primary CTA buttons (pill/
  fully-rounded shape) — **APPROXIMATE**.
- **Input height:** approximately 44–48px, rectangular with visible border,
  moderate corner radius (~8–12px) — **APPROXIMATE**.
- **Product image aspect ratio:** approximately **4:5** (portrait) on Shop
  grid cards; Home bestseller cards use a similar portrait ratio.
- **Hero image aspect ratio:** varies by composition; Home/Shop/Contact
  hero photos are landscape-oriented, bleeding to the page edge on the
  right side of a 2-column hero.

---

## 7. Header specification

- **Structure (left → right):** logo mark (dog+cat heart icon in navy +
  orange) + "My Pet Mart" wordmark → centered nav (`Home` · `Shop` ·
  `Contact Us`, active item underlined in orange) → icon cluster (search,
  wishlist/heart, account/person) → a trailing control that is
  **inconsistent across references** — see §20.
- **Background:** cream/off-white (`color-cream-bg`), no visible shadow;
  a thin dark-brown announcement strip sits directly above it.
- **Active nav state:** underline in `color-primary-orange` beneath the
  current page label.
- **Search:** in the header itself only an icon is shown; a full search
  **input field** appears inline inside the Home hero
  ("Search for grooming, leashes, paw care…") — this is a hero-embedded
  search, not a header dropdown. Confirm whether Shop/Contact also get this
  hero search treatment or whether it's Home-only.

---

## 8. Footer specification

- **Background:** `color-deep-brown` (`#35221B`).
- **Structure (top → bottom):**
  1. Newsletter card ("Treats for your inbox.") — overlaps the footer's top
     edge, background `color-primary-orange`-family (lighter/peachier
     variant), rounded card, email input + "Subscribe" button (dark pill).
  2. Main footer row: logo/wordmark + tagline (left) → contact details
     (phone, email, address) (centre) → short descriptive tagline + social
     icons (Instagram, Facebook, Twitter/X in dark circular badges) (right).
  3. Bottom bar: copyright text (left) + "Payments: UPI · Visa · Mastercard
     · Cash on Delivery" (right) — **the COD payment claim is an
     unconfirmed public claim, see §18**.
- All footer text is white/cream on the dark brown background.

**Observation:** the source Home PDF has a large trailing blank cream area
(~4000px+) below the actual footer content — this is empty capture padding
from the source tool, not a design element. Do not implement it.

---

## 9. Buttons

| Variant | Fill | Text | Shape | Usage |
|---------|------|------|-------|-------|
| Primary | `color-primary-orange` solid | White, semi-bold | Fully rounded (pill) | "Send message", "Shop Bestsellers", "Meet the Grooming Brush" |
| Secondary / outline | Transparent, dark border | Dark text | Fully rounded (pill) | "Explore All Products" |
| Dark solid | `color-deep-brown` or near-black solid | White | Fully rounded (pill) | "Subscribe" (newsletter), some feature-story CTAs ("Meet the Dual Leash" on the terracotta section uses a cream pill instead — button colour adapts to section background, not fixed globally) |

- No ghost/link-style buttons observed for primary actions.
- Hover transition: ≤150ms per CLAUDE.md rule (not independently visible in
  a static render — inherited convention).
- Button label typography: see §4.

---

## 10. Inputs

- White background, thin visible border, rounded corners (~8–12px).
- Label sits above the field, small uppercase/tracked style (e.g. "NAME",
  "EMAIL", "PHONE (OPTIONAL)").
- Optional fields explicitly marked "(OPTIONAL)" in the label — preserve
  this convention for any new optional field.
- Textarea (Message field) matches the same border/radius language, taller.
- Checkbox (consent checkbox on Contact form): small, square, accent colour
  fill when checked — standard, not custom-illustrated.
- No visible inline validation state in the static reference — implement
  per CLAUDE.md's "inline form errors" rule when building.

---

## 11. Product cards

- **Image:** top of card, portrait ~4:5 ratio, filling the full card width,
  rounded top corners matching the card radius.
- **Badges (image overlay, top-left, stacked vertically when multiple):**
  - "NEW" — small teal/mint pill.
  - Percentage-off (e.g. "-31%") — small dark-red/terracotta pill.
  - "LOW STOCK" — small yellow pill (stacks below the other two when
    present).
- **Wishlist icon:** heart outline, top-right corner of the image, on a
  white/translucent circular chip.
- **Content band below image:** background `color-peach-hero` (`#F6D3A9`),
  contains:
  - Star rating + review count in parentheses (e.g. "★ 4.8 (214)").
  - Product name (medium weight, dark text).
  - Price row: bold current price + smaller strikethrough original price.
- **Card radius:** ~16–24px, consistent with §6.
- **No visible hover state** in the static reference — implement a subtle
  lift/shadow per CLAUDE.md motion rules (≤150ms, no scroll-jacking).

**Scope-conflict note:** star ratings, review counts and "LOW STOCK" labels
are all visually present but not confirmed in the Final Proposal's scope —
see §18 before implementing as live/functional data.

---

## 12. Category cards

Observed only on Home ("Tail-Wagging favourites" section):
- Asymmetric grid: large photographic cards with a bottom-left text overlay
  (small "FOR X" eyebrow + bold category name, e.g. "FOR SOFTER COATS /
  Grooming"), white text on a photo with a dark gradient scrim at the
  bottom edge.
- One card in the grid is a solid-colour promo card ("Less Fur. More
  Cuddles.") instead of a photo — same card radius and grid slot as the
  photo cards, italic serif display text centred.
- Radius and spacing match the product-card system (§6, §11).

---

## 13. Feature-story sections

Full-bleed colour-block sections pairing a rounded product photo with an
eyebrow ("FEATURE STORY" / category label), a two-line display headline
(bold line + italic accent line), a short body paragraph, a bulleted
benefits list (2-column on wider sections), and a primary CTA button.

**Important — duplicate/inconsistent capture observed:** the "Premium
grooming. Less fur. Happier pets." feature story appears **twice** in the
Home page render, in two different visual treatments:
1. A compact mint-green (`color-mint-sage`) version with a simple bulleted
   list and no step badges.
2. A fuller peach/orange (`color-orange-hero` family) version with
   "STEP 1 · MIST / STEP 2 · BRUSH / STEP 3 · CLICK" badges under the photo.

This is most likely a scroll-pinned/sticky animation section that the
single-page PDF capture tool recorded at two different scroll-progress
states, not an intentional duplicate section in the live design. **Do not
implement both as separate sections without confirming against the live
reference** — see §20.

Section background colours alternate per feature story (mint, peach,
terracotta observed) — preserve this alternation rhythm when building
comparable sections, per the "background-colour alternation" principle.

---

## 14. Review-card visual treatment

Grid of testimonial cards (6 observed on Home) with **varied background
colours** cycling through the palette (cream, peach, yellow, terracotta,
orange) — not a uniform white-card list. Each card contains:
- Star rating (filled stars, dark) + a "VERIFIED" pill badge.
- Italic serif quote text (matches §4 review-quote role).
- Attribution line: "— Name Initial. · with PetName".
- Product name referenced, small text below attribution.

Card sizes vary (masonry-like, not uniform height) — preserve this varied
rhythm rather than forcing a uniform grid.

**Scope-conflict note:** "VERIFIED" review claims are not in the Final
Proposal's scope — see §18.

---

## 15. Responsive behaviour

**No tablet or mobile reference was provided** — all three PDFs are
desktop-only captures. The following are inherited conventions, not
extracted facts:

- Preserve section order exactly; do not reorder content when stacking for
  mobile.
- Category/product grids: 3-col desktop → 2-col tablet → 1-col mobile,
  unless a mobile reference later specifies otherwise.
- Hero: 2-column (text + image) desktop → stacked (text above image)
  mobile, preserving the same content order (eyebrow → headline → body →
  CTAs → trust badges → image).
- Header nav: collapse to a hamburger/menu control on mobile (Home's
  reference already shows a menu-style icon in the header trailing slot on
  desktop — see §20 for the inconsistency this raises).
- Footer: stack newsletter card, then footer columns, then bottom bar,
  full-width on mobile.
- **Mobile must still read as the same brand and composition** — not a
  generic collapsed-accordion redesign. Preserve the warm colour-blocking
  and card language at every breakpoint.

---

## 16. Accessibility adjustments

- Maintain visible keyboard focus on all interactive elements (buttons,
  inputs, nav links, product cards if they're clickable regions).
- Colour contrast: verify `color-text-primary` on every background token in
  §3 meets WCAG AA (4.5:1 body / 3:1 large text) — several background
  tokens are light-to-mid warm tones and may need a darker text token than
  currently assumed on some cards (e.g. text on `color-yellow-card`).
- Do not rely on badge colour alone to convey meaning (e.g. "-31%" red vs
  "NEW" teal) — badge text itself must always be present, not colour-only.
- All product/pet photography needs descriptive `alt` text — none of this
  is derivable from the visual reference; must be authored during build.
- Form fields keep explicit `<label>` elements matching the visible label
  text observed in §10.
- Avoid emoji as UI icons — the reference does not use emoji for icons
  (payment/social icons are proper glyphs), consistent with this rule.

---

## 17. Motion rules

No animation is visible in a static PDF capture. Apply the standing
CLAUDE.md motion rules:
- Hover transitions ≤150ms ease-out.
- Skeleton loaders over spinners for data-dependent content (product grid,
  order history).
- Respect `prefers-reduced-motion: reduce`.
- No animation for animation's sake; no scroll-jacking/pinned sections in
  the rebuild — the suspected pinned "Premium grooming" duplicate (§13) is
  exactly the kind of effect to avoid re-implementing literally.

---

## 18. Out-of-scope feature preservation rules

For each visually-present element not confirmed in the Final Proposal's
scope:

| Element | May remain visually? | Must be non-functional? | Wording must change? | Layout preservation |
|---------|----------------------|--------------------------|------------------------|----------------------|
| Advanced filters (Shop sidebar: PET, CATEGORY, MAX PRICE, MINIMUM RATING, checkboxes) | Yes, as visual sidebar | Basic filtering (category/search) may be functional; advanced facets (rating, price-range, on-sale toggle) should be non-functional or removed per proposal scope — confirm which filters count as "advanced" vs. baseline before deciding | No — labels are generic UI, no factual claim | Keep the sidebar column and spacing; do not collapse it into the product grid even if some filter controls are stubbed |
| Wishlist (heart icon on cards + header icon) | Yes | Yes — non-functional (or hidden) until wishlist is separately approved | No | Keep the icon slot on cards/header to preserve visual rhythm; do not remove the icon and leave a gap |
| Star ratings + review counts on product cards | Yes | Yes — must not display fabricated numbers; either omit the number or source real data once reviews exist | Yes — do not show a specific rating/count unless it is real | Keep the rating row's vertical space in the card layout even if the content is temporarily blank |
| "VERIFIED" review claims / review cards | Yes, structurally, once real reviews exist | Yes until real reviews exist — do not launch with fabricated testimonials | Yes — remove "VERIFIED" badge and specific reviewer claims until real, moderated reviews exist | Preserve the review-grid section and its colour-alternation card rhythm; can launch with fewer real cards, not fake ones |
| "LOW STOCK" labels | Yes, once real inventory exists | Yes until real stock data is wired | No — but only show when true | Keep the badge slot in the card's badge stack |
| Newsletter subscription | Yes | Functional if an email capture + storage mechanism is in scope; otherwise cosmetic-only with a "coming soon" no-op | No | Keep the newsletter card in the footer exactly as composed |
| Cash on Delivery (COD) claims (hero trust badge, footer payment icons, Contact FAQ) | Yes, structurally | Yes until client confirms COD is offered (OI-003) | Yes — remove or hide until confirmed | Keep the trust-badge row and footer payment-icon row layout; drop only the COD chip/icon, don't collapse the row |
| Pan-India shipping claims (hero trust badge, Contact FAQ) | Yes, structurally | Yes until client confirms shipping geography (OI-004) | Yes — remove or hide until confirmed | Same as above — preserve the row, drop only the unconfirmed chip |
| Fixed delivery-time claims ("4–8 business days", Contact FAQ "How long does delivery take?") | Yes, structurally | Yes until an actual SLA is agreed (OI-012) | Yes — do not publish a specific day range until confirmed | Keep the FAQ question; the answer/copy must not assert a specific timeframe until confirmed |

General rule from CLAUDE.md: **when an excluded feature is removed, its
layout slot is preserved** (spacing, card shape, grid position) so the page
doesn't visually collapse or look unfinished — either the element renders
in a disabled/placeholder state, or the surrounding composition absorbs the
space gracefully (e.g. a 4-badge trust row becomes a 2-badge row without
changing the row's padding/alignment).

---

## 19. Visual acceptance checklist

Before marking any customer-facing page "visually complete," verify:

- [ ] Section order matches the reference exactly (no reordering).
- [ ] Colour-block alternation between sections matches the reference
      rhythm (cream → hero-tone → mint/terracotta → cream → footer, etc.).
- [ ] Header: logo + centered nav + icon cluster present; active page
      underlined in `color-primary-orange`.
- [ ] Footer: newsletter card overlapping top edge, 3-column info row,
      bottom bar with copyright + payment icons (COD icon only if
      confirmed, see §18).
- [ ] Product/category/review cards use the correct radius, badge
      placement and colour-band footer per §11–14.
- [ ] Typography hierarchy: one dominant display size per section; italic
      accent line paired with bold display line where the reference shows
      it.
- [ ] All out-of-scope elements handled per the §18 table — not silently
      dropped, not silently faked.
- [ ] No gradient text, no glassmorphism, no emoji-as-icon, no decorative
      animation (CLAUDE.md anti-patterns).
- [ ] 4px spacing rhythm respected; card gaps and section padding fall on
      the scale in §5.
- [ ] Mobile/tablet preserves section order and brand personality — not a
      generic stacked redesign (§15).

---

## 20. Items still uncertain

These require either a live-reference check (the actual
`happy-tails-build.preview.emergentagent.com` site, if still accessible) or
explicit client/developer clarification before final implementation:

1. **Duplicate "Premium grooming" feature story on Home** (§13) — likely a
   scroll-pinned animation artifact from the PDF capture, not an
   intentional double section. Needs live-site confirmation before deciding
   whether to build one section or two.
2. **Header trailing control inconsistency** — Shop and Contact show a
   solid black pill (likely a cart icon/count) in the header's trailing
   slot; Home shows a hamburger/menu icon (☰) in the same slot instead.
   Needs confirmation of the actual intended control (cart vs. menu vs.
   both, responsive-dependent).
3. **Exact font families** (§4) — not extractable from a rasterised PDF;
   proposed alternatives are placeholders only.
4. **Exact hex values for `color-text-primary`, `color-teal-mint-accent`
   and `color-sale-badge`** (§3) — visually estimated, not pixel-sampled;
   sample directly from a live DOM/CSS inspection when available.
5. **Exact layout measurements** (§6) — max-width, gutters, header height,
   button/input height, card radii are all proportional estimates from a
   flattened raster, not measured CSS values.
6. **Mobile and tablet layouts** — no reference provided; all responsive
   guidance in §15 is inherited convention, not extracted fact.
7. **Announcement-strip content** — the thin dark bar above the header is
   visible but its text is not legible at the rendered resolution.
8. **Whether Shop and Contact also get the hero-embedded search input**
   seen on Home, or whether that's Home-only (§7).
9. **Whether "advanced" vs. "baseline" Shop filters** map cleanly onto the
   proposal's "advanced filters" exclusion (§18) — the sidebar shows
   category, search and price/rating filters together with no clear
   proposal-defined boundary between "basic" and "advanced."

None of these block starting M4 frontend work, but each should be resolved
(or explicitly accepted as "best guess, revisit later") before a client
demo.
