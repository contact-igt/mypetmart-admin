#!/bin/bash
# Starts the Next.js dev server for apps/web.
# Used by .claude/launch.json — runs in non-interactive environments
# where fnm and Homebrew are not on PATH.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec /opt/homebrew/bin/node "$ROOT/apps/web/node_modules/.bin/next" dev
