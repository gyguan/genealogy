export type TrackingTab = 'object' | 'audit' | 'risk';

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

export type RiskFilters = {
  actorId: string;
  riskLevel: string;
  eventType: string;
  branchId: string;
  dispositionStatus: string;
  startTime: string;
  endTime: string;
  pageNo: number;
  pageSize: number;
};

export type TrackingCenterState = {
  clanId: string;
  activeTab: TrackingTab;
  objectFilters: ObjectFilters;
  auditFilters: AuditFilters;
  riskFilters: RiskFilters;
  selectedTrace: { targetType: string; targetId: string; reviewTaskId: string };
  selectedAuditLogId: string;
  selectedRiskLogId: string;
};

export const TRACKING_TABS: Readonly<{ OBJECT: 'object'; AUDIT: 'audit'; RISK: 'risk' }>;
export const DEFAULT_OBJECT_FILTERS: Readonly<ObjectFilters>;
export const DEFAULT_AUDIT_FILTERS: Readonly<AuditFilters>;
export const DEFAULT_RISK_FILTERS: Readonly<RiskFilters>;
export function readTrackingCenterState(search?: string): TrackingCenterState;
export function writeTrackingCenterState(state: TrackingCenterState, currentSearch?: string): string;
export function buildObjectQuery(filters: ObjectFilters, clanId: string, branchId?: string): string;
export function buildAuditQuery(filters: AuditFilters, clanId: string): string;
export function buildRiskQuery(filters: RiskFilters, clanId: string): string;
