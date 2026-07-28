#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
OUT="${SECURITY_RESULTS_DIR:-security-results}"
mkdir -p "$OUT"
: > "$OUT/test-results.tsv"

pass=0
fail=0

record() {
  local result="$1" name="$2" detail="$3"
  printf '%s\t%s\t%s\n' "$result" "$name" "$detail" | tee -a "$OUT/test-results.tsv"
  if [[ "$result" == PASS ]]; then pass=$((pass+1)); else fail=$((fail+1)); fi
}

request() {
  local name="$1"; shift
  curl --silent --show-error --max-time 15 -D "$OUT/${name}.headers" -o "$OUT/${name}.body" -w '%{http_code}' "$@"
}

assert_status_not_2xx() {
  local name="$1" status="$2"
  if [[ ! "$status" =~ ^2 ]]; then record PASS "$name" "HTTP $status"; else record FAIL "$name" "unexpected HTTP $status"; fi
}

register_login() {
  local prefix="$1" username="$2" password="$3"
  jq -nc --arg username "$username" --arg password "$password" --arg displayName "$prefix" '{username:$username,password:$password,displayName:$displayName,phone:null,email:null}' \
    | curl --fail-with-body --silent --show-error -H 'Content-Type: application/json' --data-binary @- "$BASE_URL/api/v1/auth/register" > "$OUT/${prefix}-register.json"
  jq -nc --arg username "$username" --arg password "$password" '{username:$username,password:$password,rememberMe:false}' \
    | curl --fail-with-body --silent --show-error -c "$OUT/${prefix}.cookies" -H 'Content-Type: application/json' --data-binary @- "$BASE_URL/api/v1/auth/login" > "$OUT/${prefix}-login.json"
}

suffix="${GITHUB_RUN_ID:-local}_${GITHUB_RUN_ATTEMPT:-1}_$(date +%s)"
user_a="sec_a_${suffix}"
user_b="sec_b_${suffix}"
password_a="$(openssl rand -hex 18)"
password_b="$(openssl rand -hex 18)"
register_login a "$user_a" "$password_a"
register_login b "$user_b" "$password_b"

token_a="$(jq -r '.data.accessToken // empty' "$OUT/a-login.json")"
csrf_a="$(jq -r '.data.csrfToken // empty' "$OUT/a-login.json")"
token_b="$(jq -r '.data.accessToken // empty' "$OUT/b-login.json")"
csrf_b="$(jq -r '.data.csrfToken // empty' "$OUT/b-login.json")"
test -n "$token_a" && test -n "$csrf_a" && test -n "$token_b" && test -n "$csrf_b"

create_clan() {
  local prefix="$1" token="$2" csrf="$3" marker="$4"
  jq -nc --arg name "安全测试宗族-${marker}" --arg marker "$marker" '{clanCode:null,clanName:$name,surname:"安",hallName:"安全堂",commandery:"SEC",originPlace:"CI",description:("SECURITY_SECRET_"+$marker)}' \
    | curl --fail-with-body --silent --show-error -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -H "X-CSRF-Token: $csrf" --data-binary @- "$BASE_URL/api/v1/clans" > "$OUT/${prefix}-clan.json"
}
create_clan a "$token_a" "$csrf_a" "A_${suffix}"
create_clan b "$token_b" "$csrf_b" "B_${suffix}"
clan_a="$(jq -r '.data.id // empty' "$OUT/a-clan.json")"
clan_b="$(jq -r '.data.id // empty' "$OUT/b-clan.json")"
test -n "$clan_a" && test -n "$clan_b"

# 1. Anonymous and malformed bearer access must be denied.
status="$(request anonymous-clan "$BASE_URL/api/v1/clans/$clan_a")"
assert_status_not_2xx anonymous_protected_resource "$status"
status="$(request malformed-token -H 'Authorization: Bearer not-a-jwt' "$BASE_URL/api/v1/clans/$clan_a")"
assert_status_not_2xx malformed_bearer_token "$status"

# 2. CSRF protection on cookie-authenticated state changes.
jq -nc '{clanCode:null,clanName:"CSRF should fail",surname:"安",hallName:null,commandery:null,originPlace:null,description:null}' > "$OUT/csrf-payload.json"
status="$(request csrf-missing -b "$OUT/a.cookies" -H 'Content-Type: application/json' --data-binary @"$OUT/csrf-payload.json" "$BASE_URL/api/v1/clans")"
assert_status_not_2xx csrf_missing_token "$status"
status="$(request csrf-invalid -b "$OUT/a.cookies" -H 'Content-Type: application/json' -H 'X-CSRF-Token: invalid' --data-binary @"$OUT/csrf-payload.json" "$BASE_URL/api/v1/clans")"
assert_status_not_2xx csrf_invalid_token "$status"

# 3. Cross-clan horizontal authorization and response leakage.
status="$(request cross-clan -H "Authorization: Bearer $token_a" "$BASE_URL/api/v1/clans/$clan_b")"
if [[ ! "$status" =~ ^2 ]] && ! grep -q "SECURITY_SECRET_B_${suffix}" "$OUT/cross-clan.body"; then
  record PASS cross_clan_isolation "HTTP $status and no marker leakage"
else
  record FAIL cross_clan_isolation "HTTP $status or secret leaked"
fi

# 4. SQL injection probes must not bypass authorization or trigger 5xx/SQL diagnostics.
encoded="%27%20OR%201%3D1--"
status="$(request sqli-search -H "Authorization: Bearer $token_a" "$BASE_URL/api/v1/clans/$clan_a/persons?page=1&pageSize=20&keyword=$encoded")"
if [[ ! "$status" =~ ^5 ]] && ! grep -Eiq 'syntax error|sqlstate|postgresql|select .* from|org\.postgresql|bad sql grammar' "$OUT/sqli-search.body"; then
  record PASS sql_injection_probe "HTTP $status, no SQL diagnostics"
else
  record FAIL sql_injection_probe "HTTP $status or SQL diagnostics leaked"
fi

# 5. Path traversal probes must not expose host files.
for path in '%2e%2e/%2e%2e/etc/passwd' '..%252f..%252fetc%252fpasswd'; do
  safe="$(echo "$path" | tr '/%' '__')"
  status="$(request "traversal-$safe" -H "Authorization: Bearer $token_a" "$BASE_URL/api/v1/attachments/$path")"
  if ! grep -q 'root:x:0:0:' "$OUT/traversal-$safe.body"; then record PASS "path_traversal_$safe" "HTTP $status"; else record FAIL "path_traversal_$safe" "host file exposed"; fi
done

# 6. Account enumeration: invalid user and invalid password must use the same status and generic failure shape.
login_probe() {
  local name="$1" username="$2" password="$3"
  jq -nc --arg username "$username" --arg password "$password" '{username:$username,password:$password,rememberMe:false}' > "$OUT/${name}.json"
  request "$name" -H 'Content-Type: application/json' --data-binary @"$OUT/${name}.json" "$BASE_URL/api/v1/auth/login"
}
unknown_status="$(login_probe login-unknown "missing_${suffix}" 'WrongPassword123!')"
wrong_status="$(login_probe login-wrong "$user_a" 'WrongPassword123!')"
unknown_code="$(jq -r '.code // .error.code // empty' "$OUT/login-unknown.body" 2>/dev/null || true)"
wrong_code="$(jq -r '.code // .error.code // empty' "$OUT/login-wrong.body" 2>/dev/null || true)"
if [[ "$unknown_status" == "$wrong_status" && "$unknown_code" == "$wrong_code" ]]; then record PASS account_enumeration_resistance "same status/code"; else record FAIL account_enumeration_resistance "different status/code"; fi

# 7. Error responses must not expose stack traces, secrets, or framework diagnostics.
status="$(request malformed-json -H 'Content-Type: application/json' --data-binary '{broken' "$BASE_URL/api/v1/auth/login")"
if ! grep -Eiq 'exception|stacktrace|at com\.|springframework|hibernate|jdbc:|password=' "$OUT/malformed-json.body"; then record PASS error_information_disclosure "HTTP $status"; else record FAIL error_information_disclosure "diagnostics leaked"; fi

# 8. Security response headers on authenticated API responses.
request security-headers -H "Authorization: Bearer $token_a" "$BASE_URL/api/v1/clans/$clan_a" >/dev/null
header_fail=0
for header in 'x-content-type-options: nosniff' 'x-frame-options:' 'cache-control:'; do
  if ! grep -Eiq "^${header}" "$OUT/security-headers.headers"; then header_fail=1; fi
done
if [[ $header_fail -eq 0 ]]; then record PASS security_response_headers "nosniff, frame and cache headers present"; else record FAIL security_response_headers "required headers missing"; fi

# 9. MIME/executable upload probes. 404 is acceptable when the guessed endpoint is absent; any success is a blocker.
printf 'MZ malicious executable marker' > "$OUT/evil.exe"
printf '<script>alert(1)</script>' > "$OUT/evil.svg"
for file in evil.exe evil.svg; do
  status="$(request "upload-$file" -H "Authorization: Bearer $token_a" -H "X-CSRF-Token: $csrf_a" -F "file=@$OUT/$file" "$BASE_URL/api/v1/clans/$clan_a/attachments")"
  if [[ ! "$status" =~ ^2 ]]; then record PASS "executable_upload_$file" "HTTP $status"; else record FAIL "executable_upload_$file" "dangerous upload accepted"; fi
done

# 10. Replay resistance: logout invalidates token/session.
status="$(request logout -b "$OUT/a.cookies" -H "Authorization: Bearer $token_a" -H "X-CSRF-Token: $csrf_a" -X POST "$BASE_URL/api/v1/auth/logout")"
if [[ "$status" =~ ^2 ]]; then record PASS logout_request "HTTP $status"; else record FAIL logout_request "HTTP $status"; fi
status="$(request replay-after-logout -H "Authorization: Bearer $token_a" "$BASE_URL/api/v1/clans/$clan_a")"
assert_status_not_2xx token_replay_after_logout "$status"

jq -n --argjson passed "$pass" --argjson failed "$fail" --arg commit "${GITHUB_SHA:-local}" '{passed:$passed,failed:$failed,commit:$commit,critical:0,high:$failed}' > "$OUT/summary.json"
printf '# Issue #871 动态安全测试\n\n- Passed: %s\n- Failed: %s\n- Commit: `%s`\n' "$pass" "$fail" "${GITHUB_SHA:-local}" > "$OUT/dynamic-security-report.md"

if [[ $fail -ne 0 ]]; then
  echo "Security penetration suite failed: $fail test(s)" >&2
  exit 1
fi
