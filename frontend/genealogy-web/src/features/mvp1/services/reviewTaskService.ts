import { apiClient } from '../../../shared/api/client';

export type ReviewTaskTargetType = 'person' | 'relationship' | 'source' | 'branch' | 'generation_scheme';

export type SubmitReviewTaskInput = {
  clanId: string | number;
  targetType: ReviewTaskTargetType;
  targetId: string | number;
  comment: string | null;
};

export async function submitReviewTask({ clanId, targetType, targetId, comment }: SubmitReviewTaskInput) {
  return apiClient.post(`/clans/${clanId}/review-tasks`, {
    targetType,
    targetId: Number(targetId),
    comment
  });
}

export function submitReviewTasks(items: SubmitReviewTaskInput[]) {
  return Promise.allSettled(items.map(item => submitReviewTask(item)));
}

export function countSettledResults(results: PromiseSettledResult<unknown>[]) {
  const successCount = results.filter(result => result.status === 'fulfilled').length;
  return {
    successCount,
    failedCount: results.length - successCount
  };
}
