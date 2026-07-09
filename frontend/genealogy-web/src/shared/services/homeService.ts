import { apiClient } from '../api/client';

export type HomeSnapshotResponse = {
  clans: unknown[];
  branches: unknown;
  people: unknown;
  sources: unknown;
  pendingReviews: unknown;
  logStats: unknown;
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function listClans() {
  return apiClient.get('/clans');
}

function listBranches(clanId: string) {
  return apiClient.get(`/clans/${clanId}/branches`);
}

function searchPeople(clanId: string, pageNo = 1, pageSize = 200) {
  const params = new URLSearchParams({ clanId, pageNo: String(pageNo), pageSize: String(pageSize) });
  return apiClient.get(`/persons/search?${params.toString()}`);
}

function listSources(clanId: string) {
  return apiClient.get(`/clans/${clanId}/sources`);
}

function listPendingReviews(clanId: string) {
  return apiClient.get(`/clans/${clanId}/review-tasks/pending`);
}

function getLogStats(clanId: string) {
  return apiClient.get(`/logs/operations/stats?clanId=${clanId}`);
}

async function loadSnapshot(clanId: string): Promise<HomeSnapshotResponse> {
  const [branches, people, sources, pendingReviews, logStats] = await Promise.all([
    safe(() => listBranches(clanId), []),
    safe(() => searchPeople(clanId), { total: 0, records: [] }),
    safe(() => listSources(clanId), []),
    safe(() => listPendingReviews(clanId), []),
    safe(() => getLogStats(clanId), null)
  ]);
  return { clans: [], branches, people, sources, pendingReviews, logStats };
}

export const homeService = { listClans, listBranches, searchPeople, listSources, listPendingReviews, getLogStats, loadSnapshot };
