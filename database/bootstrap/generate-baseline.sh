#!/usr/bin/env bash
# Generate a fresh-install PostgreSQL baseline from the ACTUAL migrated schema.
# Does not modify the checked-in Flyway history or any existing database.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND="$ROOT/backend/genealogy-backend"
OUT="${1:-$ROOT/database/bootstrap/generated}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
for tool in docker mvn timeout; do
  command -v "$tool" >/dev/null || { echo "Required command missing: $tool" >&2; exit 2; }
done
cid=""
app_pid=""
cleanup() {
  if [ -n "$app_pid" ]; then kill "$app_pid" 2>/dev/null || true; wait "$app_pid" 2>/dev/null || true; fi
  if [ -n "$cid" ]; then docker rm -f "$cid" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT
# Use an isolated ephemeral database; never touch user's real data.
cid="$(docker run -d --rm -e POSTGRES_DB=genealogy_baseline -e POSTGRES_USER=genealogy -e POSTGRES_PASSWORD=local_baseline_only -p 127.0.0.1::5432 postgres:16)"
port="$(docker port "$cid" 5432/tcp | head -1 | sed 's/.*://')"
for i in $(seq 1 60); do
  if docker exec "$cid" pg_isready -U genealogy -d genealogy_baseline >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$cid" pg_isready -U genealogy -d genealogy_baseline >/dev/null
# Flyway runs via the real application, exercising exactly the checked-in migrations.
(cd "$BACKEND" && DB_URL="jdbc:postgresql://localhost:$port/genealogy_baseline" \
  DB_USERNAME=genealogy DB_PASSWORD=local_baseline_only SERVER_PORT=0 \
  GENEALOGY_AUTH_DEMO_MODE_ENABLED=false \
  mvn -q -DskipTests spring-boot:run -Dspring-boot.run.profiles=local -Dspring-boot.run.arguments=--spring.flyway.locations=classpath:db/migration \
  >"$OUT/application-startup.log" 2>&1) &
app_pid=$!
ok=0
for i in $(seq 1 120); do
  if docker exec "$cid" psql -U genealogy -d genealogy_baseline -Atc \
    "select count(*) from flyway_schema_history where success" 2>/dev/null | grep -Eq '^[1-9][0-9]*$'; then
    # Wait for full application initialization, not just Flyway's first migration.
    if grep -Eq 'Started GenealogyApplication|Started .*Application' "$OUT/application-startup.log"; then ok=1; break; fi
  fi
  if ! kill -0 "$app_pid" 2>/dev/null; then break; fi
  sleep 2
done
if [ "$ok" -ne 1 ]; then
  echo "Application/Flyway did not finish successfully; see $OUT/application-startup.log" >&2
  exit 1
fi
# pg_dump reconstructs final CREATE TABLE / constraints / indexes, NOT historical ALTER chains.
docker exec "$cid" pg_dump -U genealogy -d genealogy_baseline \
  --schema-only --no-owner --no-privileges --exclude-table=flyway_schema_history \
  | awk 'substr($0,1,1) != sprintf("%c",92)' >"$OUT/V1__create_current_schema.sql"
# System RBAC reference data must be present on an otherwise empty installation.
docker exec "$cid" pg_dump -U genealogy -d genealogy_baseline \
  --data-only --inserts --column-inserts --no-owner --no-privileges \
  --table=public.app_role --table=public.app_permission --table=public.app_role_permission \
  | awk 'substr($0,1,1) != sprintf("%c",92)' >"$OUT/V2__seed_system_authorization.sql"
# Validate both artifacts against an empty scratch database without starting the app.
docker exec "$cid" psql -U genealogy -d postgres -v ON_ERROR_STOP=1 \
  -c 'CREATE DATABASE genealogy_baseline_verify' >/dev/null
docker exec -i "$cid" psql -U genealogy -d genealogy_baseline_verify -v ON_ERROR_STOP=1 \
  <"$OUT/V1__create_current_schema.sql" >"$OUT/verify.log"
docker exec -i "$cid" psql -U genealogy -d genealogy_baseline_verify -v ON_ERROR_STOP=1 \
  <"$OUT/V2__seed_system_authorization.sql" >>"$OUT/verify.log"
docker exec "$cid" psql -U genealogy -d genealogy_baseline_verify -Atc \
  "select 'tables=' || count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';" \
  >>"$OUT/verify.log"
# End-to-end Flyway verification: install the new baseline into a THIRD empty database.
docker exec "$cid" psql -U genealogy -d postgres -v ON_ERROR_STOP=1 \
  -c 'CREATE DATABASE genealogy_baseline_runtime' >/dev/null
# The baseline is generated in the output folder; Spring Boot still loads embedded classpath resources.
# Run direct Flyway against the generated SQL files with temporary filesystem locations.
if [ -n "$app_pid" ]; then kill "$app_pid" 2>/dev/null || true; wait "$app_pid" 2>/dev/null || true; app_pid=""; fi
(cd "$BACKEND" && DB_URL="jdbc:postgresql://localhost:$port/genealogy_baseline_runtime" \
  DB_USERNAME=genealogy DB_PASSWORD=local_baseline_only SERVER_PORT=0 \
  GENEALOGY_AUTH_DEMO_MODE_ENABLED=false \
  mvn -q -DskipTests spring-boot:run -Dspring-boot.run.profiles=local \
  "-Dspring-boot.run.arguments=--spring.flyway.locations=filesystem:$OUT" \
  >"$OUT/baseline-runtime.log" 2>&1) &
app_pid=$!
runtime_ok=0
for i in $(seq 1 120); do
  if grep -Eq 'Started GenealogyApplication|Started .*Application' "$OUT/baseline-runtime.log"; then runtime_ok=1; break; fi
  if ! kill -0 "$app_pid" 2>/dev/null; then break; fi
  sleep 2
done
if [ "$runtime_ok" -ne 1 ]; then
  echo "Fresh Flyway baseline startup failed; see $OUT/baseline-runtime.log" >&2
  exit 1
fi
docker exec "$cid" psql -U genealogy -d genealogy_baseline_runtime -Atc \
  "select 'migrations=' || count(*) from flyway_schema_history where success;" \
  >>"$OUT/verify.log"
echo "Generated schema and RBAC seed: $OUT"
echo "IMPORTANT: Generated output is NOT activated until reviewed and committed to db/migration."
