/* eslint-disable */
/** Auto-generated from docs/api/openapi.review-quality.json. Do not edit manually. */
export type ReviewQualityCheckMode = "INCREMENTAL" | "FULL" | "REVIEW_GATE";

export type ReviewQualityCheckStatus = "NOT_CHECKED" | "QUEUED" | "RUNNING" | "PASSED" | "ISSUES_FOUND" | "FAILED";

export type ReviewQualityCheckScopeType = "TASK_IDS" | "QUERY";

export type ReviewQualityBlockLevel = "NONE" | "WARNING" | "BLOCKING";

export type ReviewQualityRuleOutcome = "PASSED" | "ISSUE" | "SKIPPED" | "FAILED";

export type ReviewQualityCheckQueryScope = { view?: "pending" | "submitted" | "processed"; targetType?: string | null; status?: string | null; branchId?: number | null; submittedFrom?: string | null; submittedTo?: string | null; processedFrom?: string | null; processedTo?: string | null; };

export type ReviewQualityCheckTriggerRequest = { scopeType: ReviewQualityCheckScopeType; mode: ReviewQualityCheckMode; reviewTaskIds?: number[]; query?: ReviewQualityCheckQueryScope; ruleCodes?: string[]; };

export type ReviewQualityCheckAcceptedResponse = { checkId: string; status: ReviewQualityCheckStatus; scopeType: ReviewQualityCheckScopeType; mode: ReviewQualityCheckMode; acceptedTaskCount: number; acceptedAt: string; };

export type ReviewQualityCheckSummary = { taskCount: number; ruleCount: number; passedRuleCount: number; issueCount: number; blockingIssueCount: number; warningIssueCount: number; reviewBlocked: boolean; };

export type ReviewQualityRuleResult = { ruleCode: string; ruleName: string; outcome: ReviewQualityRuleOutcome; blockLevel: ReviewQualityBlockLevel; affectedTaskCount: number; message?: string | null; affectedReviewTaskIds?: number[]; };

export type ReviewQualityCheckResponse = { checkId?: string | null; status: ReviewQualityCheckStatus; scopeType?: ReviewQualityCheckScopeType | null; mode?: ReviewQualityCheckMode | null; reviewBlocked: boolean; summary?: ReviewQualityCheckSummary | null; rules?: ReviewQualityRuleResult[]; queuedAt?: string | null; startedAt?: string | null; completedAt?: string | null; lastCheckedAt?: string | null; failureCode?: string | null; failureMessage?: string | null; };

export type ReviewQualityErrorCode = "REVIEW_QUALITY_INVALID_SCOPE" | "REVIEW_QUALITY_CHECK_ALREADY_RUNNING" | "REVIEW_QUALITY_TASK_STATE_CONFLICT" | "REVIEW_QUALITY_FORBIDDEN" | "REVIEW_QUALITY_NOT_REVIEWABLE" | "REVIEW_QUALITY_NOT_FOUND";

export type ReviewQualityErrorResponse = { success: false; code: ReviewQualityErrorCode; message: string; traceId?: string | null; };

export type ApiResponseReviewQualityCheckAcceptedResponse = { success: boolean; code?: string; message?: string; data: ReviewQualityCheckAcceptedResponse; traceId?: string; };

export type ApiResponseReviewQualityCheckResponse = { success: boolean; code?: string; message?: string; data: ReviewQualityCheckResponse; traceId?: string; };
