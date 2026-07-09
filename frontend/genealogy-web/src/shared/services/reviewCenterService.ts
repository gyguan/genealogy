import { apiClient } from '../api/client';

export const reviewCenterService = {
  listPendingTasks(clanId: string) {
    return apiClient.get(`/clans/${clanId}/review-tasks/pending`);
  },

  approveTask(taskId: string | number, comment = '同意入谱') {
    return apiClient.post(`/review-tasks/${taskId}/approve`, { comment });
  },

  rejectTask(taskId: string | number, comment = '请补充资料后重新提交') {
    return apiClient.post(`/review-tasks/${taskId}/reject`, { comment });
  },

  getTaskDiff(taskId: string | number) {
    return apiClient.get(`/review-tasks/${taskId}/diff`);
  }
};
