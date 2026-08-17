# MyPetMart — Locked Decisions

Decisions recorded here are locked. Changes require explicit client or lead
developer sign-off and a new entry below.

---

## 2026-07-30

### D001 — Monorepo with pnpm workspaces
**Decision:** Single git repository with `apps/web`, `apps/api` and
`packages/shared` as pnpm workspace packages.
**Reason:** Simplest structure for a two-app project; shared TypeScript types
and Zod validation schemas can be imported cleanly without publishing to npm.
**Alternative considered:** Separate repositories — rejected because it adds
deployment complexity and breaks type sharing across API and frontend.

### D002 — Next.js 16 App Router (no Pages Router)
**Decision:** Use Next.js 16 with the App Router exclusively.
**Reason:** App Router is the current Next.js standard for new projects; Server
Components reduce client bundle size; layout composition aligns with the
multi-page design.
**Alternative considered:** Pages Router — rejected as legacy path.

### D003 — Express.js 5.2 REST API (no GraphQL, no Next.js route handlers)
**Decision:** Standalone Express server for all API endpoints; REST only.
**Reason:** Clear separation of frontend and backend; Express is well-understood
and fits the project budget; REST is simpler to test and audit than GraphQL for
a CRUD-heavy application.
**Alternative considered:** Next.js API routes / App Router route handlers —
rejected because they would tightly couple frontend and backend deployments.

### D004 — MySQL 8.4 LTS with Prisma ORM
**Decision:** MySQL as the relational database; Prisma as the only database
access layer. No raw SQL except inside explicitly justified Prisma `$queryRaw`.
**Reason:** Relational data model suits products, orders and customers; MySQL
8.4 is an LTS release; Prisma provides type-safe queries and migration tooling.
**Alternative considered:** PostgreSQL — not selected (client environment
preference for MySQL).

### D005 — JWT access tokens + HTTP-only refresh tokens
**Decision:** Short-lived JWT in `Authorization: Bearer` header for access;
long-lived refresh token stored in HTTP-only `Secure` `SameSite=Strict` cookie.
Refresh tokens stored server-side in DB for revocation support.
**Reason:** Follows current security best practices; prevents XSS-based token
theft; enables server-side revocation (logout, account lockout).
**Rule:** Refresh tokens must never be stored in `localStorage` or
`sessionStorage`.

### D006 — Cloudflare R2 for image storage
**Decision:** All product images and site assets served from Cloudflare R2.
Cloudflare Images may be added later only with explicit approval.
**Reason:** R2 has no egress fees; integrates with Cloudflare CDN; avoids
Vercel's bandwidth costs for large binaries.

### D007 — Tailwind CSS for styling
**Decision:** Tailwind CSS utility classes throughout `apps/web`. No CSS-in-JS
library. Global tokens defined in `tailwind.config.ts`.
**Reason:** Minimal bundle, no runtime cost, consistent with Tailwind's broad
Next.js ecosystem support.

### D008 — fnm as local Node version manager
**Decision:** fnm (installed via Homebrew) manages Node versions locally.
Node 24.18.1 pinned via `.nvmrc` and `.node-version` at the repo root.
**Reason:** No nvm, volta, asdf or mise were present on the developer machine;
fnm was the lightest safe option installable via existing Homebrew without
replacing the global Node 26 install.
**Note:** Each developer must add `eval "$(fnm env --use-on-cd --shell zsh)"`
to their shell profile for automatic version activation.

### D009 — UI references are the locked visual source of truth
**Decision:** `project-reference/UI_HOME.pdf`, `UI_SHOP.pdf` and
`UI_CONTACT.pdf.pdf` define the visual design. They may not be redesigned,
simplified or reinterpreted. Deviations are permitted only for proposal-scope
compliance, accessibility, responsiveness, performance or technical feasibility.
**Reason:** Client has approved this design; visual drift undermines trust and
causes rework.

### D010 — Unconfirmed claims must not appear in UI copy
**Decision:** Cash on Delivery, pan-India shipping, verified reviews, fixed
delivery times, customer ratings, low-stock labels and ranking timelines must
not be published as facts until confirmed by the client.
**Reason:** Publishing unconfirmed operational claims creates legal and
reputational risk for the client.

### D011 — No application scaffold yet
**Decision:** As of 2026-07-30, no `apps/web`, `apps/api` or `packages/shared`
folders have been created. The repo contains only toolchain pin files,
`.gitignore`, `CLAUDE.md`, `README.md` and `docs/`.
**Reason:** Setup and documentation must be stable before scaffold to avoid
rework; pending open items (MySQL, payment gateway, domain) do not block
foundation but block M1+.

### D012 — Home, Shop and Contact references are the locked visual source of truth; exact tokens extracted from rendered PDFs
**Decision:** `project-reference/UI_HOME.pdf`, `UI_SHOP.pdf` and
`UI_CONTACT.pdf.pdf` — rendered to inspectable JPEGs in
`project-reference/rendered/` via Poppler — are the final, locked visual
reference for MyPetMart's customer-facing design. Design tokens (colour,
typography roles, spacing, layout, component specs) were extracted from
pixel-level inspection of every rendered page and slice, and are recorded in
`docs/DESIGN_SYSTEM.md`. Eight colour tokens were sampled as EXACT hex values
directly from source pixels; remaining tokens (fonts, some layout
measurements) are marked APPROXIMATE or PENDING pending a live-site or
higher-fidelity source check.
**Reason:** A rasterised PDF cannot yield exact font names or DOM
measurements, but pixel colour sampling is reliable and removes guesswork
from the palette — the single highest-risk area for visual drift.
**Rule:** functional exclusions recorded in the Final Proposal (advanced
filters, wishlist, reviews, etc.) do **not** license a visual redesign of the
sections that contain them. Per `docs/DESIGN_SYSTEM.md` §18, an excluded
feature is removed or disabled in place — the surrounding layout, spacing and
card shape must be preserved exactly as referenced.
**Rule:** unconfirmed commercial claims visible in the references — Cash on
Delivery, pan-India shipping, fixed delivery times, verified reviews,
customer ratings, low-stock labels — cannot be published as fact in the
built site until confirmed by the client (tracked in `docs/OPEN_ITEMS.md`
OI-003–OI-005, OI-012). This reaffirms D010 specifically in the context of
the now-extracted design system.
**Also recorded:** a rendering defect was found and fixed during this
extraction — the first attempt at slicing `UI_HOME.pdf` into readable
vertical images (via `sips --cropOffset`) produced slices that did not
start at the true top of the page, silently omitting the Home hero section
from visual review. All Home/Shop/Contact slices were regenerated using
`pdftoppm`'s native `-x -y -W -H` pixel crop instead, which was verified
correct against known content three times before being trusted for the
full re-slice.

### D014 — Skill-principle scoping: Ponytail, Emil Kowalski, taste-skill
**Decision:** Three approved skill principles are in scope for this project,
each with a bounded application zone:

- **Ponytail (minimal-code):** applies to all code. Native/platform APIs before
  libraries; no premature abstractions; no half-finished implementations. Does
  **not** apply to security, input validation, accessibility, error handling or
  necessary tests — these are always implemented fully.
- **Emil Kowalski (interaction):** applies to customer-facing storefront UI
  (Home, Shop, Product Detail, Contact) only. Animate only when motion aids
  task completion; restrained motion consistent with MOTION_INTENSITY=3; visible
  focus and inline errors on all pages. Admin, checkout and account pages
  prioritise clarity and function — no decorative motion.
- **Taste-skill (design character):** applies to Home, Shop, Contact and
  editorial storefront pages only. The locked UI reference PDFs (D009, D012)
  always take precedence over the taste-skill dials. The dials are descriptive
  benchmarks, not a licence to reinvent.

**Rule:** Do not install or copy the Ponytail, Emil Kowalski or taste-skill
repositories into this project — the principles are applied as written rules,
not as code dependencies.
**Reason:** Scoping prevents misapplication of aesthetic or motion principles to
functional-first surfaces (admin, checkout), and prevents the "minimal-code"
shorthand from being used to justify cutting security or accessibility work.

### D013 — Visual foundation implementation: CSS tokens, Tailwind v4 config, temporary fonts
**Decision:** Design tokens are implemented as CSS custom properties in
`apps/web/src/app/globals.css`, using Tailwind CSS v4.3.3's native CSS-first
`@theme inline` block (no legacy `tailwind.config.*` file — none is required
by this Tailwind version). Token IDs mirror `docs/DESIGN_SYSTEM.md` §3–6
naming exactly (`color-cream-bg`, `color-peach-hero`, `color-primary-orange`,
etc.) for direct traceability back to the locked reference. Certainty is
labelled inline as EXACT, APPROXIMATE, DERIVED or PLACEHOLDER:
- EXACT/APPROXIMATE values are copied verbatim from `DESIGN_SYSTEM.md` §3 —
  no new hex values were invented.
- DERIVED tokens (`color-text-muted`, `color-border-subtle`) are computed
  from an existing EXACT/APPROXIMATE token via CSS `color-mix()`, since no
  distinct value exists for "muted text" or "border" in the source.
- PLACEHOLDER tokens (`color-surface-secondary`, `color-state-success`,
  `color-state-destructive`) alias an existing locked token rather than
  fabricate a new colour, because `DESIGN_SYSTEM.md` §3 explicitly notes no
  distinct value was observed for a secondary warm surface or an in-stock/
  success indicator, and the sale-badge colour is documented as "verify
  against `color-terracotta`."
- `color-focus-ring` is aliased to `color-deep-brown` (not
  `color-primary-orange`) specifically for contrast reliability — a
  primary-orange ring is too close in hue to the orange-hero section
  background to remain visible; deep-brown holds contrast across every warm
  surface in the palette.

**Fonts (temporary, approximate — see `DESIGN_SYSTEM.md` §4, §20 item 3):**
loaded via `next/font/google` in `apps/web/src/app/layout.tsx`:
- Display heading: `Fredoka` (weights 500/600/700), fallback `"Baloo 2",
  ui-rounded, system-ui, sans-serif`.
- Display italic accent: `Fraunces` italic (weights 400/500), fallback
  `"Playfair Display", Georgia, serif`.
- Body / navigation: `Inter` (weights 400/500/600/700), fallback
  `"Plus Jakarta Sans", system-ui, sans-serif`.

These are the first implementation-safe alternatives already proposed in
`DESIGN_SYSTEM.md` §4. **The font match remains approximate, not
confirmed** — swap immediately if a live-site inspection or higher-fidelity
source later provides the actual reference font names.

**Also recorded:** removed create-next-app's default
`@media (prefers-color-scheme: dark)` auto-invert from `globals.css`.
MyPetMart has one locked, light, warm palette — not a dark-mode variant —
per `DESIGN_SYSTEM.md` §1–2. Leaving the generic starter behaviour in place
was an active bug (the page rendered on a black background under a dark OS
preference) and is exactly the kind of "generic Tailwind starter template"
drift CLAUDE.md's UI lock section prohibits.

**Reason:** Keeps every visual value traceable to a specific, labelled
source in `DESIGN_SYSTEM.md` rather than allowing implementation-time
guesses to silently harden into "confirmed" values.
