#!/usr/bin/env bash
# Verifies the /admin dashboard refinement meets this task's gate conditions.
# Exits 0 only when every check below passes.
#
# Usage: scripts/verify-admin-dashboard.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_SRC="$ROOT_DIR/apps/web/src"

FAIL=0
pass() { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAIL=1; }
section() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# --- pnpm/fnm resolution -----------------------------------------------
if ! command -v pnpm >/dev/null 2>&1; then
  FNM_BIN="$HOME/.local/share/fnm/node-versions/v24.18.1/installation/bin"
  if [ -d "$FNM_BIN" ]; then
    export PATH="$FNM_BIN:$PATH"
  fi
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found on PATH and fnm fallback path is unavailable." >&2
  exit 1
fi

cd "$ROOT_DIR"

# --- 1. typecheck / lint / build ---------------------------------------
section "Build gates"
if pnpm typecheck:web >/tmp/verify-admin-dashboard-typecheck.log 2>&1; then
  pass "pnpm typecheck:web"
else
  fail "pnpm typecheck:web (see /tmp/verify-admin-dashboard-typecheck.log)"
fi

if pnpm lint:web >/tmp/verify-admin-dashboard-lint.log 2>&1; then
  pass "pnpm lint:web"
else
  fail "pnpm lint:web (see /tmp/verify-admin-dashboard-lint.log)"
fi

if pnpm build:web >/tmp/verify-admin-dashboard-build.log 2>&1; then
  pass "pnpm build:web"
else
  fail "pnpm build:web (see /tmp/verify-admin-dashboard-build.log)"
fi

# --- 2. required dashboard modules present --------------------------------
section "Required modules"

REQUIRED_FILES=(
  "app/admin/page.tsx"
  "data/admin/types.ts"
  "data/admin/repository.ts"
  "data/admin/mock-repository.ts"
  "data/admin/dashboard-fixtures.ts"
  "data/admin/dashboard-analytics.ts"
  "components/admin/dashboard/dashboard-view.tsx"
  "components/admin/dashboard/dashboard-filter-bar.tsx"
  "components/admin/dashboard/sales-orders-chart.tsx"
  "components/admin/dashboard/conversion-funnel.tsx"
  "components/admin/dashboard/order-status-donut.tsx"
  "components/admin/dashboard/order-status-section.tsx"
  "components/admin/dashboard/product-performance-section.tsx"
  "components/admin/dashboard/product-interest-section.tsx"
  "components/admin/dashboard/fulfilment-section.tsx"
  "components/admin/dashboard/location-section.tsx"
  "components/admin/dashboard/customer-overview-section.tsx"
  "components/admin/dashboard/returns-section.tsx"
  "components/admin/dashboard/traffic-sources-section.tsx"
  "components/admin/dashboard/business-insights-section.tsx"
  "components/admin/dashboard/ranked-bar-list.tsx"
  "components/admin/dashboard/metric-comparison-card.tsx"
)
for f in "${REQUIRED_FILES[@]}"; do
  if [ -f "$WEB_SRC/$f" ]; then
    pass "$f exists"
  else
    fail "$f is missing"
  fi
done

check_contains() {
  local file="$1" needle="$2" label="$3"
  if [ -f "$file" ] && grep -q "$needle" "$file"; then
    pass "$label"
  else
    fail "$label — \"$needle\" not found in $file"
  fi
}
check_contains "$WEB_SRC/data/admin/repository.ts" "getDashboardAnalytics" "AdminRepository exposes getDashboardAnalytics"
check_contains "$WEB_SRC/data/admin/repository.ts" "getDashboardFilterOptions" "AdminRepository exposes getDashboardFilterOptions"
check_contains "$WEB_SRC/data/admin/types.ts" "DashboardFilter" "types.ts declares DashboardFilter"
check_contains "$WEB_SRC/data/admin/types.ts" "DashboardAnalyticsResult" "types.ts declares DashboardAnalyticsResult"

# --- 3. no forbidden out-of-scope features --------------------------------
section "Forbidden out-of-scope features"

check_forbidden_pattern() {
  local pattern="$1" label="$2"
  local matches
  matches=$(grep -rniE "$pattern" "$WEB_SRC/components/admin" "$WEB_SRC/data/admin" --include="*.ts" --include="*.tsx" || true)
  if [ -z "$matches" ]; then
    pass "$label"
  else
    fail "$label — found: $(echo "$matches" | head -3 | tr '\n' ' ')"
  fi
}

check_forbidden_pattern "profit report|profit margin" "No profit reports"
check_forbidden_pattern "inventory forecast" "No inventory forecasting"
check_forbidden_pattern "export.{0,15}(csv|pdf).{0,20}(complete|success|downloaded)" "No automated report-export claims"
check_forbidden_pattern "ad attribution model|multi-touch attribution" "No advanced ad-attribution modelling"
check_forbidden_pattern "follower count|engagement rate" "No social follower/engagement statistics"

# --- 4. no live-wishlist claims --------------------------------------------
section "Wishlist scope"

WISHLIST_MATCHES=$(grep -rniE "wishlist" "$WEB_SRC/components/admin" --include="*.tsx" || true)
if [ -z "$WISHLIST_MATCHES" ]; then
  fail "Wishlist inactive-state notice not found anywhere in components/admin"
else
  if echo "$WISHLIST_MATCHES" | grep -qiE "not enabled in current project scope"; then
    pass "Wishlist section states it is not enabled in current project scope"
  else
    fail "Wishlist text present but missing the required 'not enabled in current project scope' notice"
  fi
  # Fail if a wishlist figure appears outside the one labelled notice block —
  # i.e. any file mentioning wishlist without also carrying the required label.
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if ! grep -q "not enabled in current project scope" "$f"; then
      fail "Wishlist mentioned in $f without the required scope notice"
    fi
  done < <(echo "$WISHLIST_MATCHES" | cut -d: -f1 | sort -u)
fi

# --- 5. blast-radius guard --------------------------------------------------
# Scoped by mtime against a marker file written at the end of the *previous*
# task (the admin-panel UI build), not by `git status`, because apps/api/,
# compose.yaml etc. were created by an earlier task in this same session and
# were never committed — git status can't distinguish "touched by this task"
# from "already uncommitted before this task started." Same heuristic as
# verify-storefront.sh's `apps/api -newer package.json` check.
section "Blast-radius guard"

MARKER="$ROOT_DIR/docs/audits/admin-ui-loop-digest.md"
FORBIDDEN_FOUND=0

if [ -f "$MARKER" ]; then
  FORBIDDEN_PATHS=(
    "apps/api"
    "prisma"
    "compose.yaml"
    "apps/web/src/app/page.tsx"
    "apps/web/src/app/shop"
    "apps/web/src/app/contact"
    "apps/web/src/components/home"
    "apps/web/src/components/shop"
    "apps/web/src/components/contact"
    "apps/web/src/app/admin/products"
    "apps/web/src/app/admin/categories"
    "apps/web/src/app/admin/orders"
    "apps/web/src/app/admin/customers"
    "apps/web/src/app/admin/returns"
    "apps/web/src/app/admin/settings"
    "apps/web/src/components/admin/products"
    "apps/web/src/components/admin/categories"
    "apps/web/src/components/admin/orders"
    "apps/web/src/components/admin/customers"
    "apps/web/src/components/admin/returns"
    "apps/web/src/components/admin/settings"
    "apps/web/src/components/admin/shell"
  )
  for p in "${FORBIDDEN_PATHS[@]}"; do
    FULL="$ROOT_DIR/$p"
    [ -e "$FULL" ] || continue
    NEWER=$(find "$FULL" -newer "$MARKER" 2>/dev/null | grep -v '/\.next/' || true)
    if [ -n "$NEWER" ]; then
      printf '  \033[31mFOUND\033[0m %s modified after the prior task marker\n' "$p"
      FORBIDDEN_FOUND=1
    fi
  done
  for envfile in "$ROOT_DIR"/.env*; do
    [ -e "$envfile" ] || continue
    if [ "$envfile" -nt "$MARKER" ]; then
      printf '  \033[31mFOUND\033[0m %s modified after the prior task marker\n' "$(basename "$envfile")"
      FORBIDDEN_FOUND=1
    fi
  done
else
  echo "  (marker file missing — skipping precise mtime diff check)"
fi

if [ "$FORBIDDEN_FOUND" -eq 0 ]; then
  pass "No apps/api, Prisma, Docker, storefront, or non-dashboard admin route changes since the prior task"
else
  fail "Forbidden files modified outside this task's blast radius"
fi

# --- 6. no new packages -----------------------------------------------------
section "Dependency guard"

if [ -f "$MARKER" ]; then
  DEP_CHANGED=0
  for f in "$ROOT_DIR/package.json" "$ROOT_DIR/apps/web/package.json" "$ROOT_DIR/pnpm-lock.yaml"; do
    [ -e "$f" ] || continue
    if [ "$f" -nt "$MARKER" ]; then
      printf '  \033[31mFOUND\033[0m %s modified after the prior task marker\n' "${f#"$ROOT_DIR"/}"
      DEP_CHANGED=1
    fi
  done
  if [ "$DEP_CHANGED" -eq 0 ]; then
    pass "No package.json / pnpm-lock.yaml changes since the prior task — no new dependencies added"
  else
    fail "package.json or pnpm-lock.yaml changed during this task — it must install no packages"
  fi
else
  echo "  (marker file missing — skipping dependency mtime check)"
fi

# --- summary --------------------------------------------------------------
section "Summary"
if [ "$FAIL" -eq 0 ]; then
  echo "All checks passed."
  exit 0
else
  echo "One or more checks failed. See above."
  exit 1
fi
