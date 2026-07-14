/* eslint-disable */
/**
 * Auto-generated import failure remediation DTOs from docs/api/openapi.import-failure-bulk.json.
 * Do not edit manually.
 */

export type ImportRowSelectionMode = "selected" | "filtered";
export type ImportRowBulkOperation = "retry" | "exclude" | "correction_upload";

export type ImportRowVersionReference = {
  rowNo: number;
  expectedVersion: number;
};

export type ImportRowBulkSelectionRequest = {
  mode: ImportRowSelectionMode;
  rows?: ImportRowVersionReference[];
};

export type ImportRowBulkRetryRequest = {
  selection: ImportRowBulkSelectionRequest;
};

export type ImportRowBulkExcludeRequest = {
  selection: ImportRowBulkSelectionRequest;
  reason: string;
};

export type ImportRowBulkItemResult = {
  stableRowKey: string;
  rowNo: number;
  success: boolean;
  rowStatus: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  version: number;
};

export type ImportRowBulkOperationResponse = {
  operation: ImportRowBulkOperation;
  selectionMode: ImportRowSelectionMode;
  matchedCount: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  remainingFailureCount: number;
  excludedCount: number;
  processingStatus: string;
  items: ImportRowBulkItemResult[];
};
