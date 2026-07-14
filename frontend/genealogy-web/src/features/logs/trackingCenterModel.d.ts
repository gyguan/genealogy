export type TrackingTab = 'object' | 'audit';

export type ObjectFilters = {
  objectType: string;
  keyword: string;
  status: string;
  changedFrom: string;
  changedTo: string;
  pageNo: number;
  pageSize: number;
};

export type AuditFilters = {
  actorId: string;
  actionType: string;
  targetType: string;
  resultStatus: string;
  keyword: string;
  startTime: string;
  endTime: string;
  pageNo: number;
  pageSize: number;
};

export type TrackingCenterState = {
  activeTab: TrackingTab;
  objectFilters: ObjectFilters;
  auditFilters: AuditFilters;
  selectedTrace: { targetType: string; targetId: string };
  selectedAuditLogId: string;
};

export const TRACKING_TABS: Readonly<{ OBJECT: 'object'; AUDIT: 'audit' }>;
export const DEFAULT_OBJECT_FILTERS: Readonly<ObjectFilters>;
export const DEFAULT_AUDIT_FILTERS: Readonly<AuditFilters>;
export function readTrackingCenterState(search?: string): TrackingCenterState;
export function writeTrackingCenterState(state: TrackingCenterState, currentSearch?: string): string;
export function buildObjectQuery(filters: ObjectFilters, clanId: string, branchId?: string): string;
export function buildAuditQuery(filters: AuditFilters, clanId: string): string;
