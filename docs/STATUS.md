# MyPetMart — Project Status

Last updated: 2026-07-30 (visual foundation implemented)

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

---

## Current module

**M4 — Customer-facing pages (Frontend Foundation)**
Status: **In progress** — visual foundation implemented; full homepage not
yet started.

`apps/web` now has design tokens, global styles and shared component
classes, demonstrated on a temporary visual-foundation preview page. The
locked storefront UI (Home, Shop, Contact, Product Detail) — header, nav,
footer, and all real page content — has not been built yet.

Next task: shared site shell (header with nav + icon cluster, footer with
newsletter card and payment/social rows), built on top of the token/class
foundation now in place.

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
