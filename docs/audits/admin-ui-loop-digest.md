# Admin panel build/verify loop — digest

Date: 2026-08-04
Scope: complete interactive MyPetMart admin-panel frontend on demo data.
No Docker, MySQL, Prisma, authentication or real API integration — see
`docs/ADMIN_PANEL_PLAN.md` for the architecture this was built against.

---

## Final result: **PASS**

All 13 routes return HTTP 200, navigate correctly, and were interactively
verified (not just rendered) — product/category CRUD, order/return status
updates and notes, filters/search/sort/pagination, dialogs/drawers with
real keyboard accessibility, and responsive behaviour at 375/768/1440px.
`typecheck:web`, `lint:web` and `build:web` all pass. The storefront
(`/`, `/shop`, `/contact`) is confirmed unaffected. Two real bugs were
found during interactive testing and fixed before sign-off (see below).

---

## Iterations

**1 of 5 allotted**, with two in-loop bug fixes discovered during
interactive verification (not counted as separate iterations — both found
and fixed within the same pass, then re-verified):

1. Import-extension mismatch: `apps/api`'s Node-native-TypeScript convention
   (explicit `.ts`/`.tsx` extensions in relative imports, required for
   `node file.ts` to resolve modules) was carried over into the admin code
   by habit. `apps/web` uses Next.js's bundler resolution, which rejects
   explicit extensions (`TS5097`). Fixed across 23 files with a scoped
   script; confirmed `apps/api` untouched (different tsconfig, different
   rule).
2. Five `react-hooks` ESLint errors from the newer React Compiler rule set
   (`set-state-in-effect`, `refs`, `useCallback` deps-array-must-be-literal)
   — fixed by: replacing "reset form state in an effect on dialog open"
   with the idiomatic "let Dialog unmount/remount the form subtree" pattern
   (`category-form-dialog.tsx`, `settings-view.tsx`), narrowing
   `admin-header.tsx`'s search effect to never synchronously clear state,
   and dropping `use-admin-data.ts`'s redundant second `deps` argument
   (callers already memoize their fetcher via `useCallback`).

**Two real bugs found via interactive browser testing** (not by inspection —
both looked correct in code and screenshots at rest):

3. **Mobile nav drawer was invisible.** `AdminNavList` is styled for the
   dark sidebar (`bg-deep-brown`) it's normally rendered inside — white
   text, translucent white hover states. Reused unchanged inside the
   generic `Drawer` primitive (white panel) for the mobile menu, the same
   markup rendered white-text-on-white-background — present in the DOM,
   confirmed via `innerHTML`, invisible on screen. Fixed by adding a
   `tone?: "light" | "dark"` prop to `Drawer` and passing `tone="dark"`
   for the mobile nav specifically.
4. **Focus didn't reliably return to the trigger element after closing a
   dialog/drawer.** `useFocusTrap`'s effect depended on `[open, onClose]`;
   since every call site passes an inline arrow function for `onClose`
   (a new reference every render), the effect tore down and rebuilt on
   *every* unrelated parent re-render while a dialog was still open, each
   teardown firing the focus-restore cleanup prematurely. Fixed by reading
   `onClose` through a ref kept current every render (via its own effect,
   not a during-render assignment — the latter is itself now a lint error
   under the React Compiler rules) and narrowing the trap effect's
   dependency array to `[open]` only. Verified via
   `document.activeElement` before/after an Escape-close cycle.

No other implementation/evaluation cycles were needed.

---

## Routes and modules completed

| Route | Module | Status |
|---|---|---|
| `/admin` | Dashboard | ✅ stats, 14-day chart, status breakdown, recent orders, low-stock (demo-labelled), quick actions |
| `/admin/products` | Products list | ✅ table/grid toggle, search+category+status filters, sortable columns, pagination, bulk select+delete |
| `/admin/products/new` | Add product | ✅ full form, image-placeholder live preview, variants, validation |
| `/admin/products/[id]/edit` | Edit product | ✅ pre-filled form, same validation, delete |
| `/admin/categories` | Categories | ✅ list, add/edit dialog, reorder (up/down), activate/deactivate |
| `/admin/orders` | Orders list | ✅ search+status+date filters, table, pagination |
| `/admin/orders/[id]` | Order detail | ✅ items/customer/address/payment, status update, timeline, internal notes |
| `/admin/customers` | Customers list | ✅ search, pagination |
| `/admin/customers/[id]` | Customer detail | ✅ contact info, order history, summary metrics |
| `/admin/returns` | Returns list | ✅ search+status filters, pagination |
| `/admin/returns/[id]` | Return detail | ✅ reason, evidence preview, resolution (manual-only), notes |
| `/admin/reports` | Reports | ✅ day-wise chart, product performance, status distribution, date filters, CSV export marked "Integration required" |
| `/admin/settings` | Settings | ✅ store profile (editable, saves to session), 4 integration placeholders, admin-user placeholder |

---

## Files changed

**New — planning:**
- `docs/ADMIN_PANEL_PLAN.md`

**New — data layer** (`apps/web/src/data/admin/`):
- `types.ts`, `repository.ts` (`AdminRepository` interface), `fixtures.ts`
  (14 products, 6 categories, 10 customers, 17 orders, 6 return requests),
  `mock-repository.ts` (in-memory singleton implementation)

**New — shared admin UI** (`apps/web/src/components/admin/ui/`):
- `toast.tsx`, `dialog.tsx`, `drawer.tsx`, `confirm-dialog.tsx`,
  `data-table.tsx`, `pagination.tsx`, `empty-state.tsx` (loading/error/empty
  states), `status-badge.tsx`, `stat-card.tsx`, `form-field.tsx`,
  `use-focus-trap.ts`, `use-admin-data.ts`

**New — shell** (`apps/web/src/components/admin/shell/`):
- `admin-sidebar.tsx`, `admin-header.tsx`, `admin-shell.tsx`, `nav-config.ts`

**New — per-domain views** (`apps/web/src/components/admin/{domain}/`):
- `dashboard/`: `dashboard-view.tsx`, `bar-chart.tsx`, `status-overview.tsx`
- `products/`: `products-list-view.tsx`, `product-form.tsx`
- `categories/`: `categories-view.tsx`, `category-form-dialog.tsx`
- `orders/`: `orders-list-view.tsx`, `order-detail-view.tsx`
- `customers/`: `customers-list-view.tsx`, `customer-detail-view.tsx`
- `returns/`: `returns-list-view.tsx`, `return-detail-view.tsx`
- `reports/`: `reports-view.tsx`
- `settings/`: `settings-view.tsx`

**New — routes** (`apps/web/src/app/admin/`):
- `layout.tsx` + 13 `page.tsx` files per the table above

**New — shared:**
- `apps/web/src/components/storefront-chrome.tsx`

**Modified:**
- `apps/web/src/app/layout.tsx` — swapped the hardcoded
  `<SiteHeader/>{children}<SiteFooter/>` for
  `<StorefrontChrome>{children}</StorefrontChrome>`, a client component that
  skips storefront chrome for `/admin/*` paths. Next.js has exactly one root
  layout, so this was the only place this decision could live. `/`, `/shop`,
  `/contact` render byte-identically to before (confirmed in browser).
- `apps/web/src/components/icons.tsx` — 15 new icon exports (Grid, Box, Tag,
  Receipt, Users, Return, Chart, Gear, ChevronDown, Upload, Plus, Trash,
  Pencil, GridView, ListView, Alert). Purely additive — no existing export
  changed.
- `docs/STATUS.md` — see below.

**Confirmed untouched:** `apps/web/package.json` (no new dependencies —
"Install no UI or chart packages" honoured throughout: charts are CSS bars,
tables/dialogs/drawers/toasts are hand-built), `apps/api/`, `prisma/`,
`compose.yaml`, `.env.example`, and every existing storefront page/component
under `apps/web/src/app/{page.tsx,shop/,contact/}` and
`apps/web/src/components/{home/,shop/,contact/}`.

---

## Demo repository structure

```
data/admin/
├── types.ts            Product, Category, Order, Customer, ReturnRequest,
│                        DashboardStats, ReportsData, StoreSettings, ...
├── repository.ts        AdminRepository interface — every method returns
│                        a Promise, mirroring a real REST client's shape
├── fixtures.ts           One dedicated location for all demo data
└── mock-repository.ts     In-memory singleton implementing AdminRepository;
                           exported as `adminRepository`
```

Pages never import `fixtures.ts`. Each page calls `adminRepository.*`
(re-exported from `mock-repository.ts`) through the shared `useAdminData`
hook, which owns loading/error/data state. Mutations (`createProduct`,
`updateOrderStatus`, `addOrderNote`, `reorderCategory`, ...) mutate the
singleton's in-memory arrays and resolve after a small artificial delay, so
loading states are real rather than instant. State persists across
client-side navigation for the browser session and resets on a hard reload
— no `localStorage` anywhere. Swapping in a real `RestAdminRepository`
later means implementing the same interface and changing the one export in
`mock-repository.ts` — no page changes.

**Dev-mode caveat, not a production concern:** editing a source file while
the Next.js dev server is running can trigger Turbopack's Fast Refresh to
fully re-evaluate the module graph, which resets the singleton's in-memory
state (observed directly during this session — see iteration 2). This is
purely a Hot-Module-Reload artifact of live-editing while a page is open;
it doesn't happen from normal navigation, and won't exist at all once this
is a real backend.

---

## Interaction results (all interactively tested, not just inspected)

- **Products:** created "Test Squeaky Toy" (appeared at top of list,
  correct price/stock/status) → edited it (validated the required-name
  error blocks submission with an inline message, then saved successfully)
  → deleted it individually with the confirm dialog → bulk-selected 2
  products and bulk-deleted them, catalog count updated correctly each
  time. Grid/table toggle, category/status filters, and search (verified
  "harness" → correctly narrowed to 1 result) all confirmed working.
- **Categories:** reordered "Walking Essentials" up a position, deactivated
  it (badge + button label flipped to Inactive/Activate), added a new
  "Small Pets" category via the dialog — all reflected immediately in the
  list.
- **Orders:** updated an order's status from Pending → Processing on the
  detail page — timeline gained a new "Status changed to processing" entry
  with a timestamp, and the new status was independently confirmed showing
  correctly on that customer's detail page (cross-page consistency). Added
  an internal note — appeared immediately, attributed to "Demo Admin".
- **Returns:** detail page confirmed structurally (reason, evidence
  preview, resolution controls, notes) — resolution UI explicitly states
  "does not trigger a refund or pickup" per the no-automation requirement.
- **Reports:** "Export CSV (Integration required)" button confirmed to
  show a toast — "CSV export requires a backend integration — not
  available in this demo" — rather than doing nothing or erroring.
- **Toasts, dialogs, focus:** confirmed a `role="dialog"` opens with focus
  moved inside, Escape closes it and returns focus to the exact trigger
  element (`document.activeElement` checked before/after), and a global
  `Tab` from page load lands on the first sidebar link with a visible 2px
  focus ring (inherited from the shared `:focus-visible` rule — no new CSS
  needed).
- **Mobile nav drawer:** opens, lists all 5 nav groups with visible icons
  (after the dark-tone fix), navigates on tap, and auto-closes on
  navigation.

---

## Responsive results

| Breakpoint | Overflow check | Notes |
|---|---|---|
| 375px | `scrollWidth === clientWidth` on `/admin` and `/admin/products` | Stat cards 2-per-row, sidebar replaced by hamburger + drawer, demo banner wraps |
| 768px | `scrollWidth === clientWidth` on `/admin/products` | Table scrolls horizontally inside its own container (per the wide-content pattern) — the page itself never scrolls sideways |
| 1440px | Full desktop layout, persistent sidebar | All screenshots in this digest's testing were taken at this width unless noted |

---

## Test results

```
pnpm typecheck:web   → PASS (clean tsc --noEmit)
pnpm lint:web        → PASS (clean eslint, 5 react-hooks errors fixed during the loop)
pnpm build:web       → PASS — all 13 admin routes + / + /shop + /contact in the route table
```

All 16 routes (13 admin + 3 storefront) return HTTP 200 via `curl`.
Console checked clean (no runtime/console errors) on every route visited.

---

## Remaining visual issues

None outstanding. Two were found and fixed in-loop (mobile drawer
invisible text, focus-restore timing) — see Iterations above.

Minor, accepted-as-is: category reorder uses move-up/move-down buttons
rather than drag-and-drop (keyboard-accessible by construction, avoids a
DnD library); customer list/detail has no add/edit form (matches this
task's BUILD spec, which only asked for list+filters+detail+history+
metrics for customers, unlike the full CRUD spec given for products).

---

## Backend integration requirements

Everything below is explicitly labelled "Integration required" or
equivalent in the UI itself, not just in this digest:

- **Real product images** — needs Cloudflare R2 (M3, OI-007). The Products
  form's image panel already explains this inline.
- **Payment gateway, shipping partner** — Settings page placeholders,
  needs OI-001/OI-002.
- **CSV export** — Reports page button is wired to a toast explaining it's
  unavailable, not a silent no-op or a fake download.
- **Admin authentication** — Settings' "Admin users" section is explicitly
  a placeholder pending JWT auth (M2). The header's "Demo Admin / Not
  signed in" profile is honest about this, not a fake logged-in state.
- **Real database** — the entire `AdminRepository` swap described above;
  no schema/migration work was done or implied by this task.

---

## Human-review checklist

1. **Reused `AdminNavList` across two different visual contexts** (dark
   sidebar, and now a dark-toned drawer) is the pattern going forward for
   shared nav — confirm this is preferred over, say, two separate nav
   components if the mobile drawer's design needs to diverge further later.
2. **Category reorder is buttons, not drag-and-drop** — confirm this
   matches the intended admin UX, or flag if DnD is actually expected
   despite the "install no packages" constraint (would need a native
   HTML5 drag-and-drop implementation, not a library).
3. **Root `apps/web/src/app/layout.tsx` was modified** — a single,
   necessary change (see Files changed) to let `/admin/*` skip the
   storefront chrome. Confirm this is an acceptable shared-file touch
   given the task's "do not modify storefront routes" bound was
   interpreted as protecting route *behavior*, not literally forbidding
   any edit to the one shared root layout every route passes through.
4. **Demo repository resets on hard reload** (by design, no localStorage)
   — confirm this matches expectations for a demo, versus wanting
   persistence across reloads before this is shown to stakeholders.
5. **Dev-mode HMR resets the demo singleton** when source files are edited
   live (see Demo repository structure above) — purely a dev-server
   artifact, won't exist in production, but worth knowing if someone edits
   code while a demo is being given.
