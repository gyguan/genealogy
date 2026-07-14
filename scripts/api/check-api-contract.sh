#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

node scripts/api/generate-frontend-client.mjs
node scripts/api/check-tracking-contract.mjs
node scripts/api/check-culture-contract.mjs

git diff --exit-code -- \
  frontend/genealogy-web/src/shared/api/generated/api-contract.ts \
  frontend/genealogy-web/src/shared/api/generated/culture-api-contract.ts \
  frontend/genealogy-web/src/shared/api/generated/tracking-types.ts \
  frontend/genealogy-web/src/shared/api/generated/culture-types.ts
