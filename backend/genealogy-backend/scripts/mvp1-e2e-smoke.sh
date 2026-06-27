#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
API="$BASE_URL/api/v1"
TS="$(date +%s)"
USERNAME="mvp_admin_$TS"
PASSWORD="Passw0rd-$TS"

json_get() {
  python3 -c "import json,sys; data=json.load(sys.stdin); cur=data;\nfor part in sys.argv[1].split('.'):\n    cur=cur.get(part) if isinstance(cur, dict) else None\nprint('' if cur is None else cur)" "$1"
}

post_json() {
  local path="$1"
  local body="$2"
  curl -sS -X POST "$API$path" \
    -H "Content-Type: application/json" \
    ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
    -d "$body"
}

put_json() {
  local path="$1"
  local body="$2"
  curl -sS -X PUT "$API$path" \
    -H "Content-Type: application/json" \
    ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
    -d "$body"
}

echo "[1/12] health"
curl -sS "$API/health" >/dev/null

echo "[2/12] register user"
post_json "/auth/register" "{\"username\":\"$USERNAME\",\"displayName\":\"MVP管理员\",\"password\":\"$PASSWORD\"}" >/dev/null

echo "[3/12] login"
TOKEN=""
LOGIN_RESP=$(post_json "/auth/login" "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RESP" | json_get data.accessToken)
if [[ -z "$TOKEN" ]]; then
  echo "login failed: $LOGIN_RESP" >&2
  exit 1
fi

echo "[4/12] create clan"
CLAN_RESP=$(post_json "/clans" "{\"clanName\":\"MVP测试宗族$TS\",\"surname\":\"张\",\"clanCode\":\"MVP$TS\"}")
CLAN_ID=$(echo "$CLAN_RESP" | json_get data.id)

echo "[5/12] create branch"
BRANCH_RESP=$(post_json "/clans/$CLAN_ID/branches" "{\"branchName\":\"长房\",\"sortOrder\":1}")
BRANCH_ID=$(echo "$BRANCH_RESP" | json_get data.id)

echo "[6/12] create generation scheme and word"
SCHEME_RESP=$(post_json "/clans/$CLAN_ID/generation-schemes" "{\"branchId\":$BRANCH_ID,\"schemeName\":\"长房字辈\",\"poemText\":\"德承先泽\",\"startGeneration\":1,\"isDefault\":true,\"validationEnabled\":true,\"strictMode\":false}")
SCHEME_ID=$(echo "$SCHEME_RESP" | json_get data.id)
post_json "/generation-schemes/$SCHEME_ID/items" "{\"generationNo\":1,\"word\":\"德\",\"sortOrder\":1}" >/dev/null
post_json "/generation-schemes/$SCHEME_ID/items" "{\"generationNo\":2,\"word\":\"承\",\"sortOrder\":2}" >/dev/null

echo "[7/12] create persons"
PARENT_RESP=$(post_json "/clans/$CLAN_ID/persons" "{\"branchId\":$BRANCH_ID,\"name\":\"张德明\",\"personCode\":\"P$TS\",\"gender\":\"male\",\"generationNo\":1,\"generationWord\":\"德\",\"isLiving\":true,\"privacyLevel\":\"clan_only\"}")
PARENT_ID=$(echo "$PARENT_RESP" | json_get data.id)
CHILD_RESP=$(post_json "/clans/$CLAN_ID/persons" "{\"branchId\":$BRANCH_ID,\"name\":\"张承远\",\"personCode\":\"C$TS\",\"gender\":\"male\",\"generationNo\":2,\"generationWord\":\"承\",\"isLiving\":true,\"privacyLevel\":\"clan_only\"}")
CHILD_ID=$(echo "$CHILD_RESP" | json_get data.id)

echo "[8/12] create relationship"
REL_RESP=$(post_json "/clans/$CLAN_ID/relationships" "{\"fromPersonId\":$PARENT_ID,\"toPersonId\":$CHILD_ID,\"relationType\":\"parent_child\",\"relationLabel\":\"father\",\"isLineageRelation\":true,\"isBiological\":true,\"isPrimary\":true,\"confidenceLevel\":\"high\"}")
REL_ID=$(echo "$REL_RESP" | json_get data.id)

echo "[9/12] create source and bind"
SOURCE_RESP=$(post_json "/clans/$CLAN_ID/sources" "{\"sourceName\":\"MVP测试族谱\",\"sourceType\":\"genealogy_book\",\"bookTitle\":\"张氏族谱\",\"verificationStatus\":\"unverified\"}")
SOURCE_ID=$(echo "$SOURCE_RESP" | json_get data.id)
post_json "/source-bindings" "{\"sourceId\":$SOURCE_ID,\"targetType\":\"person\",\"targetId\":$PARENT_ID,\"bindingReason\":\"资料出处\"}" >/dev/null

echo "[10/12] submit and approve person review"
TASK_RESP=$(post_json "/persons/$PARENT_ID/submit-review" "{\"diffSummary\":\"MVP端到端审核\"}")
TASK_ID=$(echo "$TASK_RESP" | json_get data.id)
post_json "/review-tasks/$TASK_ID/approve" "{\"comment\":\"通过\"}" >/dev/null

echo "[11/12] query tree and logs"
curl -sS -H "Authorization: Bearer $TOKEN" "$API/tree/person/$PARENT_ID/family" >/dev/null
curl -sS -H "Authorization: Bearer $TOKEN" "$API/logs/operations?clanId=$CLAN_ID&keyword=MVP" >/dev/null

echo "[12/12] export csv"
curl -sS -H "Authorization: Bearer $TOKEN" "$API/clans/$CLAN_ID/exports/persons.csv" >/dev/null
curl -sS -H "Authorization: Bearer $TOKEN" "$API/clans/$CLAN_ID/exports/relations.csv" >/dev/null

echo "MVP1 smoke test passed. clanId=$CLAN_ID branchId=$BRANCH_ID parentId=$PARENT_ID childId=$CHILD_ID relationshipId=$REL_ID sourceId=$SOURCE_ID"
