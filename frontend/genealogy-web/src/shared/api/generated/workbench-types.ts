/* eslint-disable */
/**
 * Auto-generated Workbench DTOs from docs/api/openapi.workbench-query.json.
 * Do not edit manually.
 */

export type WorkbenchTaskResponse = { key?: string; taskName?: string; bookName?: string; creatorName?: string; createdAt?: string; type?: string; typeText?: string; objectName?: string; branchName?: string; risk?: string; status?: string; statusText?: string; suggestion?: string; problemDescription?: string; involvedObject?: string; riskReason?: string; reviewBlocked?: boolean; relatedEntryType?: string; relatedEntryId?: string; relatedEntryText?: string; statusDescription?: string; updatedAt?: string; };

export type WorkbenchTaskPage = { records?: WorkbenchTaskResponse[]; total?: number; pageNo?: number; pageSize?: number; totalPages?: number; };

export type ApiResponseWorkbenchTaskPage = { success?: boolean; code?: string; message?: string; data?: WorkbenchTaskPage; traceId?: string; };
