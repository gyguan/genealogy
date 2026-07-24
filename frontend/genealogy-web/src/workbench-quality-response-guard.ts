import { apiClient } from './shared/api/client';

type JsonRecord = Record<string, unknown>;
type RuntimeApiClient = {
  get: (path: string) => Promise<unknown>;
  post: (path: string, body?: unknown) => Promise<unknown>;
  __workbenchQualityGuardInstalled?: boolean;
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function normalizeRule(value: unknown): JsonRecord {
  const rule = asRecord(value) || {};
  return {
    ...rule,
    code: String(rule.code || ''),
    name: String(rule.name || rule.code || '未命名规则'),
    outcome: String(rule.outcome || ''),
    blockLevel: String(rule.blockLevel || 'WARNING'),
    affectedSubjectCount: Number(rule.affectedSubjectCount || 0),
    affectedSubjectIds: Array.isArray(rule.affectedSubjectIds)
      ? rule.affectedSubjectIds.map(String)
      : []
  };
}

function normalizeQualityResponse(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;

  return {
    ...record,
    rules: Array.isArray(record.rules) ? record.rules.map(normalizeRule) : [],
    summary: asRecord(record.summary) || {
      subjectCount: 0,
      issueCount: 0,
      blockingIssueCount: 0,
      warningIssueCount: 0
    }
  };
}

function isWorkbenchQualityPath(path: string) {
  return path.startsWith('/workbench/quality-checks');
}

const runtimeClient = apiClient as unknown as RuntimeApiClient;

if (!runtimeClient.__workbenchQualityGuardInstalled) {
  runtimeClient.__workbenchQualityGuardInstalled = true;

  const originalGet = runtimeClient.get.bind(runtimeClient);
  const originalPost = runtimeClient.post.bind(runtimeClient);

  runtimeClient.get = async (path: string) => {
    const result = await originalGet(path);
    return isWorkbenchQualityPath(path) ? normalizeQualityResponse(result) : result;
  };

  runtimeClient.post = async (path: string, body?: unknown) => {
    const result = await originalPost(path, body);
    return isWorkbenchQualityPath(path) ? normalizeQualityResponse(result) : result;
  };
}
