import { apiClient } from '../api/client';

export type LogQuery = Record<string, string>;

export function toQueryString(source: LogQuery) {
  const params = new URLSearchParams();
  Object.entries(source).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

export const logService = {
  listOperations(query: string) {
    return apiClient.get(`/logs/operations${query ? `?${query}` : ''}`);
  },

  getOperationStats(query: string) {
    return apiClient.get(`/logs/operations/stats${query ? `?${query}` : ''}`);
  },

  exportOperations(query: string) {
    return apiClient.download(`/logs/operations/export.csv${query ? `?${query}` : ''}`);
  },

  getReviewTaskDiff(reviewTaskId: string | number) {
    return apiClient.get(`/review-tasks/${reviewTaskId}/diff`);
  },

  listPendingReviewTasks(clanId: string) {
    return apiClient.get(`/clans/${clanId}/review-tasks/pending`);
  }
};
