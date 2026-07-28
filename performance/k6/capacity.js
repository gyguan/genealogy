import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const profile = __ENV.LOAD_PROFILE || 'ci';
const username = __ENV.CAPACITY_USERNAME;
const password = __ENV.CAPACITY_PASSWORD;
const clanId = Number(__ENV.CAPACITY_CLAN_ID);
const branchId = Number(__ENV.CAPACITY_BRANCH_ID);
const rootPersonId = Number(__ENV.CAPACITY_ROOT_PERSON_ID);

const businessErrors = new Counter('business_errors');
const silentFailures = new Counter('silent_failures');
const writeSuccess = new Rate('write_success');
const treeDuration = new Trend('tree_duration', true);

const profiles = {
  ci: [
    { duration: '15s', target: 5 },
    { duration: '20s', target: 10 },
    { duration: '20s', target: 20 },
    { duration: '20s', target: 30 },
    { duration: '10s', target: 50 },
    { duration: '20s', target: 20 },
    { duration: '15s', target: 0 },
  ],
  capacity: [
    { duration: '1m', target: 25 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '30s', target: 400 },
    { duration: '5m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  soak: [
    { duration: '2m', target: 50 },
    { duration: __ENV.SOAK_DURATION || '30m', target: Number(__ENV.SOAK_VUS || 50) },
    { duration: '2m', target: 0 },
  ],
};

export const options = {
  stages: profiles[profile] || profiles.ci,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    checks: ['rate>0.99'],
    business_errors: ['count<1'],
    silent_failures: ['count<1'],
    write_success: ['rate>0.99'],
    tree_duration: ['p(95)<2000', 'p(99)<4000'],
  },
};

let session;

function parse(response) {
  try {
    return response.json();
  } catch (_) {
    return null;
  }
}

function validate(response, label, expected) {
  const accepted = expected || [200];
  const payload = parse(response);
  const businessSuccess = !payload || payload.success !== false;
  const ok = accepted.indexOf(response.status) >= 0 && businessSuccess;
  const checks = {};
  checks[`${label} status and business result`] = function () { return ok; };
  check(response, checks);
  if (!ok) {
    businessErrors.add(1, { operation: label, status: String(response.status) });
    if (response.status === 200 && payload && payload.success === false) {
      silentFailures.add(1, { operation: label });
    }
  }
  return payload ? payload.data : null;
}

function login() {
  const response = http.post(`${baseUrl}/api/v1/auth/login`, JSON.stringify({
    username: username,
    password: password,
    rememberMe: false,
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'login' },
  });
  const data = validate(response, 'login');
  if (!data || !data.csrfToken || !data.accessToken) {
    throw new Error(`login did not return csrfToken/accessToken, status=${response.status}`);
  }
  return { csrfToken: data.csrfToken, accessToken: data.accessToken };
}

function getSession() {
  if (!session) session = login();
  return session;
}

function authHeaders(includeCsrf) {
  const current = getSession();
  const result = {
    'Authorization': `Bearer ${current.accessToken}`,
    'Content-Type': 'application/json',
  };
  if (includeCsrf) result['X-CSRF-Token'] = current.csrfToken;
  return result;
}

function readClan() {
  const response = http.get(`${baseUrl}/api/v1/clans/${clanId}`, {
    headers: authHeaders(false),
    tags: { operation: 'clan_detail', workload: 'read' },
  });
  validate(response, 'clan_detail');
}

function readPersons() {
  const response = http.get(`${baseUrl}/api/v1/clans/${clanId}/persons?page=1&pageSize=20`, {
    headers: authHeaders(false),
    tags: { operation: 'person_list', workload: 'read' },
  });
  validate(response, 'person_list');
}

function readBranches() {
  const response = http.get(`${baseUrl}/api/v1/clans/${clanId}/branches`, {
    headers: authHeaders(false),
    tags: { operation: 'branch_list', workload: 'read' },
  });
  validate(response, 'branch_list');
}

function readTree() {
  const response = http.get(
    `${baseUrl}/api/v1/tree/person/${rootPersonId}?direction=descendants&dataView=official&maxDepth=20&maxNodes=500&maxEdges=800`,
    { headers: authHeaders(false), tags: { operation: 'lineage_tree', workload: 'graph' } },
  );
  treeDuration.add(response.timings.duration);
  validate(response, 'lineage_tree');
}

function createDraftPerson() {
  const suffix = `${__VU}-${__ITER}-${Date.now()}`;
  const payload = {
    branchId: branchId,
    personCode: `LOAD-${suffix}`,
    name: `容量测试人物-${suffix}`,
    genealogyName: null,
    courtesyName: null,
    aliasName: null,
    gender: 'male',
    generationNo: 8,
    generationWord: null,
    rankInFamily: null,
    birthDate: null,
    birthDatePrecision: null,
    deathDate: null,
    deathDatePrecision: null,
    isLiving: true,
    birthPlace: '容量测试',
    residencePlace: '容量测试',
    occupation: '压测数据',
    education: null,
    titleOrHonor: null,
    biography: '#870 可清理容量压测草稿',
    tombPlace: null,
    epitaph: null,
    hasDescendant: false,
    lineageStatus: 'normal',
    privacyLevel: 'clan_only',
    dataStatus: 'draft',
    confirmDuplicate: true,
  };
  const response = http.post(`${baseUrl}/api/v1/clans/${clanId}/persons`, JSON.stringify(payload), {
    headers: authHeaders(true),
    tags: { operation: 'person_create', workload: 'write' },
  });
  const parsed = parse(response);
  const ok = [200, 201].indexOf(response.status) >= 0 && (!parsed || parsed.success !== false);
  writeSuccess.add(ok);
  validate(response, 'person_create', [200, 201]);
}

export default function () {
  getSession();
  const selector = __ITER % 20;
  if (selector < 7) readPersons();
  else if (selector < 11) readClan();
  else if (selector < 14) readBranches();
  else if (selector < 19) readTree();
  else createDraftPerson();
  sleep(Number(__ENV.THINK_TIME_SECONDS || 0.15));
}

export function handleSummary(data) {
  const checksMetric = data.metrics && data.metrics.checks;
  const checkValues = checksMetric && checksMetric.values;
  const passes = checkValues && checkValues.passes ? checkValues.passes : 0;
  return {
    'performance-results/k6-summary.json': JSON.stringify(data, null, 2),
    stdout: `\n#870 capacity test complete: profile=${profile}, checks=${passes}\n`,
  };
}
