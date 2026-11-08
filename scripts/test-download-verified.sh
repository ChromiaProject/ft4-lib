#!/bin/bash
# Regression test for scripts/download-verified.sh: a tampered archive must never be accepted.
# Run: ./scripts/test-download-verified.sh
set -u
source "$(dirname "${BASH_SOURCE[0]}")/download-verified.sh"

failures=0
pass() { echo "ok   - $1"; }
fail() { echo "FAIL - $1"; failures=$((failures + 1)); }

file=$(mktemp)
trap 'rm -f "$file"' EXIT
printf 'trusted archive' > "$file"
good=$(sha256sum "$file" | cut -d' ' -f1)
wrong=0000000000000000000000000000000000000000000000000000000000000000

if verify_sha256 "$file" "$good"; then pass "matching checksum is accepted"; else fail "matching checksum is accepted"; fi
if verify_sha256 "$file" "$wrong"; then fail "wrong checksum is rejected"; else pass "wrong checksum is rejected"; fi
if verify_sha256 "$file" ""; then fail "empty checksum is rejected"; else pass "empty checksum is rejected"; fi
printf 'tampered' >> "$file"
if verify_sha256 "$file" "$good"; then fail "modified file is rejected"; else pass "modified file is rejected"; fi

if [ "$failures" -eq 0 ]; then echo "all passed"; else echo "$failures failed"; exit 1; fi
