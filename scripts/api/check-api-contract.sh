#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

node scripts/api/generate-frontend-client.mjs

git diff --exit-code -- frontend/genealogy-web/src/shared/api/generated/api-contract.ts
