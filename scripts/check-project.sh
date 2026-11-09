#!/usr/bin/env bash
# SignLab final-project checker — run from Git Bash: bash scripts/check-project.sh
set -euo pipefail
cd "$(dirname "$0")/.."
errors=0
check() { if test -f "$1"; then printf 'PASS  %s\n' "$1"; else printf 'FAIL  %s is missing\n' "$1"; errors=$((errors + 1)); fi; }
for file in index.html app.js style.css practice.js motion.js database.js dictionary.js training-share.js README.md AI_USAGE.md PROJECT_SETUP.md data/README.md; do
  check "$file"
done
for letter in {a..z}; do check "assets/letters/${letter}.png"; done
if command -v node >/dev/null 2>&1; then
  for file in app.js practice.js motion.js database.js dictionary.js training-share.js; do
    if node --check "$file"; then echo "PASS  JS syntax: $file"; else echo "FAIL  JS syntax: $file"; errors=$((errors + 1)); fi
  done
else
  echo 'SKIP  Node.js not found; cannot check JavaScript syntax.'
fi
if grep -q 'motion.js' index.html && grep -q 'database.js' index.html && grep -q 'dictionary.js' index.html && grep -q 'training-share.js' index.html; then
  echo 'PASS  Motion, database, API, and sharing scripts linked in HTML'
else
  echo 'FAIL  Missing HTML script links'; errors=$((errors + 1))
fi
printf '\nFinal result: %s issue(s).\n' "$errors"
if (( errors > 0 )); then exit 1; fi
