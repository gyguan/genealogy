import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOperationLogScopes,
  buildTraceTimelineEntries,
  evaluateTraceCoverage,
  mergeTraceLogs,
  resolveTraceContext,
  timelineStatusFromReviewStatus,
  traceResetFromLog,
  traceSelectionFromLog
} from './logTraceModel.js';

function reviewTask(status, overrides = {}) {
  return {
    id: 91,
    clanId: 7,
    revisionId: 301,
    status,
    createdAt: '2026-07-01T08:00:00Z',
    reviewComment: status === 'rejected' ? '材料不足' : status === 'approved' ? '审核通过' : null,
    reviewedAt: status === 'pending' ? null : '2026-07-01T09:00:00Z',
    reviewerId: status === 'pending' ? null : 12,
    targetType: 'person',
    targetId: 45,
    submitterId: 11,
    ...overrides
  };
}

function detail(status = 'pending', overrides = {}) {
  return {
    task: reviewTask(status, overrides.task),
    auditRecord: {
      id: 501,
      clanId: 7,
      targetType: 'person',
      targetId: 45,
      changeType: 'modified',
      submitterId: 11,
      submitTime: '2026-07-01T08:00:00Z',
      status,
      ...overrides.auditRecord
    }
  };
}

test('approved, rejected and pending timeline states come only from the real task status', () => {
  assert.equal(timelineStatusFromReviewStatus('approved'), 'done');
  assert.equal(timelineStatusFromReviewStatus('rejected'), 'warn');
  assert.equal(timelineStatusFromReviewStatus('pending'), 'pending');
  assert.equal(timelineStatusFromReviewStatus('unknown'), 'info');

  const approved = buildTraceTimelineEntries([], reviewTask('approved'), null);
  const rejected = buildTraceTimelineEntries([], reviewTask('rejected'), null);
  const pending = buildTraceTimelineEntries([], reviewTask('pending'), null);

  assert.equal(approved[0].status, 'done');
  assert.equal(approved.some(item => item.kind === 'reviewResult'), true);
  assert.equal(rejected[0].status, 'warn');
  assert.equal(rejected.some(item => item.kind === 'reviewResult'), true);
  assert.equal(pending[0].status, 'pending');
  assert.equal(pending.some(item => item.kind === 'reviewResult'), false);
});

test('selecting a new business object clears the previous review task and trace data', () => {
  const first = traceSelectionFromLog({ clanId: 7, targetType: 'review_task', targetId: 91 }, 7, '审核任务');
  assert.equal(first.reviewTaskId, '91');

  const reset = traceResetFromLog({ clanId: 7, targetType: 'person', targetId: 46 }, 7, '人物：新对象');
  assert.deepEqual(reset.selection, {
    clanId: '7',
    targetType: 'person',
    targetId: '46',
    targetSummary: '人物：新对象',
    reviewTaskId: ''
  });
  assert.deepEqual(reset.logs, []);
  assert.equal(reset.reviewTask, null);
  assert.equal(reset.reviewDiff, null);
  assert.equal(reset.coverage, null);
});

test('review task tracing uses the audit record business target and two explicit log scopes', () => {
  const selection = traceSelectionFromLog({ clanId: 7, targetType: 'review_task', targetId: 91 }, 7, '审核任务');
  const context = resolveTraceContext(selection, detail('approved'));

  assert.deepEqual(context.businessTarget, { targetType: 'person', targetId: '45' });
  assert.equal(context.reviewTaskId, '91');
  assert.deepEqual(buildOperationLogScopes(context), [
    { key: 'object', targetType: 'person', targetId: '45' },
    { key: 'reviewTask', targetType: 'review_task', targetId: '91' }
  ]);
  assert.deepEqual(context.issues, []);
});

test('business object tracing without an explicit review task is partial rather than inferred', () => {
  const selection = traceSelectionFromLog({ clanId: 7, targetType: 'relationships', targetId: 88 }, 7, '亲属关系');
  const context = resolveTraceContext(selection, null);
  const coverage = evaluateTraceCoverage({
    context,
    scopeStates: [{ key: 'object', loaded: true }]
  });

  assert.deepEqual(context.businessTarget, { targetType: 'relationship', targetId: '88' });
  assert.equal(context.reviewTaskId, '');
  assert.equal(coverage.level, 'partial');
  assert.equal(coverage.title, '追踪信息不完整');
  assert.match(coverage.message, /未提供可验证的审核任务关联/);
  assert.match(coverage.message, /亲属关系日志/);
});

test('missing review detail is reported and never replaced with a guessed business target', () => {
  const selection = traceSelectionFromLog({ clanId: 7, targetType: 'review_task', targetId: 91 }, 7, '审核任务');
  const context = resolveTraceContext(selection, null);
  const coverage = evaluateTraceCoverage({
    context,
    detailState: 'failed',
    diffState: 'failed',
    scopeStates: [{ key: 'reviewTask', loaded: true }]
  });

  assert.equal(context.businessTarget, null);
  assert.equal(coverage.level, 'partial');
  assert.match(coverage.message, /审核任务详情缺失/);
  assert.match(coverage.message, /无法确认关联业务对象/);
});

test('logs are deduplicated and sorted by real time with missing times last and stable ties', () => {
  const logs = mergeTraceLogs(
    [
      { id: 2, clanId: 7, actionType: 'review_approve', targetType: 'review_task', targetId: 91, createdAt: '2026-07-01T09:00:00Z' },
      { id: 1, clanId: 7, actionType: 'person_update', targetType: 'person', targetId: 45, createdAt: '2026-07-01T08:00:00Z' },
      { id: 4, clanId: 7, actionType: 'source_update', targetType: 'source', targetId: 31, createdAt: undefined }
    ],
    [
      { id: 2, clanId: 7, actionType: 'review_approve', targetType: 'review_task', targetId: 91, createdAt: '2026-07-01T09:00:00Z' },
      { id: 3, clanId: 7, actionType: 'review_submit', targetType: 'review_task', targetId: 91, createdAt: '2026-07-01T09:00:00Z' }
    ]
  );

  assert.deepEqual(logs.map(log => log.id), [1, 2, 3, 4]);
});

test('context mismatches are visible instead of silently joining different objects', () => {
  const selection = traceSelectionFromLog({ clanId: 7, targetType: 'review_task', targetId: 91 }, 7, '审核任务');
  const context = resolveTraceContext(selection, detail('approved', {
    task: { targetType: 'source', targetId: 99 },
    auditRecord: { targetType: 'person', targetId: 45 }
  }));
  const coverage = evaluateTraceCoverage({
    context,
    detailState: 'loaded',
    diffState: 'loaded',
    scopeStates: [
      { key: 'object', loaded: true },
      { key: 'reviewTask', loaded: true }
    ]
  });

  assert.equal(coverage.level, 'partial');
  assert.match(coverage.message, /指向的业务对象不一致/);
});
