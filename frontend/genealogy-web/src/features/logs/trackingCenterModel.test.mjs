import assert from 'node:assert/strict';
import {
  DEFAULT_AUDIT_FILTERS,
  DEFAULT_OBJECT_FILTERS,
  TRACKING_TABS,
  buildAuditQuery,
  buildObjectQuery,
  readTrackingCenterState,
  writeTrackingCenterState
} from './trackingCenterModel.js';

const restored = readTrackingCenterState('?view=auditTrace&trackingTab=audit&objectType=source&objectKeyword=%E6%97%8F%E8%B0%B1&objectPage=3&traceType=source&traceId=88&auditActor=9&auditAction=source_update&auditPageSize=50&auditLog=31');
assert.equal(restored.activeTab, TRACKING_TABS.AUDIT);
assert.deepEqual(restored.objectFilters, {
  ...DEFAULT_OBJECT_FILTERS,
  objectType: 'source',
  keyword: '族谱',
  pageNo: 3
});
assert.deepEqual(restored.auditFilters, {
  ...DEFAULT_AUDIT_FILTERS,
  actorId: '9',
  actionType: 'source_update',
  pageSize: 50
});
assert.deepEqual(restored.selectedTrace, { targetType: 'source', targetId: '88' });
assert.equal(restored.selectedAuditLogId, '31');

const serialized = writeTrackingCenterState(restored, '?unrelated=keep&view=home');
assert.match(serialized, /unrelated=keep/);
assert.match(serialized, /view=auditTrace/);
assert.match(serialized, /trackingTab=audit/);
assert.match(serialized, /traceType=source/);
assert.doesNotMatch(serialized, /objectPageSize=10/);
assert.deepEqual(readTrackingCenterState(serialized), restored);

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

console.log('trackingCenterModel tests passed');
