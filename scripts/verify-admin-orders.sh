#!/usr/bin/env bash
# Verifies the Orders & Fulfilment admin refinement meets this task's gate
# conditions. Exits 0 only when every check below passes.
#
# Usage: scripts/verify-admin-orders.sh
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
if pnpm typecheck:web >/tmp/verify-admin-orders-typecheck.log 2>&1; then
  pass "pnpm typecheck:web"
else
  fail "pnpm typecheck:web (see /tmp/verify-admin-orders-typecheck.log)"
fi

if pnpm lint:web >/tmp/verify-admin-orders-lint.log 2>&1; then
  pass "pnpm lint:web"
else
  fail "pnpm lint:web (see /tmp/verify-admin-orders-lint.log)"
fi

if pnpm build:web >/tmp/verify-admin-orders-build.log 2>&1; then
  pass "pnpm build:web"
else
  fail "pnpm build:web (see /tmp/verify-admin-orders-build.log)"
fi

# --- 2. required modules present -------------------------------------------
section "Required modules"

REQUIRED_FILES=(
  "app/admin/orders/page.tsx"
  "app/admin/orders/[id]/page.tsx"
  "components/admin/orders/orders-list-view.tsx"
  "components/admin/orders/order-detail-view.tsx"
  "data/admin/order-status-rules.ts"
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
check_contains "$WEB_SRC/data/admin/repository.ts" "getOrderSummary" "AdminRepository exposes getOrderSummary"
check_contains "$WEB_SRC/data/admin/repository.ts" "updateOrderFulfilmentStatus" "AdminRepository exposes updateOrderFulfilmentStatus"
check_contains "$WEB_SRC/data/admin/repository.ts" "updateOrderPaymentStatus" "AdminRepository exposes updateOrderPaymentStatus"
check_contains "$WEB_SRC/data/admin/repository.ts" "updateOrderShippingDetails" "AdminRepository exposes updateOrderShippingDetails"
check_contains "$WEB_SRC/data/admin/repository.ts" "bulkUpdateOrderStatus" "AdminRepository exposes bulkUpdateOrderStatus"
check_contains "$WEB_SRC/data/admin/repository.ts" "getReturnsForOrder" "AdminRepository exposes getReturnsForOrder"
check_contains "$WEB_SRC/data/admin/order-status-rules.ts" "getValidNextOrderStatuses" "order-status-rules exports getValidNextOrderStatuses"
check_contains "$WEB_SRC/data/admin/order-status-rules.ts" "getValidNextFulfilmentStatuses" "order-status-rules exports getValidNextFulfilmentStatuses"
check_contains "$WEB_SRC/data/admin/order-status-rules.ts" "getValidNextPaymentStatuses" "order-status-rules exports getValidNextPaymentStatuses"

# --- 3. no real payment/courier/refund/messaging implementation ------------
section "No real backend/payment/courier/messaging implementation"

check_forbidden_pattern() {
  local pattern="$1" label="$2"
  local matches
  matches=$(grep -rniE "$pattern" "$WEB_SRC/components/admin/orders" "$WEB_SRC/data/admin" --include="*.ts" --include="*.tsx" || true)
  if [ -z "$matches" ]; then
    pass "$label"
  else
    fail "$label — found: $(echo "$matches" | head -3 | tr '\n' ' ')"
  fi
}

check_forbidden_pattern "stripe|razorpay|paypal|payment.?gateway.{0,15}(capture|charge)" "No payment-gateway SDK/capture code"
check_forbidden_pattern "shiprocket|delhivery\.(com|api)|bluedart\.(com|api)|fetch\(.{0,40}courier" "No live courier API integration"
check_forbidden_pattern "(email|sms|whatsapp).{0,20}(sent|delivered) successfully" "No fake email/SMS-sent success claims"
check_forbidden_pattern "refund (processed|issued|completed) automatically" "No automated-refund claims"

check_contains "$WEB_SRC/components/admin/orders/order-detail-view.tsx" "integration required" "Communication controls labelled integration required"
check_contains "$WEB_SRC/components/admin/orders/order-detail-view.tsx" "no live payment capture or refund" "Payment section discloses demo-only status"
check_contains "$WEB_SRC/components/admin/orders/order-detail-view.tsx" "no live courier API is connected" "Shipping section discloses demo-only fields"

# --- 4. blast-radius guard ---------------------------------------------------
# Scoped by mtime against a marker file written at the end of the *previous*
# task (the products/categories refinement digest) — apps/api/, compose.yaml
# etc. were created by earlier tasks in this session and were never
# committed, so git status alone can't isolate this task's edits.
section "Blast-radius guard"

MARKER="$ROOT_DIR/docs/audits/admin-products-refinement-digest.md"
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
    "apps/web/src/app/admin/customers"
    "apps/web/src/app/admin/returns"
    "apps/web/src/app/admin/reports"
    "apps/web/src/app/admin/settings"
    "apps/web/src/components/admin/dashboard"
    "apps/web/src/components/admin/products"
    "apps/web/src/components/admin/categories"
    "apps/web/src/components/admin/customers"
    "apps/web/src/components/admin/returns"
    "apps/web/src/components/admin/reports"
    "apps/web/src/components/admin/settings"
    "apps/web/src/components/admin/shell"
  )
  # Note: components/admin/ui is intentionally not in this list — this task
  # legitimately extends status-badge.tsx's tone map with the new order/
  # fulfilment/payment status vocabulary, the same "small necessary shared-
  # file edit" precedent as icons.tsx in the prior two tasks. Checked
  # individually below instead of blanket-forbidding the whole directory.
  UI_DIR="$ROOT_DIR/apps/web/src/components/admin/ui"
  if [ -d "$UI_DIR" ]; then
    UI_CHANGED=$(find "$UI_DIR" -type f -newer "$MARKER" 2>/dev/null | grep -v '/\.next/' || true)
    UI_UNEXPECTED=$(echo "$UI_CHANGED" | grep -v 'status-badge\.tsx$' || true)
    if [ -n "$(echo "$UI_UNEXPECTED" | sed '/^\s*$/d')" ]; then
      printf '  \033[31mFOUND\033[0m unexpected components/admin/ui changes: %s\n' "$UI_UNEXPECTED"
      FORBIDDEN_FOUND=1
    fi
  fi
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
