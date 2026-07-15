import assert from 'node:assert/strict';
import {
  DEFAULT_AUDIT_FILTERS,
  DEFAULT_OBJECT_FILTERS,
  DEFAULT_RISK_FILTERS,
  TRACKING_TABS,
  buildAuditQuery,
  buildObjectQuery,
  buildRiskQuery,
  readTrackingCenterState,
  writeTrackingCenterState
} from './trackingCenterModel.js';

const legacy = readTrackingCenterState('?view=auditTrace&trackingTab=audit&objectType=source&objectKeyword=%E6%97%8F%E8%B0%B1&objectPage=3&traceType=source&traceId=88&auditActor=9&auditAction=source_update&auditPageSize=50&auditLog=31');
assert.equal(legacy.activeTab, TRACKING_TABS.AUDIT);
assert.equal(legacy.clanId, '');
assert.deepEqual(legacy.objectFilters, {
  ...DEFAULT_OBJECT_FILTERS,
  objectType: 'source',
  keyword: '族谱',
  pageNo: 3
});
assert.deepEqual(legacy.auditFilters, {
  ...DEFAULT_AUDIT_FILTERS,
  actorId: '9',
  actionType: 'source_update',
  pageSize: 50
});
assert.deepEqual(legacy.riskFilters, DEFAULT_RISK_FILTERS);
assert.deepEqual(legacy.selectedTrace, { targetType: 'source', targetId: '88', reviewTaskId: '' });
assert.equal(legacy.selectedAuditLogId, '31');
assert.equal(legacy.selectedRiskLogId, '');

const canonical = readTrackingCenterState('?view=auditTrace&tab=risk&clanId=7&targetType=relationship&targetId=91&reviewTaskId=33&objectKeyword=%E5%BC%A0%E4%B8%89&riskLevel=critical&riskEvent=permission_change&riskBranch=12&riskDisposition=open&riskPage=2&riskLog=77');
assert.equal(canonical.activeTab, TRACKING_TABS.RISK);
assert.equal(canonical.clanId, '7');
assert.deepEqual(canonical.selectedTrace, { targetType: 'relationship', targetId: '91', reviewTaskId: '33' });
assert.equal(canonical.objectFilters.keyword, '张三');
assert.deepEqual(canonical.riskFilters, {
  ...DEFAULT_RISK_FILTERS,
  riskLevel: 'critical',
  eventType: 'permission_change',
  branchId: '12',
  dispositionStatus: 'open',
  pageNo: 2
});
assert.equal(canonical.selectedRiskLogId, '77');

const serialized = writeTrackingCenterState(canonical, '?unrelated=keep&view=home&traceType=person&traceId=1');
const serializedParams = new URLSearchParams(serialized.slice(1));
assert.equal(serializedParams.get('unrelated'), 'keep');
assert.equal(serializedParams.get('view'), 'auditTrace');
assert.equal(serializedParams.get('tab'), 'risk');
assert.equal(serializedParams.get('clanId'), '7');
assert.equal(serializedParams.get('targetType'), 'relationship');
assert.equal(serializedParams.get('targetId'), '91');
assert.equal(serializedParams.get('reviewTaskId'), '33');
assert.equal(serializedParams.get('riskLevel'), 'critical');
assert.equal(serializedParams.get('riskEvent'), 'permission_change');
assert.equal(serializedParams.get('riskBranch'), '12');
assert.equal(serializedParams.get('riskDisposition'), 'open');
assert.equal(serializedParams.get('riskLog'), '77');
assert.equal(serializedParams.get('trackingTab'), null);
assert.equal(serializedParams.get('traceType'), null);
assert.doesNotMatch(serialized, /objectPageSize=10/);
assert.deepEqual(readTrackingCenterState(serialized), canonical);

const objectQuery = new URLSearchParams(buildObjectQuery({
  ...DEFAULT_OBJECT_FILTERS,
  keyword: '张三',
  status: 'official',
  changedFrom: '2026-07-01T00:00:00',
  pageNo: 2
}, '1', '10'));
assert.equal(objectQuery.get('clanId'), '1');
assert.equal(objectQuery.get('branchId'), '10');
assert.equal(objectQuery.get('keyword'), '张三');
assert.equal(objectQuery.get('status'), 'official');
assert.equal(objectQuery.get('pageNo'), '2');

const auditQuery = new URLSearchParams(buildAuditQuery({
  ...DEFAULT_AUDIT_FILTERS,
  actorId: '9',
  actionType: 'review_approve',
  targetType: 'review_task',
  resultStatus: 'success',
  keyword: '审核',
  startTime: '2026-07-01T00:00:00'
}, '1'));
assert.equal(auditQuery.get('actorId'), '9');
assert.equal(auditQuery.get('actionType'), 'review_approve');
assert.equal(auditQuery.get('targetType'), 'review_task');
assert.equal(auditQuery.get('resultStatus'), 'success');
assert.equal(auditQuery.get('keyword'), '审核');
assert.equal(auditQuery.get('startTime'), '2026-07-01T00:00:00');

const riskQuery = new URLSearchParams(buildRiskQuery({
  ...DEFAULT_RISK_FILTERS,
  actorId: '9',
  riskLevel: 'high',
  eventType: 'bulk_export',
  branchId: '12',
  dispositionStatus: 'resolved',
  startTime: '2026-07-01T00:00:00',
  pageNo: 3,
  pageSize: 50
}, '1'));
assert.equal(riskQuery.get('clanId'), '1');
assert.equal(riskQuery.get('actorId'), '9');
assert.equal(riskQuery.get('riskLevel'), 'high');
assert.equal(riskQuery.get('eventType'), 'bulk_export');
assert.equal(riskQuery.get('branchId'), '12');
assert.equal(riskQuery.get('dispositionStatus'), 'resolved');
assert.equal(riskQuery.get('startTime'), '2026-07-01T00:00:00');
assert.equal(riskQuery.get('pageNo'), '3');
assert.equal(riskQuery.get('pageSize'), '50');

console.log('trackingCenterModel tests passed');
