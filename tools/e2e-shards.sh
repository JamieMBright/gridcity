#!/usr/bin/env bash
# Run the Playwright e2e suite SPEC-BY-SPEC (bite-size) so one huge run can't
# hang or thrash the agent/gate (owner: "broken up into smaller bitesize tests").
# Each spec file gets its OWN fresh dev server on its OWN port + a hard timeout,
# results are logged per-spec under /tmp/e2e-shards/, and the run CONTINUES past
# failures so you get a full picture in one pass. A wedged spec is killed by its
# timeout instead of stalling everything.
#
# Usage:
#   bash tools/e2e-shards.sh                 # all non-helper specs
#   bash tools/e2e-shards.sh cityload        # only specs matching "cityload"
#   PER_SPEC_TIMEOUT=300 bash tools/e2e-shards.sh
set -u
cd "$(dirname "$0")/.."
BASE_PORT="${PW_PORT:-5200}"
PER_SPEC_TIMEOUT="${PER_SPEC_TIMEOUT:-480}"
mkdir -p /tmp/e2e-shards
filter="${1:-}"

specs=$(ls e2e/*.spec.ts | grep -vE '\.helper\.spec\.ts$')
[ -n "$filter" ] && specs=$(echo "$specs" | grep "$filter")

pass=0; fail=0; failed=""
port="$BASE_PORT"
for spec in $specs; do
  name=$(basename "$spec" .spec.ts)
  log="/tmp/e2e-shards/$name.log"
  printf '▶ %-32s ' "$name"
  if PW_PORT="$port" timeout -k 15 "$PER_SPEC_TIMEOUT" \
       npx playwright test "$spec" --workers=2 --reporter=line > "$log" 2>&1; then
    echo "✓ PASS ($(grep -aoE '[0-9]+ passed' "$log" | tail -1))"
    pass=$((pass + 1))
  else
    echo "✘ FAIL ($(grep -aoE '[0-9]+ failed|Timed out|timeout' "$log" | tail -1)) — $log"
    fail=$((fail + 1)); failed="$failed $name"
  fi
  port=$((port + 1)) # fresh port per spec → a killed run can't block the next
done
echo "=== E2E SHARDS DONE: ${pass} spec-files passed, ${fail} failed${failed:+ →$failed} ==="
[ "$fail" -eq 0 ]
