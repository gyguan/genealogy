export const TRACKING_TABS = Object.freeze({ OBJECT: 'object', AUDIT: 'audit' });

export const DEFAULT_OBJECT_FILTERS = Object.freeze({
  objectType: 'person',
  keyword: '',
  status: '',
  changedFrom: '',
  changedTo: '',
  pageNo: 1,
  pageSize: 10
});

export const DEFAULT_AUDIT_FILTERS = Object.freeze({
  actorId: '',
  actionType: '',
  targetType: '',
  resultStatus: '',
  keyword: '',
  startTime: '',
  endTime: '',
  pageNo: 1,
  pageSize: 20
});

const TRACKING_PARAM_KEYS = [
  'view', 'trackingTab',
  'objectType', 'objectKeyword', 'objectStatus', 'objectFrom', 'objectTo', 'objectPage', 'objectPageSize',
  'traceType', 'traceId',
  'auditActor', 'auditAction', 'auditTarget', 'auditResult', 'auditKeyword', 'auditFrom', 'auditTo',
  'auditPage', 'auditPageSize', 'auditLog'
];

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function text(params, key, fallback = '') {
  return String(params.get(key) || fallback).trim();
}

export function readTrackingCenterState(search = '') {
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  const activeTab = params.get('trackingTab') === TRACKING_TABS.AUDIT
    ? TRACKING_TABS.AUDIT
    : TRACKING_TABS.OBJECT;

  return {
    activeTab,
    objectFilters: {
      objectType: text(params, 'objectType', DEFAULT_OBJECT_FILTERS.objectType),
      keyword: text(params, 'objectKeyword'),
      status: text(params, 'objectStatus'),
      changedFrom: text(params, 'objectFrom'),
      changedTo: text(params, 'objectTo'),
      pageNo: positiveInt(params.get('objectPage'), DEFAULT_OBJECT_FILTERS.pageNo),
      pageSize: positiveInt(params.get('objectPageSize'), DEFAULT_OBJECT_FILTERS.pageSize)
    },
    auditFilters: {
      actorId: text(params, 'auditActor'),
      actionType: text(params, 'auditAction'),
      targetType: text(params, 'auditTarget'),
      resultStatus: text(params, 'auditResult'),
      keyword: text(params, 'auditKeyword'),
      startTime: text(params, 'auditFrom'),
      endTime: text(params, 'auditTo'),
      pageNo: positiveInt(params.get('auditPage'), DEFAULT_AUDIT_FILTERS.pageNo),
      pageSize: positiveInt(params.get('auditPageSize'), DEFAULT_AUDIT_FILTERS.pageSize)
    },
    selectedTrace: {
      targetType: text(params, 'traceType'),
      targetId: text(params, 'traceId')
    },
    selectedAuditLogId: text(params, 'auditLog')
  };
}

function setWhen(params, key, value, defaultValue = '') {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized === String(defaultValue)) params.delete(key);
  else params.set(key, normalized);
}

export function writeTrackingCenterState(state, currentSearch = '') {
  const params = new URLSearchParams(String(currentSearch).replace(/^\?/, ''));
  TRACKING_PARAM_KEYS.forEach(key => params.delete(key));
  params.set('view', 'auditTrace');

  if (state.activeTab === TRACKING_TABS.AUDIT) params.set('trackingTab', TRACKING_TABS.AUDIT);

  const object = state.objectFilters || DEFAULT_OBJECT_FILTERS;
  setWhen(params, 'objectType', object.objectType, DEFAULT_OBJECT_FILTERS.objectType);
  setWhen(params, 'objectKeyword', object.keyword);
  setWhen(params, 'objectStatus', object.status);
  setWhen(params, 'objectFrom', object.changedFrom);
  setWhen(params, 'objectTo', object.changedTo);
  setWhen(params, 'objectPage', object.pageNo, DEFAULT_OBJECT_FILTERS.pageNo);
  setWhen(params, 'objectPageSize', object.pageSize, DEFAULT_OBJECT_FILTERS.pageSize);

  const audit = state.auditFilters || DEFAULT_AUDIT_FILTERS;
  setWhen(params, 'auditActor', audit.actorId);
  setWhen(params, 'auditAction', audit.actionType);
  setWhen(params, 'auditTarget', audit.targetType);
  setWhen(params, 'auditResult', audit.resultStatus);
  setWhen(params, 'auditKeyword', audit.keyword);
  setWhen(params, 'auditFrom', audit.startTime);
  setWhen(params, 'auditTo', audit.endTime);
  setWhen(params, 'auditPage', audit.pageNo, DEFAULT_AUDIT_FILTERS.pageNo);
  setWhen(params, 'auditPageSize', audit.pageSize, DEFAULT_AUDIT_FILTERS.pageSize);

  setWhen(params, 'traceType', state.selectedTrace?.targetType);
  setWhen(params, 'traceId', state.selectedTrace?.targetId);
  setWhen(params, 'auditLog', state.selectedAuditLogId);

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildObjectQuery(filters, clanId, branchId = '') {
  const params = new URLSearchParams({
    clanId: String(clanId || ''),
    objectType: String(filters.objectType || DEFAULT_OBJECT_FILTERS.objectType),
    pageNo: String(positiveInt(filters.pageNo, DEFAULT_OBJECT_FILTERS.pageNo)),
    pageSize: String(positiveInt(filters.pageSize, DEFAULT_OBJECT_FILTERS.pageSize))
  });
  if (branchId) params.set('branchId', String(branchId));
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.status?.trim()) params.set('status', filters.status.trim());
  if (filters.changedFrom?.trim()) params.set('changedFrom', filters.changedFrom.trim());
  if (filters.changedTo?.trim()) params.set('changedTo', filters.changedTo.trim());
  return params.toString();
}

export function buildAuditQuery(filters, clanId) {
  const params = new URLSearchParams({
    clanId: String(clanId || ''),
    pageNo: String(positiveInt(filters.pageNo, DEFAULT_AUDIT_FILTERS.pageNo)),
    pageSize: String(positiveInt(filters.pageSize, DEFAULT_AUDIT_FILTERS.pageSize))
  });
  if (filters.actorId?.trim()) params.set('actorId', filters.actorId.trim());
  if (filters.actionType?.trim()) params.set('actionType', filters.actionType.trim());
  if (filters.targetType?.trim()) params.set('targetType', filters.targetType.trim());
  if (filters.resultStatus?.trim()) params.set('resultStatus', filters.resultStatus.trim());
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.startTime?.trim()) params.set('startTime', filters.startTime.trim());
  if (filters.endTime?.trim()) params.set('endTime', filters.endTime.trim());
  return params.toString();
}
