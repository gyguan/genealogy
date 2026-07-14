/* eslint-disable */
/**
 * Auto-generated import-execution DTOs from docs/api/openapi.import-execution.json.
 * Do not edit manually.
 */

export type ImportExecutionMode = "sync" | "async";
export type ImportExecutionStatus = "queued" | "running" | "paused" | "retry_wait" | "completed" | "failed" | "cancelled" | "dead_letter";
export type ImportExecutionStage = "queued" | "parsing" | "drafting" | "ready_for_review" | "publishing" | "completed" | "failed" | "cancelled";
export type ImportExecutionAction = "pause" | "resume" | "cancel" | "retry";

export type ImportJobExecutionResponse = {
  jobId: number;
  executionMode: ImportExecutionMode;
  executionStatus: ImportExecutionStatus;
  executionStage: ImportExecutionStage;
  totalCount?: number | null;
  processedCount: number;
  publishedCount: number;
  remainingCount: number;
  progressPercent: number;
  cursorRowNo?: number | null;
  chunkSize?: number | null;
  retryCount: number;
  maxRetries: number;
  failureStage?: ImportExecutionStage | null;
  lastErrorCode?: string | null;
  errorSummary?: string | null;
  manualInterventionRequired: boolean;
  nextRetryAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  heartbeatAt?: string | null;
  allowedActions: ImportExecutionAction[];
};
