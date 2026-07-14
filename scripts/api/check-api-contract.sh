#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

node scripts/api/generate-frontend-client.mjs
node scripts/api/check-tracking-contract.mjs
node scripts/api/check-culture-contract.mjs

cd frontend/genealogy-web
npm run typecheck
