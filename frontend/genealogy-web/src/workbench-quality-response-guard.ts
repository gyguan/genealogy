import { apiClient } from './shared/api/client';

type JsonRecord = Record<string, unknown>;

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

function normalizeQualityResponse<T>(value: T): T {
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
  } as T;
}

function isWorkbenchQualityPath(path: string) {
  return path.startsWith('/workbench/quality-checks');
}

const guarded = apiClient as typeof apiClient & { __workbenchQualityGuardInstalled?: boolean };

if (!guarded.__workbenchQualityGuardInstalled) {
  guarded.__workbenchQualityGuardInstalled = true;

  const originalGet = apiClient.get.bind(apiClient);
  const originalPost = apiClient.post.bind(apiClient);

  apiClient.get = (async <T = unknown>(path: string): Promise<T> => {
    const result = await originalGet<T>(path);
    return isWorkbenchQualityPath(path) ? normalizeQualityResponse(result) : result;
  }) as typeof apiClient.get;

  apiClient.post = (async <T = unknown>(path: string, body?: unknown): Promise<T> => {
    const result = await originalPost<T>(path, body);
    return isWorkbenchQualityPath(path) ? normalizeQualityResponse(result) : result;
  }) as typeof apiClient.post;
}
