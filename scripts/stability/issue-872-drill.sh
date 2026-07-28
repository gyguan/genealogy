#!/usr/bin/env bash
set -euo pipefail

base_url="${BASE_URL:-http://127.0.0.1:8080}"
results_dir="${STABILITY_RESULTS_DIR:-stability-results}"
backend_jar="${BACKEND_JAR:-backend/genealogy-backend/target/genealogy-backend-0.1.0-SNAPSHOT.jar}"
mkdir -p "$results_dir"

start_backend() {
  java -Xms256m -Xmx768m -jar "$backend_jar" >> "$results_dir/backend.log" 2>&1 &
  BACKEND_PID=$!
  echo "$BACKEND_PID" > "$results_dir/backend.pid"
  for _ in $(seq 1 90); do
    if (echo > /dev/tcp/127.0.0.1/8080) >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  tail -n 200 "$results_dir/backend.log" || true
  return 1
}

stop_backend() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID"
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}

wait_unavailable() {
  for _ in $(seq 1 30); do
    if ! curl -sS --max-time 1 "$base_url/api/v1/auth/me" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

started_at=$(date +%s)
start_backend

export PERFORMANCE_RESULTS_DIR="$results_dir/seed"
bash scripts/performance/seed-capacity-test.sh
source <(grep '^CAPACITY_' "$GITHUB_ENV")

login_payload=$(jq -nc --arg username "$CAPACITY_USERNAME" --arg password "$CAPACITY_PASSWORD" '{username:$username,password:$password,rememberMe:false}')
curl -sS --fail-with-body -H 'Content-Type: application/json' --data-binary "$login_payload" "$base_url/api/v1/auth/login" > "$results_dir/login-before.json"
access_token=$(jq -r '.data.accessToken // empty' "$results_dir/login-before.json")
test -n "$access_token"

query_tree() {
  curl -sS --fail-with-body -H "Authorization: Bearer $access_token" \
    "$base_url/api/v1/tree/person/$CAPACITY_ROOT_PERSON_ID?direction=descendants&dataView=official&maxDepth=20&maxNodes=500&maxEdges=800"
}

query_tree > "$results_dir/tree-before.json"
jq -e '.success == true' "$results_dir/tree-before.json" >/dev/null

psql -Atc "select count(*) from person where id in (select id from person where branch_id=$CAPACITY_BRANCH_ID)" > "$results_dir/person-count-before.txt"
psql -Atc "select count(*) from relationship where from_person_id=$CAPACITY_ROOT_PERSON_ID or to_person_id=$CAPACITY_ROOT_PERSON_ID" > "$results_dir/relation-count-before.txt"
psql -Atc "select count(*) from flyway_schema_history" > "$results_dir/flyway-count-before.txt"

# Short stability load with resource samples. Duration is configurable for 24/48/72h workflow dispatch.
duration_seconds="${STABILITY_DURATION_SECONDS:-180}"
echo 'timestamp,cpu_percent,rss_kb,threads,open_fds,db_connections' > "$results_dir/resource-samples.csv"
load_end=$(( $(date +%s) + duration_seconds ))
iteration=0
while (( $(date +%s) < load_end )); do
  iteration=$((iteration + 1))
  query_tree > /dev/null
  curl -sS --fail-with-body -H "Authorization: Bearer $access_token" "$base_url/api/v1/clans/$CAPACITY_CLAN_ID/persons?page=1&pageSize=20" > /dev/null
  cpu=$(ps -p "$BACKEND_PID" -o %cpu= | xargs)
  rss=$(ps -p "$BACKEND_PID" -o rss= | xargs)
  threads=$(ps -o nlwp= -p "$BACKEND_PID" | xargs)
  fds=$(find "/proc/$BACKEND_PID/fd" -mindepth 1 -maxdepth 1 2>/dev/null | wc -l)
  db_conn=$(psql -Atc "select numbackends from pg_stat_database where datname=current_database()")
  echo "$(date -u +%FT%TZ),${cpu:-0},${rss:-0},${threads:-0},${fds:-0},${db_conn:-0}" >> "$results_dir/resource-samples.csv"
  sleep "${STABILITY_THINK_SECONDS:-0.5}"
done
echo "$iteration" > "$results_dir/load-iterations.txt"

# Backend restart and session continuity check.
restart_begin=$(date +%s%3N)
stop_backend
wait_unavailable
start_backend
restart_end=$(date +%s%3N)
echo $((restart_end-restart_begin)) > "$results_dir/backend-rto-ms.txt"
query_tree > "$results_dir/tree-after-backend-restart.json"
jq -e '.success == true' "$results_dir/tree-after-backend-restart.json" >/dev/null

# Real backup, destructive loss simulation and restore.
pg_dump --format=custom --file="$results_dir/genealogy.backup" "$PGDATABASE"
test -s "$results_dir/genealogy.backup"
sha256sum "$results_dir/genealogy.backup" > "$results_dir/backup.sha256"
backup_epoch=$(date +%s)

stop_backend
psql -v ON_ERROR_STOP=1 -c 'drop schema public cascade; create schema public;'
restore_begin=$(date +%s%3N)
pg_restore --exit-on-error --no-owner --dbname="$PGDATABASE" "$results_dir/genealogy.backup"
restore_end=$(date +%s%3N)
echo $((restore_end-restore_begin)) > "$results_dir/database-rto-ms.txt"
restore_epoch=$(date +%s)
echo $((restore_epoch-backup_epoch)) > "$results_dir/rpo-seconds.txt"

start_backend
# New login after full database restore verifies authentication and Flyway startup.
curl -sS --fail-with-body -H 'Content-Type: application/json' --data-binary "$login_payload" "$base_url/api/v1/auth/login" > "$results_dir/login-after-restore.json"
access_token=$(jq -r '.data.accessToken // empty' "$results_dir/login-after-restore.json")
test -n "$access_token"
query_tree > "$results_dir/tree-after-restore.json"
jq -e '.success == true' "$results_dir/tree-after-restore.json" >/dev/null

psql -Atc "select count(*) from person where branch_id=$CAPACITY_BRANCH_ID" > "$results_dir/person-count-after.txt"
psql -Atc "select count(*) from relationship where from_person_id=$CAPACITY_ROOT_PERSON_ID or to_person_id=$CAPACITY_ROOT_PERSON_ID" > "$results_dir/relation-count-after.txt"
psql -Atc "select count(*) from flyway_schema_history" > "$results_dir/flyway-count-after.txt"
cmp "$results_dir/person-count-before.txt" "$results_dir/person-count-after.txt"
cmp "$results_dir/relation-count-before.txt" "$results_dir/relation-count-after.txt"
cmp "$results_dir/flyway-count-before.txt" "$results_dir/flyway-count-after.txt"

# Resource growth gate compares early and late sample medians to avoid one-sample noise.
python3 - <<'PY'
import csv, json, os, statistics, pathlib
p=pathlib.Path(os.environ.get('STABILITY_RESULTS_DIR','stability-results'))
rows=list(csv.DictReader((p/'resource-samples.csv').open()))
def vals(name, rows): return [float(r[name]) for r in rows if r.get(name)]
window=max(3,min(20,len(rows)//4 or 3))
early=rows[:window]; late=rows[-window:]
metrics={}
limits={'rss_kb':1.35,'threads':1.25,'open_fds':1.35,'db_connections':1.50}
failed=[]
for name,limit in limits.items():
    a=statistics.median(vals(name,early) or [0]); b=statistics.median(vals(name,late) or [0])
    ratio=(b/a) if a else (1 if b==0 else 999)
    metrics[name]={'earlyMedian':a,'lateMedian':b,'ratio':ratio,'limit':limit}
    if ratio>limit: failed.append(name)
json.dump({'metrics':metrics,'failed':failed},(p/'resource-growth.json').open('w'),indent=2)
if failed: raise SystemExit('resource growth threshold failed: '+','.join(failed))
PY

rto_backend=$(cat "$results_dir/backend-rto-ms.txt")
rto_db=$(cat "$results_dir/database-rto-ms.txt")
rpo=$(cat "$results_dir/rpo-seconds.txt")
test "$rto_backend" -lt "${BACKEND_RTO_MS:-60000}"
test "$rto_db" -lt "${DATABASE_RTO_MS:-120000}"
test "$rpo" -le "${RPO_SECONDS:-10}"

finished_at=$(date +%s)
jq -n \
  --argjson durationSeconds "$duration_seconds" \
  --argjson iterations "$iteration" \
  --argjson backendRtoMs "$rto_backend" \
  --argjson databaseRtoMs "$rto_db" \
  --argjson rpoSeconds "$rpo" \
  --argjson elapsedSeconds "$((finished_at-started_at))" \
  '{passed:true,durationSeconds:$durationSeconds,iterations:$iterations,backendRtoMs:$backendRtoMs,databaseRtoMs:$databaseRtoMs,rpoSeconds:$rpoSeconds,elapsedSeconds:$elapsedSeconds,critical:0,high:0}' > "$results_dir/summary.json"

stop_backend
