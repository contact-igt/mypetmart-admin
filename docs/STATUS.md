# MyPetMart — Project Status

Last updated: 2026-07-30 (M0 foundation committed)

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

---

## Current module

**M0 — Security, repo setup, toolchain, documentation**
Status: **COMPLETE**

All foundational files are committed. No application code exists.

MySQL provisioning and Prisma setup are deferred until the backend/data module
(M1). They do not block the frontend scaffold.

---

## Next module

**M4 — Customer-facing pages (Frontend Foundation)**
Pre-requisites:
- `pnpm-workspace.yaml` in place ✓ — done
- `apps/web` scaffolded with Next.js 16, TypeScript, Tailwind CSS
- Design system extracted and documented ✓ — done (`docs/DESIGN_SYSTEM.md`)

Frontend scaffolding may proceed immediately. Before building the first page,
triage the uncertainties in `docs/DESIGN_SYSTEM.md` §20 — none are hard
blockers, but font family and exact layout measurements affect fidelity.

---

## Deferred (not blocking frontend)

**M1 — Database schema + Prisma migrations**
Pre-requisites:
- MySQL 8.4 available (OI-008 — unresolved)
- `apps/api` scaffolded with Prisma initialised

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
  shells (CI, hooks) must explicitly run `eval "$(fnm env --shell bash)"` or
  equivalent before any Node/pnpm commands.

## Unresolved visual uncertainties (see `docs/DESIGN_SYSTEM.md` §20 for full detail)

- **Exact font families are unconfirmed** — not extractable from a
  rasterised PDF. `DESIGN_SYSTEM.md` §4 proposes safe Google Fonts
  alternatives (Fredoka/Baloo 2 for display, Fraunces italic for the serif
  accent, Inter/Plus Jakarta Sans for body) but these are placeholders, not
  confirmed matches.
- **Several colour tokens are approximate, not exact**: `color-text-primary`,
  `color-teal-mint-accent`, `color-sale-badge` — 8 other tokens were
  pixel-sampled and are exact (`docs/DESIGN_SYSTEM.md` §3).
- **Exact layout measurements are proportional estimates**, not measured CSS
  values (max-width, gutters, header height, button/input height, card radii).
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
