#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
API="${BASE_URL}/api/v1"
RUN_ID="${RUN_ID:-$(date +%Y%m%d%H%M%S)}"
USER_NAME="mvp1_admin_${RUN_ID}"
USER_PASSWORD="Mvp1@123456"
TMP_DIR="${TMP_DIR:-/tmp/genealogy-mvp1-${RUN_ID}}"
TOKEN=""
CLAN_ID=""
BRANCH_ID=""
SCHEME_ID=""
PARENT_ID=""
CHILD_ID=""
RELATIONSHIP_ID=""
SOURCE_ID=""
ATTACHMENT_ID=""
TASK_ID=""

mkdir -p "${TMP_DIR}"

info() { echo "[MVP1] $*"; }
fail() { echo "[MVP1][FAIL] $*" >&2; exit 1; }

json_get() {
  python3 - "$1" "$2" <<'PY'
import json, sys
path = sys.argv[2].split('.')
with open(sys.argv[1], encoding='utf-8') as f:
    data = json.load(f)
for part in path:
    if part == '':
        continue
    if isinstance(data, list):
        data = data[int(part)]
    else:
        data = data.get(part)
print('' if data is None else data)
PY
}

request_json() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local output="$4"
  shift 4 || true
  local code
  if [ -n "${body}" ]; then
    code=$(curl -sS -o "${output}" -w "%{http_code}" -X "${method}" "${API}${path}" -H "Content-Type: application/json" "$@" -d "${body}")
  else
    code=$(curl -sS -o "${output}" -w "%{http_code}" -X "${method}" "${API}${path}" "$@")
  fi
  if [ "${code}" -lt 200 ] || [ "${code}" -ge 300 ]; then
    echo "HTTP ${code} ${method} ${path}" >&2
    cat "${output}" >&2 || true
    exit 1
  fi
}

request_json_expect_status() {
  local expected="$1"
  local method="$2"
  local path="$3"
  local body="${4:-}"
  local output="$5"
  shift 5 || true
  local code
  if [ -n "${body}" ]; then
    code=$(curl -sS -o "${output}" -w "%{http_code}" -X "${method}" "${API}${path}" -H "Content-Type: application/json" "$@" -d "${body}")
  else
    code=$(curl -sS -o "${output}" -w "%{http_code}" -X "${method}" "${API}${path}" "$@")
  fi
  if [ "${code}" != "${expected}" ]; then
    echo "Expected HTTP ${expected}, got ${code}: ${method} ${path}" >&2
    cat "${output}" >&2 || true
    exit 1
  fi
}

request_multipart() {
  local path="$1"
  local output="$2"
  shift 2
  local code
  code=$(curl -sS -o "${output}" -w "%{http_code}" -X POST "${API}${path}" "$@")
  if [ "${code}" -lt 200 ] || [ "${code}" -ge 300 ]; then
    echo "HTTP ${code} POST ${path}" >&2
    cat "${output}" >&2 || true
    exit 1
  fi
}

wait_health() {
  info "Checking backend health: ${API}/health"
  for _ in $(seq 1 30); do
    if curl -fsS "${API}/health" >/dev/null 2>&1; then
      info "Backend is healthy."
      return 0
    fi
    sleep 2
  done
  fail "Backend health check failed. Start backend first: mvn spring-boot:run"
}

extract_data_id() {
  json_get "$1" "data.id"
}

wait_health

info "1. Register user"
request_json POST "/auth/register" "{\"username\":\"${USER_NAME}\",\"password\":\"${USER_PASSWORD}\",\"displayName\":\"MVP1验收管理员\"}" "${TMP_DIR}/register.json"

info "2. Login"
request_json POST "/auth/login" "{\"username\":\"${USER_NAME}\",\"password\":\"${USER_PASSWORD}\"}" "${TMP_DIR}/login.json"
TOKEN=$(json_get "${TMP_DIR}/login.json" "data.accessToken")
[ -n "${TOKEN}" ] || fail "Login did not return accessToken"
AUTH=(-H "Authorization: Bearer ${TOKEN}")

info "3. Verify anonymous write is rejected"
request_json_expect_status 401 POST "/clans" "{\"clanCode\":\"NOAUTH-${RUN_ID}\",\"clanName\":\"匿名宗族\",\"surname\":\"测\"}" "${TMP_DIR}/anonymous-write.json"

info "4. Create clan"
request_json POST "/clans" "{\"clanCode\":\"MVP1-${RUN_ID}\",\"clanName\":\"MVP1验收宗族\",\"surname\":\"张\",\"hallName\":\"百忍堂\",\"originPlace\":\"湖南长沙\"}" "${TMP_DIR}/clan.json" "${AUTH[@]}"
CLAN_ID=$(extract_data_id "${TMP_DIR}/clan.json")
[ -n "${CLAN_ID}" ] || fail "Create clan did not return id"

info "5. Create branch"
request_json POST "/clans/${CLAN_ID}/branches" "{\"branchName\":\"长沙支派\",\"sortOrder\":1,\"migrationFrom\":\"江西吉安\",\"migrationTo\":\"湖南长沙\"}" "${TMP_DIR}/branch.json" "${AUTH[@]}"
BRANCH_ID=$(extract_data_id "${TMP_DIR}/branch.json")

info "6. Create generation scheme and words"
request_json POST "/clans/${CLAN_ID}/generation-schemes" "{\"branchId\":${BRANCH_ID},\"schemeName\":\"MVP1字辈\",\"poemText\":\"德承家声远\",\"startGeneration\":1,\"isDefault\":true,\"validationEnabled\":true,\"strictMode\":false}" "${TMP_DIR}/scheme.json" "${AUTH[@]}"
SCHEME_ID=$(extract_data_id "${TMP_DIR}/scheme.json")
request_json POST "/generation-schemes/${SCHEME_ID}/items" "{\"generationNo\":1,\"word\":\"德\"}" "${TMP_DIR}/word1.json" "${AUTH[@]}"
request_json POST "/generation-schemes/${SCHEME_ID}/items" "{\"generationNo\":2,\"word\":\"承\"}" "${TMP_DIR}/word2.json" "${AUTH[@]}"

info "7. Create persons"
request_json POST "/clans/${CLAN_ID}/persons" "{\"branchId\":${BRANCH_ID},\"personCode\":\"P-${RUN_ID}-1\",\"name\":\"张德明\",\"gender\":\"male\",\"generationNo\":1,\"generationWord\":\"德\",\"isLiving\":false,\"privacyLevel\":\"clan_only\"}" "${TMP_DIR}/parent.json" "${AUTH[@]}"
PARENT_ID=$(extract_data_id "${TMP_DIR}/parent.json")
request_json POST "/clans/${CLAN_ID}/persons" "{\"branchId\":${BRANCH_ID},\"personCode\":\"P-${RUN_ID}-2\",\"name\":\"张承志\",\"gender\":\"male\",\"generationNo\":2,\"generationWord\":\"承\",\"birthDate\":\"1990-01-01\",\"birthPlace\":\"湖南长沙\",\"residencePlace\":\"湖南长沙\",\"biography\":\"在世人员隐私字段\",\"isLiving\":true,\"privacyLevel\":\"clan_only\"}" "${TMP_DIR}/child.json" "${AUTH[@]}"
CHILD_ID=$(extract_data_id "${TMP_DIR}/child.json")

info "8. Verify living person masking for anonymous query"
request_json GET "/persons/${CHILD_ID}" "" "${TMP_DIR}/child-anonymous.json"
ANON_BIRTH_PLACE=$(json_get "${TMP_DIR}/child-anonymous.json" "data.birthPlace")
[ -z "${ANON_BIRTH_PLACE}" ] || fail "Living person birthPlace should be masked for anonymous query"
request_json GET "/persons/${CHILD_ID}" "" "${TMP_DIR}/child-member.json" "${AUTH[@]}"
MEMBER_BIRTH_PLACE=$(json_get "${TMP_DIR}/child-member.json" "data.birthPlace")
[ -n "${MEMBER_BIRTH_PLACE}" ] || fail "Living person birthPlace should be visible to clan member"

info "9. Relationship conflict precheck and create relationship"
request_json POST "/clans/${CLAN_ID}/relationships/check-conflict" "{\"fromPersonId\":${PARENT_ID},\"toPersonId\":${CHILD_ID},\"relationType\":\"parent_child\",\"relationLabel\":\"father\",\"isLineageRelation\":true,\"isBiological\":true,\"isPrimary\":true,\"confidenceLevel\":\"high\"}" "${TMP_DIR}/relationship-check.json" "${AUTH[@]}"
CONFLICT=$(json_get "${TMP_DIR}/relationship-check.json" "data.conflict")
[ "${CONFLICT}" = "False" ] || [ "${CONFLICT}" = "false" ] || fail "Relationship should pass conflict precheck"
request_json POST "/clans/${CLAN_ID}/relationships" "{\"fromPersonId\":${PARENT_ID},\"toPersonId\":${CHILD_ID},\"relationType\":\"parent_child\",\"relationLabel\":\"father\",\"isLineageRelation\":true,\"isBiological\":true,\"isPrimary\":true,\"confidenceLevel\":\"high\"}" "${TMP_DIR}/relationship.json" "${AUTH[@]}"
RELATIONSHIP_ID=$(extract_data_id "${TMP_DIR}/relationship.json")
request_json POST "/clans/${CLAN_ID}/relationships/check-conflict" "{\"fromPersonId\":${PARENT_ID},\"toPersonId\":${CHILD_ID},\"relationType\":\"parent_child\",\"relationLabel\":\"father\"}" "${TMP_DIR}/relationship-duplicate-check.json" "${AUTH[@]}"
DUP_CONFLICT=$(json_get "${TMP_DIR}/relationship-duplicate-check.json" "data.conflict")
[ "${DUP_CONFLICT}" = "True" ] || [ "${DUP_CONFLICT}" = "true" ] || fail "Duplicate relationship should be reported as conflict"

info "10. Create source and bind to person"
request_json POST "/clans/${CLAN_ID}/sources" "{\"sourceName\":\"MVP1验收族谱摘录\",\"sourceType\":\"genealogy_book\",\"providerName\":\"本地验收\",\"bookTitle\":\"张氏族谱\",\"excerpt\":\"验收来源摘录\"}" "${TMP_DIR}/source.json" "${AUTH[@]}"
SOURCE_ID=$(extract_data_id "${TMP_DIR}/source.json")
request_json POST "/source-bindings" "{\"sourceId\":${SOURCE_ID},\"targetType\":\"person\",\"targetId\":${PARENT_ID},\"bindingReason\":\"验收绑定\",\"excerpt\":\"验收来源摘录\"}" "${TMP_DIR}/binding.json" "${AUTH[@]}"

info "11. Upload and download attachment"
echo "MVP1 attachment ${RUN_ID}" > "${TMP_DIR}/attachment.txt"
request_multipart "/clans/${CLAN_ID}/attachments/upload" "${TMP_DIR}/attachment.json" "${AUTH[@]}" -F "sourceId=${SOURCE_ID}" -F "file=@${TMP_DIR}/attachment.txt;type=text/plain"
ATTACHMENT_ID=$(extract_data_id "${TMP_DIR}/attachment.json")
curl -fsS "${API}/attachments/${ATTACHMENT_ID}/download" "${AUTH[@]}" -o "${TMP_DIR}/attachment-download.txt"
cmp "${TMP_DIR}/attachment.txt" "${TMP_DIR}/attachment-download.txt" >/dev/null || fail "Downloaded attachment mismatch"

info "12. Submit and approve person review; verify review detail contains diff payload"
request_json POST "/persons/${CHILD_ID}/submit-review" "{\"diffSummary\":\"MVP1验收提交人物审核\"}" "${TMP_DIR}/submit-review.json" "${AUTH[@]}"
TASK_ID=$(extract_data_id "${TMP_DIR}/submit-review.json")
request_json GET "/review-tasks/${TASK_ID}" "" "${TMP_DIR}/review-task-detail.json" "${AUTH[@]}"
OLD_PAYLOAD=$(json_get "${TMP_DIR}/review-task-detail.json" "data.auditRecord.oldPayload")
NEW_PAYLOAD=$(json_get "${TMP_DIR}/review-task-detail.json" "data.auditRecord.newPayload")
[ -n "${OLD_PAYLOAD}" ] || fail "Review detail should contain oldPayload"
[ -n "${NEW_PAYLOAD}" ] || fail "Review detail should contain newPayload"
request_json POST "/review-tasks/${TASK_ID}/approve" "{\"comment\":\"MVP1验收通过\"}" "${TMP_DIR}/approve-review.json" "${AUTH[@]}"

info "13. Query tree and logs"
request_json GET "/tree/person/${PARENT_ID}/family" "" "${TMP_DIR}/tree-family.json" "${AUTH[@]}"
request_json GET "/logs/operations?clanId=${CLAN_ID}" "" "${TMP_DIR}/logs.json" "${AUTH[@]}"
request_json GET "/logs/operations/stats?clanId=${CLAN_ID}" "" "${TMP_DIR}/log-stats.json" "${AUTH[@]}"
curl -fsS "${API}/logs/operations/export.csv?clanId=${CLAN_ID}" "${AUTH[@]}" -o "${TMP_DIR}/operation-logs.csv"

info "14. Export CSV templates and data"
curl -fsS "${API}/imports/templates/persons.csv" -o "${TMP_DIR}/persons-template.csv"
curl -fsS "${API}/imports/templates/relations.csv" -o "${TMP_DIR}/relations-template.csv"
curl -fsS "${API}/clans/${CLAN_ID}/exports/persons.csv" -o "${TMP_DIR}/persons.csv"
curl -fsS "${API}/clans/${CLAN_ID}/exports/relations.csv" -o "${TMP_DIR}/relations.csv"

cat > "${TMP_DIR}/acceptance-record.txt" <<EOF
MVP1 API acceptance passed.
RunId: ${RUN_ID}
BaseUrl: ${BASE_URL}
ClanId: ${CLAN_ID}
BranchId: ${BRANCH_ID}
ParentId: ${PARENT_ID}
ChildId: ${CHILD_ID}
RelationshipId: ${RELATIONSHIP_ID}
SourceId: ${SOURCE_ID}
AttachmentId: ${ATTACHMENT_ID}
ReviewTaskId: ${TASK_ID}
TempDir: ${TMP_DIR}
EOF

info "Acceptance passed. Record: ${TMP_DIR}/acceptance-record.txt"
cat "${TMP_DIR}/acceptance-record.txt"
