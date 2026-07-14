#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "Running isolated tracking contract semantics for Issue #166"
node scripts/api/check-tracking-contract.mjs
