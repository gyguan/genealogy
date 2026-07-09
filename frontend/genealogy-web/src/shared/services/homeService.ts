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

export const homeService = {
  listClans() {
    return apiClient.get('/clans');
  },

  listBranches(clanId: string) {
    return apiClient.get(`/clans/${clanId}/branches`);
  },

  searchPeople(clanId: string, pageNo = 1, pageSize = 200) {
    const params = new URLSearchParams({ clanId, pageNo: String(pageNo), pageSize: String(pageSize) });
    return apiClient.get(`/persons/search?${params.toString()}`);
  },

  listSources(clanId: string) {
    return apiClient.get(`/clans/${clanId}/sources`);
  },

  listPendingReviews(clanId: string) {
    return apiClient.get(`/clans/${clanId}/review-tasks/pending`);
  },

  getLogStats(clanId: string) {
    return apiClient.get(`/logs/operations/stats?clanId=${clanId}`);
  },

  async loadSnapshot(clanId: string): Promise<HomeSnapshotResponse> {
    const [branches, people, sources, pendingReviews, logStats] = await Promise.all([
      safe(() => this.listBranches(clanId), []),
      safe(() => this.searchPeople(clanId), { total: 0, records: [] }),
      safe(() => this.listSources(clanId), []),
      safe(() => this.listPendingReviews(clanId), []),
      safe(() => this.getLogStats(clanId), null)
    ]);
    return { clans: [], branches, people, sources, pendingReviews, logStats };
  }
};
