/* eslint-disable */
/**
 * Auto-generated tracking-center DTOs from the effective OpenAPI contract.
 * Do not edit manually.
 */

export type OperationLogResponse = {
  id: number;
  clanId: number;
  actorId?: number | null;
  actorDisplayName?: string | null;
  actionType: string;
  targetType?: string | null;
  targetId?: number | null;
  targetDisplayName?: string | null;
  targetBranchName?: string | null;
  targetSummary?: string | null;
  resultStatus?: string | null;
  summary?: string | null;
  detail?: string | null;
  requestId?: string | null;
  clientIp?: string | null;
  createdAt: string;
};

export type OperationLogPage = {
  records: OperationLogResponse[];
  total: number;
  pageNo: number;
  pageSize: number;
  totalPages: number;
};

export type OperationLogStatsItem = {
  key: string;
  count: number;
};

export type OperationLogStatsResponse = {
  totalCount: number;
  byActionType: OperationLogStatsItem[];
  byActorId: OperationLogStatsItem[];
};

export type TrackingObjectResponse = {
  objectType: "person" | "relationship" | "source" | "branch" | "review_task" | "culture_item" | "migration_event" | "culture_site";
  objectId: number;
  displayName: string;
  secondaryLabel?: string | null;
  branchName?: string | null;
  summary?: string | null;
  status?: string | null;
  changedAt?: string | null;
};

export type TrackingObjectPage = {
  records: TrackingObjectResponse[];
  total: number;
  pageNo: number;
  pageSize: number;
  totalPages: number;
};

export type TrackingTraceTimelineEventResponse = {
  eventKey: string;
  eventType: "REVISION_SUBMITTED" | "REVIEW_REQUESTED" | "REVIEW_APPROVED" | "REVIEW_REJECTED" | "SOURCE_BOUND" | "SOURCE_BINDING_UPDATED" | "OBJECT_CREATED" | "OBJECT_UPDATED" | "OBJECT_DELETED" | "IMPORT_COMPLETED" | "OPERATION_RECORDED";
  sourceType: "revision" | "review_task" | "source_binding" | "operation_log";
  sourceId?: number | null;
  title: string;
  summary?: string | null;
  occurredAt?: string | null;
  actorDisplayName?: string | null;
  resultStatus?: string | null;
};

export type TrackingTraceRevisionResponse = {
  id: number;
  changeType: string;
  status: string;
  diffSummary?: string | null;
  submitterDisplayName?: string | null;
  submitTime?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
};

export type TrackingTraceReviewTaskResponse = {
  id: number;
  revisionId: number;
  reviewLevel?: number | null;
  status: string;
  reviewerDisplayName?: string | null;
  reviewerRole?: string | null;
  branchName?: string | null;
  reviewComment?: string | null;
  createdAt?: string | null;
  reviewedAt?: string | null;
};

export type TrackingTraceSourceBindingResponse = {
  id: number;
  sourceId: number;
  sourceDisplayName: string;
  targetType?: string | null;
  targetDisplayName?: string | null;
  bindingReason?: string | null;
  confidenceLevel?: string | null;
  bindingStatus: string;
  createdByDisplayName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type TrackingTraceCoverageResponse = {
  level: "complete" | "partial" | "minimal";
  complete: boolean;
  historyFrom?: string | null;
  truncatedSegments: ("revisions" | "reviewTasks" | "sourceBindings" | "operationLogs")[];
  missingSegments: ("revisions" | "reviewTasks" | "sourceBindings" | "operationLogs")[];
  notes: string[];
};

export type TrackingTraceDetailResponse = {
  objectSummary: TrackingObjectResponse;
  currentStatus: string | null;
  timeline: TrackingTraceTimelineEventResponse[];
  revisions: TrackingTraceRevisionResponse[];
  reviewTasks: TrackingTraceReviewTaskResponse[];
  sourceBindings: TrackingTraceSourceBindingResponse[];
  operationLogs: OperationLogResponse[];
  allowedActions: string[];
  traceCoverage: TrackingTraceCoverageResponse;
};

export type CheckTaskResponse = {
  id: number;
  clanId: number;
  revisionId: number;
  reviewLevel?: number | null;
  reviewerId?: number | null;
  reviewerRole?: string | null;
  branchId?: number | null;
  status: string;
  reviewComment?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  targetType?: string | null;
  targetId?: number | null;
  title?: string | null;
  diffSummary?: string | null;
  submitterId?: number | null;
  submitTime?: string | null;
};

export type AuditRecordResponse = {
  id: number;
  clanId: number;
  targetType: string;
  targetId: number;
  changeType: string;
  oldPayload?: string | null;
  newPayload?: string | null;
  diffSummary?: string | null;
  submitterId: number;
  submitTime: string;
  status: string;
  approvedAt?: string | null;
  rejectedReason?: string | null;
};

export type ReviewTaskDetailResponse = {
  task: CheckTaskResponse;
  auditRecord: AuditRecordResponse;
};

export type FieldDiff = {
  fieldName: string;
  beforeValue?: string | null;
  afterValue?: string | null;
  changeType: string;
};

export type ReviewDiffResponse = {
  reviewTaskId: number;
  revisionId: number;
  clanId: number;
  targetType: string;
  targetId: number;
  changeType: string;
  diffSummary?: string | null;
  fields: FieldDiff[];
};

export type ReviewTaskView = "pending" | "submitted" | "processed";

export type ReviewTaskScope = "mine" | "all";

export type ReviewTargetSummaryResponse = {
  displayTitle: string;
  fileName?: string | null;
  branchName?: string | null;
  draftCount?: number | null;
  excludedCount?: number | null;
  reviewRound?: number | null;
};

export type ReviewTaskListItemResponse = {
  id: number;
  clanId: number;
  revisionId: number;
  branchId?: number | null;
  branchName?: string | null;
  status: string;
  targetType: string;
  targetId: number;
  title: string;
  diffSummary?: string | null;
  submitterId: number;
  submitterName?: string | null;
  reviewerId?: number | null;
  reviewerName?: string | null;
  reviewComment?: string | null;
  submitTime: string;
  processedAt?: string | null;
  targetSummary: ReviewTargetSummaryResponse;
};

export type ReviewTaskPage = {
  records: ReviewTaskListItemResponse[];
  total: number;
  pageNo: number;
  pageSize: number;
  totalPages: number;
};

export type ReviewTaskViewDetailResponse = {
  task: ReviewTaskListItemResponse;
  history: ReviewTaskListItemResponse[];
};
