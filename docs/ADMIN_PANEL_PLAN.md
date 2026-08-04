# MyPetMart — Admin Panel Plan

Last updated: 2026-08-04
Scope: frontend-only, demo-data admin panel. No Docker/MySQL/Prisma/auth/real
API integration — see `docs/audits/admin-ui-loop-digest.md` for what this
unblocks and what it doesn't.

---

## 1. Why this shape

CLAUDE.md is explicit that admin pages "prioritise clarity and function" and
must not carry the storefront's editorial taste-skill treatment (no
`DESIGN_VARIANCE`/`MOTION_INTENSITY` dials, no decorative motion). This plan
treats the admin panel as a distinct product surface that happens to share
MyPetMart's colour tokens and type system, not a themed extension of Home/
Shop/Contact.

## 2. Information architecture

```
/admin                      Dashboard
/admin/products              Product list (table/grid)
/admin/products/new          Add product
/admin/products/[id]/edit    Edit product
/admin/categories            Category list + reorder
/admin/orders                Order list
/admin/orders/[id]           Order detail
/admin/customers             Customer list
/admin/customers/[id]        Customer detail
/admin/returns                Return/replacement list
/admin/returns/[id]           Return detail
/admin/reports                Reports
/admin/settings                Store settings
```

Sidebar groups these into: **Overview** (Dashboard), **Catalog** (Products,
Categories), **Sales** (Orders, Customers, Returns), **Insights** (Reports),
**Configuration** (Settings) — mirrors the proposal's admin scope
(`docs/PROJECT_BRIEF.md`: product management, basic dashboard, day-wise
reports, replace/return visibility) without inventing sections outside it.

## 3. Storefront/admin chrome separation

The existing root layout (`app/layout.tsx`) always renders `<SiteHeader/>` +
`{children}` + `<SiteFooter/>` — correct for Home/Shop/Contact, wrong for
admin (which needs its own sidebar shell, not the storefront nav/newsletter/
footer). Next.js App Router has one root layout, so the fix is a single
small client component, `components/storefront-chrome.tsx`, that checks
`usePathname()` and skips the storefront chrome for `/admin/*`:

```
app/layout.tsx  →  <StorefrontChrome>{children}</StorefrontChrome>
storefront-chrome.tsx (client)  →  pathname.startsWith("/admin")
  ? children                              (admin supplies its own shell)
  : <SiteHeader/>{children}<SiteFooter/>  (unchanged storefront behaviour)
```

This is the only shared/root file touched. `/`, `/shop`, `/contact` render
byte-identically before and after — verified in the digest. Everything else
lives under `app/admin/` and `components/admin/`.

## 4. Shared admin shell

`app/admin/layout.tsx` (Server Component, sets `<title>` template + `noindex`
robots meta) renders `AdminShell` (client):

- **Sidebar** (desktop, persistent) / **drawer** (mobile, slide-in, same nav
  content) — grouped nav per §2, active-route highlighting.
- **Header** — mobile menu toggle, breadcrumbs (derived from the route
  segments), a search input (visual + basic client-side product/order/
  customer name filtering, not a global command palette), a profile
  placeholder (static avatar + "Demo Admin", no auth), and a **demo-mode
  banner** ("Demo data — resets on reload") always visible.
- **Toast provider** wraps the whole shell so any page can call `useToast()`
  after a CRUD action.

## 5. Shared UI primitives (no packages — CSS + inline SVG only)

`components/admin/ui/`: `toast.tsx`, `dialog.tsx`, `drawer.tsx`,
`data-table.tsx` (generic sortable table + pagination), `empty-state.tsx`,
`status-badge.tsx`, `stat-card.tsx`, `form-field.tsx`, `confirm-dialog.tsx`.

Dialog/Drawer share a focus-trap + Escape-to-close + backdrop-click-to-close
implementation (custom, no library) and restore focus to the trigger on
close — this is what makes "keyboard accessible" true across every route
that reuses them rather than a claim to re-verify per page.

## 6. Data architecture

```
data/admin/types.ts            Product, Category, Order, Customer,
                                 ReturnRequest, DashboardStats, ...
data/admin/repository.ts        AdminRepository interface — every method
                                 returns a Promise, mirroring what a real
                                 REST client would look like
data/admin/fixtures.ts          One dedicated location for all demo data
data/admin/mock-repository.ts   In-memory singleton implementing
                                 AdminRepository over the fixtures
```

Pages never import `fixtures.ts` directly — they call `adminRepository.*`
(imported from `mock-repository.ts`, re-exported as the single
`adminRepository` singleton) inside a small data hook per page
(`useAdminQuery`-style `useEffect` + loading/error state), so swapping in a
real `RestAdminRepository` later means implementing the same interface and
changing one import, not touching any page.

Mutations (`createProduct`, `updateOrderStatus`, etc.) update the singleton's
in-memory arrays and resolve a `Promise` (with a small artificial delay so
loading states are real, not instant/fake). State persists across
client-side navigation for the session and resets on a hard reload — no
`localStorage`, per this task's instruction.

## 7. Page-by-page scope

Each route's content is scoped exactly to this task's BUILD section — see
the route list in the task prompt for the authoritative per-page checklist.
Two deliberate simplifications, both flagged in the digest's human-review
checklist:

- **Category reorder** uses move-up/move-down buttons, not drag-and-drop —
  keyboard-accessible by construction and needs no DnD library.
- **Customer list/detail** has no add/edit form — the BUILD spec only asks
  for list+filters+detail+history+metrics, not customer CRUD.

## 8. Explicitly out of scope (per task bounds)

Docker, MySQL, Prisma, authentication, real API calls, automated refunds,
return-pickup automation, CSV export execution (control is visual, marked
"Integration required"), any storefront route change.
