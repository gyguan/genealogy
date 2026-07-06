#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend/genealogy-backend"
OUTPUT="$ROOT_DIR/docs/api/openapi.json"
API_DOCS_URL="${API_DOCS_URL:-http://localhost:8080/api-docs}"

mkdir -p "$(dirname "$OUTPUT")"
cd "$BACKEND_DIR"

mvn -q -DskipTests spring-boot:run > /tmp/genealogy-openapi-export.log 2>&1 &
PID=$!
trap 'kill $PID >/dev/null 2>&1 || true' EXIT

for i in $(seq 1 60); do
  if curl -fsSL "$API_DOCS_URL" -o "$OUTPUT.tmp"; then
    mv "$OUTPUT.tmp" "$OUTPUT"
    echo "Exported OpenAPI contract to $OUTPUT"
    exit 0
  fi
  sleep 2
  if ! kill -0 "$PID" >/dev/null 2>&1; then
    echo "Backend stopped before OpenAPI was available. Startup log:" >&2
    tail -n 120 /tmp/genealogy-openapi-export.log >&2 || true
    exit 1
  fi
done

echo "Timed out waiting for $API_DOCS_URL. Startup log:" >&2
tail -n 120 /tmp/genealogy-openapi-export.log >&2 || true
exit 1
