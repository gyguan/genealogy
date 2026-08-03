#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-scenario}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 2
fi

PSQL=(psql "${DATABASE_URL}" -X --set=ON_ERROR_STOP=on)

reset_data() {
  "${PSQL[@]}" \
    --set=confirm_reset=RESET_CURRENT_GENEALOGY_DATA \
    --file="${SCRIPT_DIR}/00_reset_current_business_data.sql"
}

seed_scenarios() {
  "${PSQL[@]}" --file="${SCRIPT_DIR}/10_seed_current_scenarios.sql"
}

generate_performance() {
  "${PSQL[@]}" \
    --set=dataset_code="${DATASET_CODE:-PERF}" \
    --set=perf_clans="${PERF_CLANS:-2}" \
    --set=persons_per_clan="${PERSONS_PER_CLAN:-5000}" \
    --set=branches_per_clan="${BRANCHES_PER_CLAN:-30}" \
    --set=children_per_parent="${CHILDREN_PER_PARENT:-3}" \
    --set=spouse_every="${SPOUSE_EVERY:-5}" \
    --set=source_bind_every="${SOURCE_BIND_EVERY:-100}" \
    --file="${SCRIPT_DIR}/20_generate_current_performance.sql"
}

verify_data() {
  "${PSQL[@]}" --file="${SCRIPT_DIR}/30_verify_current_data.sql"
}

case "${MODE}" in
  reset)
    reset_data
    ;;
  scenario)
    reset_data
    seed_scenarios
    verify_data
    ;;
  performance)
    generate_performance
    verify_data
    ;;
  all)
    reset_data
    seed_scenarios
    generate_performance
    verify_data
    ;;
  verify)
    verify_data
    ;;
  *)
    echo "Usage: $0 {reset|scenario|performance|all|verify}" >&2
    exit 2
    ;;
esac
