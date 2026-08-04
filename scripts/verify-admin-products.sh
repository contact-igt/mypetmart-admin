#!/usr/bin/env bash
# Verifies the Product/Category admin refinement meets this task's gate
# conditions. Exits 0 only when every check below passes.
#
# Usage: scripts/verify-admin-products.sh
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
if pnpm typecheck:web >/tmp/verify-admin-products-typecheck.log 2>&1; then
  pass "pnpm typecheck:web"
else
  fail "pnpm typecheck:web (see /tmp/verify-admin-products-typecheck.log)"
fi

if pnpm lint:web >/tmp/verify-admin-products-lint.log 2>&1; then
  pass "pnpm lint:web"
else
  fail "pnpm lint:web (see /tmp/verify-admin-products-lint.log)"
fi

if pnpm build:web >/tmp/verify-admin-products-build.log 2>&1; then
  pass "pnpm build:web"
else
  fail "pnpm build:web (see /tmp/verify-admin-products-build.log)"
fi

# --- 2. required modules present -------------------------------------------
section "Required modules"

REQUIRED_FILES=(
  "app/admin/products/page.tsx"
  "app/admin/products/new/page.tsx"
  "app/admin/products/[id]/edit/page.tsx"
  "app/admin/categories/page.tsx"
  "components/admin/products/products-list-view.tsx"
  "components/admin/products/product-form.tsx"
  "components/admin/categories/categories-view.tsx"
  "components/admin/categories/category-form-dialog.tsx"
  "data/admin/types.ts"
  "data/admin/repository.ts"
  "data/admin/mock-repository.ts"
  "data/admin/fixtures.ts"
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
check_contains "$WEB_SRC/data/admin/repository.ts" "duplicateProduct" "AdminRepository exposes duplicateProduct"
check_contains "$WEB_SRC/data/admin/repository.ts" "deleteCategory" "AdminRepository exposes deleteCategory"
check_contains "$WEB_SRC/data/admin/repository.ts" "getProductSummary" "AdminRepository exposes getProductSummary"
check_contains "$WEB_SRC/data/admin/repository.ts" "bulkSetProductStatus" "AdminRepository exposes bulkSetProductStatus"
check_contains "$WEB_SRC/data/admin/types.ts" "PetType" "types.ts declares PetType"
check_contains "$WEB_SRC/data/admin/types.ts" "ProductImage" "types.ts declares ProductImage"
check_contains "$WEB_SRC/data/admin/mock-repository.ts" "productCountFor" "mock-repository computes category product counts"

# --- 3. no forbidden out-of-scope features ----------------------------------
section "Forbidden out-of-scope features"

check_forbidden_pattern() {
  local pattern="$1" label="$2"
  local matches
  matches=$(grep -rniE "$pattern" "$WEB_SRC/components/admin/products" "$WEB_SRC/components/admin/categories" "$WEB_SRC/data/admin" --include="*.ts" --include="*.tsx" || true)
  if [ -z "$matches" ]; then
    pass "$label"
  else
    fail "$label — found: $(echo "$matches" | head -3 | tr '\n' ' ')"
  fi
}

check_forbidden_pattern "inventory forecast" "No inventory forecasting"
check_forbidden_pattern "supplier automation|auto.?reorder|automated restock" "No supplier automation or automated restocking"

# --- 4. blast-radius guard ---------------------------------------------------
# Scoped by mtime against a marker file written at the end of the *previous*
# task (the dashboard refinement digest), not `git status` — apps/api/,
# compose.yaml etc. were created by earlier tasks in this session and were
# never committed, so git status alone can't isolate this task's edits.
section "Blast-radius guard"

MARKER="$ROOT_DIR/docs/audits/admin-dashboard-refinement-digest.md"
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
    "apps/web/src/app/admin/orders"
    "apps/web/src/app/admin/customers"
    "apps/web/src/app/admin/returns"
    "apps/web/src/app/admin/reports"
    "apps/web/src/app/admin/settings"
    "apps/web/src/components/admin/dashboard"
    "apps/web/src/components/admin/orders"
    "apps/web/src/components/admin/customers"
    "apps/web/src/components/admin/returns"
    "apps/web/src/components/admin/reports"
    "apps/web/src/components/admin/settings"
    "apps/web/src/components/admin/shell"
    "apps/web/src/components/admin/ui"
  )
  for p in "${FORBIDDEN_PATHS[@]}"; do
    FULL="$ROOT_DIR/$p"
    [ -e "$FULL" ] || continue
    NEWER=$(find "$FULL" -type f -newer "$MARKER" 2>/dev/null | grep -v '/\.next/' || true)
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
  pass "No apps/api, Prisma, Docker, storefront, or unrelated admin module changes since the prior task"
else
  fail "Forbidden files modified outside this task's blast radius"
fi

# --- 5. no new packages -----------------------------------------------------
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
