import { apiClient } from '../../../shared/api/client';
import {
  GenerationReviewBlockedError,
  isGenerationReviewBlockedError,
  validateGenerationItems
} from '../domain/generationValidation';
import { loadGenerationItems } from './generationService';

export type ReviewTaskTargetType = 'person' | 'relationship' | 'source' | 'branch' | 'generation_scheme';

export type SubmitReviewTaskInput = {
  clanId: string | number;
  targetType: ReviewTaskTargetType;
  targetId: string | number;
  comment: string | null;
};

async function validateReviewTarget(targetType: ReviewTaskTargetType, targetId: string | number) {
  if (targetType !== 'generation_scheme') return;
  const items = await loadGenerationItems(targetId);
  const result = validateGenerationItems(items);
  if (!result.valid) throw new GenerationReviewBlockedError(result);
}

function reportBlockedGeneration(error: unknown) {
  if (!isGenerationReviewBlockedError(error) || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('genealogy:wizard-api-error', {
    detail: {
      fieldErrors: {},
      message: `字辈方案暂不能提交审核：${error.message}`
    }
  }));
}

export async function submitReviewTask({ clanId, targetType, targetId, comment }: SubmitReviewTaskInput) {
  try {
    await validateReviewTarget(targetType, targetId);
    return await apiClient.post(`/clans/${clanId}/review-tasks`, {
      targetType,
      targetId: Number(targetId),
      comment
    });
  } catch (error) {
    reportBlockedGeneration(error);
    throw error;
  }
}

export function submitReviewTasks(items: SubmitReviewTaskInput[]) {
  return Promise.allSettled(items.map(item => submitReviewTask(item)));
}

export async function approveReview(taskId: string | number, comment: string | null) {
  return apiClient.post(`/review-tasks/${taskId}/approve`, { comment });
}

export function countSettledResults(results: PromiseSettledResult<unknown>[]) {
  const successCount = results.filter(result => result.status === 'fulfilled').length;
  const blocked = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected' && isGenerationReviewBlockedError(result.reason));
  const failed = results.filter(result => result.status === 'rejected' && !isGenerationReviewBlockedError(result.reason));
  return {
    successCount,
    blockedCount: blocked.length,
    failedCount: failed.length,
    blockedReasons: blocked.map(result => result.reason instanceof Error ? result.reason.message : String(result.reason || '字辈明细不完整'))
  };
}
