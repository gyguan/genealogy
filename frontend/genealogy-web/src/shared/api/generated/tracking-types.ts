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
  objectType: "person" | "relationship" | "source" | "branch" | "review_task";
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
