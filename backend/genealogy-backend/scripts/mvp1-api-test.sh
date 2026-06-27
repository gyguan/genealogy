#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
API="${BASE_URL}/api/v1"
RUN_ID="${RUN_ID:-$(date +%Y%m%d%H%M%S)}"
TMP_DIR="${TMP_DIR:-/tmp/genealogy-mvp1-${RUN_ID}}"
USER_NAME="mvp1_admin_${RUN_ID}"
USER_PASSWORD="Mvp1@123456"
mkdir -p "${TMP_DIR}"

info() { echo "[MVP1] $*"; }
fail() { echo "[MVP1][FAIL] $*" >&2; exit 1; }

json_get() {
  python3 - "$1" "$2" <<'PY'
import json, sys
obj=json.load(open(sys.argv[1], encoding='utf-8'))
for p in sys.argv[2].split('.'):
    if not p: continue
    obj = obj[int(p)] if isinstance(obj, list) else obj.get(p)
print('' if obj is None else obj)
PY
}

api() {
  local method="$1" path="$2" body="${3:-}" out="$4"; shift 4 || true
  local code
  if [ -n "$body" ]; then
    code=$(curl -sS -o "$out" -w "%{http_code}" -X "$method" "$API$path" -H "Content-Type: application/json" "$@" -d "$body")
  else
    code=$(curl -sS -o "$out" -w "%{http_code}" -X "$method" "$API$path" "$@")
  fi
  [[ "$code" =~ ^2 ]] || { echo "HTTP $code $method $path" >&2; cat "$out" >&2 || true; exit 1; }
}

api_expect() {
  local expected="$1" method="$2" path="$3" body="${4:-}" out="$5"; shift 5 || true
  local code
  if [ -n "$body" ]; then
    code=$(curl -sS -o "$out" -w "%{http_code}" -X "$method" "$API$path" -H "Content-Type: application/json" "$@" -d "$body")
  else
    code=$(curl -sS -o "$out" -w "%{http_code}" -X "$method" "$API$path" "$@")
  fi
  [ "$code" = "$expected" ] || { echo "Expected $expected got $code: $method $path" >&2; cat "$out" >&2 || true; exit 1; }
}

for _ in $(seq 1 30); do curl -fsS "$API/health" >/dev/null 2>&1 && break || sleep 2; done
curl -fsS "$API/health" >/dev/null || fail "Backend health check failed"

info "Register and login"
api POST /auth/register "{\"username\":\"$USER_NAME\",\"password\":\"$USER_PASSWORD\",\"displayName\":\"MVP1验收管理员\"}" "$TMP_DIR/register.json"
api POST /auth/login "{\"username\":\"$USER_NAME\",\"password\":\"$USER_PASSWORD\"}" "$TMP_DIR/login.json"
TOKEN=$(json_get "$TMP_DIR/login.json" data.accessToken)
[ -n "$TOKEN" ] || fail "No token returned"
AUTH=(-H "Authorization: Bearer $TOKEN")

info "Verify anonymous write is rejected"
api_expect 400 POST /clans "{\"clanCode\":\"NOAUTH-$RUN_ID\",\"clanName\":\"匿名宗族\",\"surname\":\"测\"}" "$TMP_DIR/noauth.json"
[ "$(json_get "$TMP_DIR/noauth.json" code)" = "AUTH_UNAUTHORIZED" ] || fail "Expected AUTH_UNAUTHORIZED"

info "Create clan / branch / generation"
api POST /clans "{\"clanCode\":\"MVP1-$RUN_ID\",\"clanName\":\"MVP1验收宗族\",\"surname\":\"张\"}" "$TMP_DIR/clan.json" "${AUTH[@]}"
CLAN_ID=$(json_get "$TMP_DIR/clan.json" data.id)
api POST "/clans/$CLAN_ID/branches" "{\"branchName\":\"长沙支派\",\"sortOrder\":1}" "$TMP_DIR/branch.json" "${AUTH[@]}"
BRANCH_ID=$(json_get "$TMP_DIR/branch.json" data.id)
api POST "/clans/$CLAN_ID/generation-schemes" "{\"branchId\":$BRANCH_ID,\"schemeName\":\"MVP1字辈\",\"isDefault\":true,\"validationEnabled\":true,\"strictMode\":false}" "$TMP_DIR/scheme.json" "${AUTH[@]}"
SCHEME_ID=$(json_get "$TMP_DIR/scheme.json" data.id)
api POST "/generation-schemes/$SCHEME_ID/items" "{\"generationNo\":1,\"word\":\"德\"}" "$TMP_DIR/word1.json" "${AUTH[@]}"
api POST "/generation-schemes/$SCHEME_ID/items" "{\"generationNo\":2,\"word\":\"承\"}" "$TMP_DIR/word2.json" "${AUTH[@]}"

info "Create persons and verify privacy masking"
api POST "/clans/$CLAN_ID/persons" "{\"branchId\":$BRANCH_ID,\"personCode\":\"P-$RUN_ID-1\",\"name\":\"张德明\",\"gender\":\"male\",\"generationNo\":1,\"generationWord\":\"德\",\"isLiving\":false}" "$TMP_DIR/parent.json" "${AUTH[@]}"
PARENT_ID=$(json_get "$TMP_DIR/parent.json" data.id)
api POST "/clans/$CLAN_ID/persons" "{\"branchId\":$BRANCH_ID,\"personCode\":\"P-$RUN_ID-2\",\"name\":\"张承志\",\"gender\":\"male\",\"generationNo\":2,\"generationWord\":\"承\",\"birthPlace\":\"湖南长沙\",\"isLiving\":true,\"privacyLevel\":\"clan_only\"}" "$TMP_DIR/child.json" "${AUTH[@]}"
CHILD_ID=$(json_get "$TMP_DIR/child.json" data.id)
api GET "/persons/$CHILD_ID" "" "$TMP_DIR/child-anon.json"
[ -z "$(json_get "$TMP_DIR/child-anon.json" data.birthPlace)" ] || fail "birthPlace should be masked"

info "Relationship conflict check and creation"
REL_BODY="{\"fromPersonId\":$PARENT_ID,\"toPersonId\":$CHILD_ID,\"relationType\":\"parent_child\",\"relationLabel\":\"father\",\"isLineageRelation\":true,\"isBiological\":true,\"isPrimary\":true,\"confidenceLevel\":\"high\"}"
api POST "/clans/$CLAN_ID/relationships/check-conflict" "$REL_BODY" "$TMP_DIR/rel-check.json" "${AUTH[@]}"
api POST "/clans/$CLAN_ID/relationships" "$REL_BODY" "$TMP_DIR/relationship.json" "${AUTH[@]}"
RELATIONSHIP_ID=$(json_get "$TMP_DIR/relationship.json" data.id)

info "Source, binding, attachment"
api POST "/clans/$CLAN_ID/sources" "{\"sourceName\":\"MVP1验收族谱摘录\",\"sourceType\":\"genealogy_book\"}" "$TMP_DIR/source.json" "${AUTH[@]}"
SOURCE_ID=$(json_get "$TMP_DIR/source.json" data.id)
api POST /source-bindings "{\"sourceId\":$SOURCE_ID,\"targetType\":\"person\",\"targetId\":$PARENT_ID}" "$TMP_DIR/binding.json" "${AUTH[@]}"
echo "MVP1 attachment $RUN_ID" > "$TMP_DIR/attachment.txt"
curl -fsS -X POST "$API/clans/$CLAN_ID/attachments/upload" "${AUTH[@]}" -F "sourceId=$SOURCE_ID" -F "file=@$TMP_DIR/attachment.txt;type=text/plain" -o "$TMP_DIR/attachment.json"
ATTACHMENT_ID=$(json_get "$TMP_DIR/attachment.json" data.id)
curl -fsS "$API/attachments/$ATTACHMENT_ID/download" "${AUTH[@]}" -o "$TMP_DIR/attachment-download.txt"
cmp "$TMP_DIR/attachment.txt" "$TMP_DIR/attachment-download.txt" >/dev/null || fail "Attachment download mismatch"

info "Review detail with diff"
api POST "/persons/$CHILD_ID/submit-review" "{\"diffSummary\":\"MVP1验收提交人物审核\"}" "$TMP_DIR/submit.json" "${AUTH[@]}"
TASK_ID=$(json_get "$TMP_DIR/submit.json" data.id)
api GET "/review-tasks/$TASK_ID" "" "$TMP_DIR/review-detail.json" "${AUTH[@]}"
[ -n "$(json_get "$TMP_DIR/review-detail.json" data.auditRecord.oldPayload)" ] || fail "Missing oldPayload"
[ -n "$(json_get "$TMP_DIR/review-detail.json" data.auditRecord.newPayload)" ] || fail "Missing newPayload"
api POST "/review-tasks/$TASK_ID/approve" "{\"comment\":\"MVP1验收通过\"}" "$TMP_DIR/approve.json" "${AUTH[@]}"

info "Tree, logs, stats, exports"
api GET "/tree/person/$PARENT_ID/family" "" "$TMP_DIR/tree.json" "${AUTH[@]}"
api GET "/logs/operations?clanId=$CLAN_ID" "" "$TMP_DIR/logs.json" "${AUTH[@]}"
api GET "/logs/operations/stats?clanId=$CLAN_ID" "" "$TMP_DIR/log-stats.json" "${AUTH[@]}"
curl -fsS "$API/logs/operations/export.csv?clanId=$CLAN_ID" "${AUTH[@]}" -o "$TMP_DIR/operation-logs.csv"
curl -fsS "$API/imports/templates/persons.csv" -o "$TMP_DIR/persons-template.csv"
curl -fsS "$API/imports/templates/relations.csv" -o "$TMP_DIR/relations-template.csv"
curl -fsS "$API/clans/$CLAN_ID/exports/persons.csv" -o "$TMP_DIR/persons.csv"
curl -fsS "$API/clans/$CLAN_ID/exports/relations.csv" -o "$TMP_DIR/relations.csv"

cat > "$TMP_DIR/acceptance-record.txt" <<EOF
MVP1 API acceptance passed.
RunId: $RUN_ID
BaseUrl: $BASE_URL
ClanId: $CLAN_ID
BranchId: $BRANCH_ID
ParentId: $PARENT_ID
ChildId: $CHILD_ID
RelationshipId: $RELATIONSHIP_ID
SourceId: $SOURCE_ID
AttachmentId: $ATTACHMENT_ID
ReviewTaskId: $TASK_ID
TempDir: $TMP_DIR
EOF

info "Acceptance passed. Record: $TMP_DIR/acceptance-record.txt"
cat "$TMP_DIR/acceptance-record.txt"
