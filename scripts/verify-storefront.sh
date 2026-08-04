#!/usr/bin/env bash
# Verifies the Home/Shop/Contact storefront build meets the project's gate
# conditions. Exits 0 only when every check below passes.
#
# Usage: scripts/verify-storefront.sh
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
if pnpm typecheck:web >/tmp/verify-storefront-typecheck.log 2>&1; then
  pass "pnpm typecheck:web"
else
  fail "pnpm typecheck:web (see /tmp/verify-storefront-typecheck.log)"
fi

if pnpm lint:web >/tmp/verify-storefront-lint.log 2>&1; then
  pass "pnpm lint:web"
else
  fail "pnpm lint:web (see /tmp/verify-storefront-lint.log)"
fi

if pnpm build:web >/tmp/verify-storefront-build.log 2>&1; then
  pass "pnpm build:web"
else
  fail "pnpm build:web (see /tmp/verify-storefront-build.log)"
fi

# --- 2. routes exist -----------------------------------------------------
section "Routes"
for route in "app/page.tsx" "app/shop/page.tsx" "app/contact/page.tsx"; do
  if [ -f "$WEB_SRC/$route" ]; then
    pass "$route exists"
  else
    fail "$route is missing"
  fi
done

# --- 3. required sections present ---------------------------------------
section "Required sections"

check_render() {
  local file="$1" component="$2" label="$3"
  if [ -f "$file" ] && grep -q "$component" "$file"; then
    pass "$label"
  else
    fail "$label — <$component /> not found in $file"
  fi
}

HOME_PAGE="$WEB_SRC/app/page.tsx"
for c in HeroSection CategoryGrid GroomingFeatureStory FeaturedProducts GroomingStepsSection WalkingEssentials WhyMyPetMart CustomerFeedback; do
  check_render "$HOME_PAGE" "$c" "Home: $c"
done

SHOP_PAGE="$WEB_SRC/app/shop/page.tsx"
for c in ShopHero ShopExplorer; do
  check_render "$SHOP_PAGE" "$c" "Shop: $c"
done

CONTACT_PAGE="$WEB_SRC/app/contact/page.tsx"
for c in ContactHero ContactFormSection CommonQuestions; do
  check_render "$CONTACT_PAGE" "$c" "Contact: $c"
done

# --- 4. no forbidden commercial claims -----------------------------------
section "Forbidden commercial claims"

# The Contact FAQ intentionally shows the *questions* "Is Cash on Delivery
# available?" / "Do you ship pan-India?" with no answer copy (CLAUDE.md
# unconfirmed-claims list + DESIGN_SYSTEM.md §18) — those two files are the
# only place these phrases may legitimately appear.
FAQ_ALLOWLIST=(
  "$WEB_SRC/data/contact-data.ts"
  "$WEB_SRC/components/contact/common-questions.tsx"
)

is_allowlisted() {
  local f="$1"
  for allowed in "${FAQ_ALLOWLIST[@]}"; do
    [ "$f" = "$allowed" ] && return 0
  done
  return 1
}

check_forbidden_pattern() {
  local pattern="$1" label="$2" allow_faq="${3:-false}"
  local matches
  matches=$(grep -rniE "$pattern" "$WEB_SRC" --include="*.ts" --include="*.tsx" | grep -vE '^\s*[^:]+:\s*[0-9]+:\s*(\*|//)' || true)
  if [ "$allow_faq" = "true" ]; then
    local filtered=""
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      local file="${line%%:*}"
      is_allowlisted "$file" || filtered="$filtered$line"$'\n'
    done <<< "$matches"
    matches="$filtered"
  fi
  matches=$(echo "$matches" | sed '/^\s*$/d')
  if [ -z "$matches" ]; then
    pass "$label"
  else
    fail "$label — found: $(echo "$matches" | head -3 | tr '\n' ' ')"
  fi
}

check_forbidden_pattern "low stock" "No 'LOW STOCK' badge text"
check_forbidden_pattern "\\bverified\\b" "No 'verified' review/purchase claims"
check_forbidden_pattern "cash on delivery" "No standalone Cash on Delivery claim" true
check_forbidden_pattern "pan-india|pan india" "No standalone pan-India shipping claim" true
check_forbidden_pattern "[0-9]+[-–to ]+[0-9]+ business days" "No fixed delivery-time claim"
check_forbidden_pattern "[0-9]\\.[0-9] ?\\([0-9]+\\)" "No fabricated star-rating numbers"
check_forbidden_pattern "\\bCOD\\b" "No bare 'COD' claim outside FAQ comments" true

# --- 5. no environment/backend/Prisma files added ------------------------
section "Blast-radius guard"

FORBIDDEN_FOUND=0
while IFS= read -r -d '' f; do
  rel="${f#"$ROOT_DIR"/}"
  echo "  \033[31mFOUND\033[0m $rel"
  FORBIDDEN_FOUND=1
done < <(find "$ROOT_DIR/apps/web" -maxdepth 1 -name ".env*" -print0 2>/dev/null)

if [ -d "$ROOT_DIR/apps/api" ] && [ -n "$(find "$ROOT_DIR/apps/api" -newer "$ROOT_DIR/package.json" 2>/dev/null)" ]; then
  echo "  \033[31mFOUND\033[0m apps/api/ has files newer than package.json"
  FORBIDDEN_FOUND=1
fi

if find "$ROOT_DIR" -name "*.prisma" -not -path "*/node_modules/*" 2>/dev/null | grep -q .; then
  echo "  \033[31mFOUND\033[0m *.prisma file(s) present"
  FORBIDDEN_FOUND=1
fi

if command -v git >/dev/null 2>&1 && git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  NEW_FORBIDDEN=$(git -C "$ROOT_DIR" status --porcelain 2>/dev/null | awk '{print $2}' | grep -E '^(apps/api/|prisma/|\.env)' || true)
  if [ -n "$NEW_FORBIDDEN" ]; then
    echo "  \033[31mFOUND\033[0m git changes under a forbidden path: $(echo "$NEW_FORBIDDEN" | tr '\n' ' ')"
    FORBIDDEN_FOUND=1
  fi
fi

if [ "$FORBIDDEN_FOUND" -eq 0 ]; then
  pass "No .env, apps/api or Prisma files added/modified"
else
  fail "Forbidden files detected under apps/api/, prisma/ or .env*"
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
