#!/usr/bin/env bash
set -euo pipefail

base_url="${BASE_URL:-http://127.0.0.1:8080}"
run_id="${GITHUB_RUN_ID:-local}-$(date +%s)"
username="capacity_${run_id//[^a-zA-Z0-9]/_}"
password="$(openssl rand -hex 16)"
work_dir="${PERFORMANCE_RESULTS_DIR:-performance-results}"
mkdir -p "$work_dir"

register_payload="$(jq -nc --arg username "$username" --arg password "$password" '{username:$username,password:$password,displayName:"容量测试账号",phone:null,email:null}')"
curl --fail-with-body --silent --show-error -H 'Content-Type: application/json' --data-binary "$register_payload" "$base_url/api/v1/auth/register" > "$work_dir/register.json"

login_payload="$(jq -nc --arg username "$username" --arg password "$password" '{username:$username,password:$password,rememberMe:false}')"
curl --fail-with-body --silent --show-error -c "$work_dir/cookies.txt" -H 'Content-Type: application/json' --data-binary "$login_payload" "$base_url/api/v1/auth/login" > "$work_dir/login.json"
csrf_token="$(jq -r '.data.csrfToken // empty' "$work_dir/login.json")"
test -n "$csrf_token"

clan_payload="$(jq -nc --arg name "容量测试宗族-${run_id}" '{clanCode:null,clanName:$name,surname:"测",hallName:"容量堂",commandery:"CI",originPlace:"CI",description:"#870 可清理容量压测数据"}')"
curl --fail-with-body --silent --show-error -b "$work_dir/cookies.txt" -H 'Content-Type: application/json' -H "X-CSRF-Token: $csrf_token" --data-binary "$clan_payload" "$base_url/api/v1/clans" > "$work_dir/clan.json"
clan_id="$(jq -r '.data.id // empty' "$work_dir/clan.json")"
test -n "$clan_id"

branch_payload='{"parentId":null,"branchName":"容量测试支派","sortOrder":1,"founderPersonId":null,"migrationFrom":"CI","migrationTo":"CI","managerMemberId":null,"description":"#870 容量压测支派"}'
curl --fail-with-body --silent --show-error -b "$work_dir/cookies.txt" -H 'Content-Type: application/json' -H "X-CSRF-Token: $csrf_token" --data-binary "$branch_payload" "$base_url/api/v1/clans/$clan_id/branches" > "$work_dir/branch.json"
branch_id="$(jq -r '.data.id // empty' "$work_dir/branch.json")"
test -n "$branch_id"

create_person() {
  local code="$1"
  local name="$2"
  local generation="$3"
  jq -nc --argjson branchId "$branch_id" --arg code "$code" --arg name "$name" --argjson generation "$generation" '{branchId:$branchId,personCode:$code,name:$name,genealogyName:null,courtesyName:null,aliasName:null,gender:"male",generationNo:$generation,generationWord:null,rankInFamily:null,birthDate:null,birthDatePrecision:null,deathDate:null,deathDatePrecision:null,isLiving:false,birthPlace:"CI",residencePlace:"CI",occupation:null,education:null,titleOrHonor:null,biography:"#870 容量压测正式世系基线",tombPlace:null,epitaph:null,hasDescendant:true,lineageStatus:"normal",privacyLevel:"clan_only",dataStatus:"draft",confirmDuplicate:true}' \
    | curl --fail-with-body --silent --show-error -b "$work_dir/cookies.txt" -H 'Content-Type: application/json' -H "X-CSRF-Token: $csrf_token" --data-binary @- "$base_url/api/v1/clans/$clan_id/persons"
}

create_person "CAP-ROOT-${run_id}" "容量始祖-${run_id}" 1 > "$work_dir/root-person.json"
create_person "CAP-MIDDLE-${run_id}" "容量承继-${run_id}" 2 > "$work_dir/middle-person.json"
create_person "CAP-CHILD-${run_id}" "容量后代-${run_id}" 3 > "$work_dir/child-person.json"
root_person_id="$(jq -r '.data.id // empty' "$work_dir/root-person.json")"
middle_person_id="$(jq -r '.data.id // empty' "$work_dir/middle-person.json")"
child_person_id="$(jq -r '.data.id // empty' "$work_dir/child-person.json")"
test -n "$root_person_id" && test -n "$middle_person_id" && test -n "$child_person_id"

create_relationship() {
  local from_id="$1"
  local to_id="$2"
  jq -nc --argjson fromPersonId "$from_id" --argjson toPersonId "$to_id" '{fromPersonId:$fromPersonId,toPersonId:$toPersonId,relationType:"parent_child",relationLabel:"father",relationCategory:"blood",ritualRelationType:null,successionReason:null,successorBranchId:null,isLineageRelation:true,isBiological:true,isPrimary:true,description:"#870 容量压测世系",confidenceLevel:"high"}' \
    | curl --fail-with-body --silent --show-error -b "$work_dir/cookies.txt" -H 'Content-Type: application/json' -H "X-CSRF-Token: $csrf_token" --data-binary @- "$base_url/api/v1/clans/$clan_id/relationships"
}

create_relationship "$root_person_id" "$middle_person_id" > "$work_dir/relation-1.json"
create_relationship "$middle_person_id" "$child_person_id" > "$work_dir/relation-2.json"
relation_1_id="$(jq -r '.data.id // empty' "$work_dir/relation-1.json")"
relation_2_id="$(jq -r '.data.id // empty' "$work_dir/relation-2.json")"
test -n "$relation_1_id" && test -n "$relation_2_id"

psql -v ON_ERROR_STOP=1 <<SQL
update branch set status = 'official' where id = ${branch_id};
update person set data_status = 'official' where id in (${root_person_id}, ${middle_person_id}, ${child_person_id});
update relationship set data_status = 'official' where id in (${relation_1_id}, ${relation_2_id});
SQL

{
  echo "CAPACITY_USERNAME=$username"
  echo "CAPACITY_PASSWORD=$password"
  echo "CAPACITY_CLAN_ID=$clan_id"
  echo "CAPACITY_BRANCH_ID=$branch_id"
  echo "CAPACITY_ROOT_PERSON_ID=$root_person_id"
} >> "${GITHUB_ENV:-/dev/null}"

jq -n --arg runId "$run_id" --argjson clanId "$clan_id" --argjson branchId "$branch_id" --argjson rootPersonId "$root_person_id" '{runId:$runId,clanId:$clanId,branchId:$branchId,rootPersonId:$rootPersonId}' > "$work_dir/seed-manifest.json"
echo "capacity seed ready: clan=$clan_id branch=$branch_id root=$root_person_id"
