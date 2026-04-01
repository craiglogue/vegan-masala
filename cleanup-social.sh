#!/usr/bin/env bash
set -euo pipefail

echo "== Vegan Masala social cleanup =="

if [ ! -f package.json ]; then
  echo "❌ Run this from your project root (where package.json is)."
  exit 1
fi

echo "→ Creating git backup branch..."
branch_name="cleanup-social-generator-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$branch_name"

echo "→ Removing old generated image files..."
rm -f public/generated/instagram/*.png 2>/dev/null || true
rm -f public/generated/instagram/*.jpg 2>/dev/null || true
rm -f public/generated/pinterest/*.png 2>/dev/null || true
rm -f public/generated/pinterest/*.jpg 2>/dev/null || true
rm -f generated/instagram/*.png 2>/dev/null || true
rm -f generated/instagram/*.jpg 2>/dev/null || true
rm -f generated/pinterest/*.png 2>/dev/null || true
rm -f generated/pinterest/*.jpg 2>/dev/null || true

echo "→ Removing Creatomate-only helper if present..."
rm -f src/lib/social/creatomate.ts

echo "→ Leaving current local generators in place for now:"
echo "   - src/lib/social/generateInstagram.ts"
echo "   - src/lib/social/generatePinterest.ts"
echo "   - src/app/api/admin/social/route.ts"
echo "   - src/lib/social/core/*"

echo "→ Cleanup complete."
echo
echo "Backup branch created:"
echo "   $branch_name"
echo
echo "Next step: we build the new local Instagram generator cleanly."
