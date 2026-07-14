const BUSINESS_TARGET_TYPES = new Set(['person', 'relationship', 'source', 'branch', 'clan']);

const TARGET_TYPE_ALIASES = {
  persons: 'person',
  person: 'person',
  relationships: 'relationship',
  relationship: 'relationship',
  sources: 'source',
  source: 'source',
  branches: 'branch',
  branch: 'branch',
  clans: 'clan',
  clan: 'clan',
  review_tasks: 'review_task',
  review_task: 'review_task'
};

const TARGET_TYPE_LABELS = {
  person: '人物',
  relationship: '亲属关系',
  source: '来源资料',
  branch: '支派',
  clan: '宗族',
  review_task: '审核任务'
};

function textId(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function comparableTime(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function logIdentity(log) {
  const id = textId(log?.id);
  if (id) return `id:${id}`;
  return [
    'fallback',
    textId(log?.clanId),
    textId(log?.actionType),
    normalizeTraceTargetType(log?.targetType),
    textId(log?.targetId),
    textId(log?.createdAt),
    textId(log?.actorId),
    textId(log?.summary)
  ].join('|');
}

function timelineIdentity(item) {
  return `${item.kind}:${item.key}`;
}

function stableTimeSort(left, right) {
  const leftTime = comparableTime(left.time);
  const rightTime = comparableTime(right.time);
  if (leftTime !== null && rightTime !== null && leftTime !== rightTime) return leftTime - rightTime;
  if (leftTime === null && rightTime !== null) return 1;
  if (leftTime !== null && rightTime === null) return -1;
  return timelineIdentity(left).localeCompare(timelineIdentity(right));
}

function sameTarget(left, right) {
  return Boolean(left && right
    && left.targetType === right.targetType
    && left.targetId === right.targetId);
}

export function normalizeTraceTargetType(value) {
  const text = String(value ?? '').trim().toLowerCase();
  return TARGET_TYPE_ALIASES[text] || text;
}

export function traceSelectionFromLog(log, fallbackClanId = '', targetSummary = '') {
  const targetType = normalizeTraceTargetType(log?.targetType);
  const targetId = textId(log?.targetId);
  return {
    clanId: textId(log?.clanId) || textId(fallbackClanId),
    targetType,
    targetId,
    targetSummary: String(targetSummary || ''),
    reviewTaskId: targetType === 'review_task' ? targetId : ''
  };
}

export function traceResetFromLog(log, fallbackClanId = '', targetSummary = '') {
  return {
    selection: traceSelectionFromLog(log, fallbackClanId, targetSummary),
    logs: [],
    reviewTask: null,
    reviewDiff: null,
    resolvedTarget: null,
    coverage: null
  };
}

export function resolveTraceContext(selection, detail = null, diff = null) {
  const issues = [];
  const clanId = textId(selection?.clanId);
  const selectedType = normalizeTraceTargetType(selection?.targetType);
  const selectedId = textId(selection?.targetId);
  const reviewTaskId = textId(selection?.reviewTaskId);
  const selectedTarget = selectedType && selectedId ? { targetType: selectedType, targetId: selectedId } : null;
  const selectedBusinessTarget = BUSINESS_TARGET_TYPES.has(selectedType) && selectedId
    ? { targetType: selectedType, targetId: selectedId }
    : null;
  let businessTarget = selectedBusinessTarget;
  let reviewTaskTrusted = false;
  let diffTrusted = false;

  if (!selectedTarget) {
    issues.push('缺少可验证的业务对象类型或标识');
  } else if (!BUSINESS_TARGET_TYPES.has(selectedType) && selectedType !== 'review_task') {
    issues.push(`暂不支持对象类型 ${selectedType}`);
  }

  if (reviewTaskId) {
    const task = detail?.task;
    const auditRecord = detail?.auditRecord;
    if (!detail || !task || !auditRecord) {
      issues.push('审核任务详情缺失，无法确认关联业务对象');
      businessTarget = selectedType === 'review_task' ? null : businessTarget;
    } else {
      let taskIdentityTrusted = true;
      let associationTrusted = true;
      if (textId(task.id) !== reviewTaskId) {
        issues.push('审核任务详情与当前任务标识不一致');
        taskIdentityTrusted = false;
        associationTrusted = false;
      }
      if (clanId && textId(task.clanId) && textId(task.clanId) !== clanId) {
        issues.push('审核任务不属于当前宗族');
        taskIdentityTrusted = false;
        associationTrusted = false;
      }
      if (clanId && textId(auditRecord.clanId) && textId(auditRecord.clanId) !== clanId) {
        issues.push('审核记录不属于当前宗族');
        associationTrusted = false;
      }
      reviewTaskTrusted = taskIdentityTrusted;

      const auditType = normalizeTraceTargetType(auditRecord.targetType);
      const auditId = textId(auditRecord.targetId);
      const auditTarget = BUSINESS_TARGET_TYPES.has(auditType) && auditId
        ? { targetType: auditType, targetId: auditId }
        : null;
      if (!auditTarget) {
        issues.push('审核记录缺少受支持的业务对象关联');
        associationTrusted = false;
      }

      if (selectedBusinessTarget && auditTarget && !sameTarget(selectedBusinessTarget, auditTarget)) {
        issues.push('当前业务对象与审核记录指向的对象不一致');
        associationTrusted = false;
      }

      const taskType = normalizeTraceTargetType(task.targetType);
      const taskId = textId(task.targetId);
      const taskTarget = BUSINESS_TARGET_TYPES.has(taskType) && taskId
        ? { targetType: taskType, targetId: taskId }
        : null;
      if (taskTarget && auditTarget && !sameTarget(taskTarget, auditTarget)) {
        issues.push('审核任务与审核记录指向的业务对象不一致');
        associationTrusted = false;
      }

      businessTarget = associationTrusted ? auditTarget : null;
    }

    if (diff) {
      let diffIdentityTrusted = true;
      if (textId(diff.reviewTaskId) !== reviewTaskId) {
        issues.push('审核 Diff 与当前任务标识不一致');
        diffIdentityTrusted = false;
      }
      if (clanId && textId(diff.clanId) && textId(diff.clanId) !== clanId) {
        issues.push('审核 Diff 不属于当前宗族');
        diffIdentityTrusted = false;
      }
      const diffType = normalizeTraceTargetType(diff.targetType);
      const diffId = textId(diff.targetId);
      const diffTarget = BUSINESS_TARGET_TYPES.has(diffType) && diffId
        ? { targetType: diffType, targetId: diffId }
        : null;
      if (!diffTarget) {
        issues.push('审核 Diff 缺少受支持的业务对象关联');
        diffIdentityTrusted = false;
      }
      if (!businessTarget || !diffTarget || !sameTarget(businessTarget, diffTarget)) {
        issues.push('审核 Diff 与关联业务对象不一致');
        diffIdentityTrusted = false;
      }
      diffTrusted = diffIdentityTrusted;
    }
  }

  return {
    clanId,
    reviewTaskId,
    selectedTarget,
    businessTarget,
    reviewTaskTrusted,
    diffTrusted,
    issues
  };
}

export function buildOperationLogScopes(context) {
  const scopes = [];
  if (context?.businessTarget) {
    scopes.push({
      key: 'object',
      targetType: context.businessTarget.targetType,
      targetId: context.businessTarget.targetId
    });
  }
  if (textId(context?.reviewTaskId)) {
    scopes.push({
      key: 'reviewTask',
      targetType: 'review_task',
      targetId: textId(context.reviewTaskId)
    });
  }
  const seen = new Set();
  return scopes.filter(scope => {
    const key = `${scope.targetType}:${scope.targetId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeTraceLogs(...groups) {
  const unique = new Map();
  groups.flat().filter(Boolean).forEach(log => {
    const key = logIdentity(log);
    if (!unique.has(key)) unique.set(key, log);
  });
  return [...unique.values()].sort((left, right) => {
    const leftTime = comparableTime(left?.createdAt);
    const rightTime = comparableTime(right?.createdAt);
    if (leftTime !== null && rightTime !== null && leftTime !== rightTime) return leftTime - rightTime;
    if (leftTime === null && rightTime !== null) return 1;
    if (leftTime !== null && rightTime === null) return -1;
    return logIdentity(left).localeCompare(logIdentity(right));
  });
}

export function timelineStatusFromReviewStatus(status) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'approved') return 'done';
  if (normalized === 'rejected') return 'warn';
  if (normalized === 'pending') return 'pending';
  return 'info';
}

export function buildTraceTimelineEntries(logs, task = null, diff = null) {
  const items = [];
  if (task) {
    const normalizedStatus = String(task.status ?? '').trim().toLowerCase();
    items.push({
      kind: 'reviewTask',
      key: textId(task.id),
      time: task.createdAt || null,
      source: 'review',
      status: timelineStatusFromReviewStatus(normalizedStatus),
      task
    });
    if (normalizedStatus === 'approved' || normalizedStatus === 'rejected'
      || task.reviewedAt || task.reviewerId || task.reviewComment) {
      items.push({
        kind: 'reviewResult',
        key: textId(task.id),
        time: task.reviewedAt || null,
        source: 'review',
        status: timelineStatusFromReviewStatus(normalizedStatus),
        task
      });
    }
  }
  if (diff) {
    items.push({
      kind: 'diff',
      key: textId(diff.reviewTaskId),
      time: null,
      source: 'diff',
      status: 'info',
      diff
    });
  }
  mergeTraceLogs(logs || []).forEach(log => {
    items.push({
      kind: 'log',
      key: logIdentity(log),
      time: log.createdAt || null,
      source: 'log',
      status: 'info',
      log
    });
  });
  return items.sort(stableTimeSort);
}

function scopeLabel(scope) {
  if (scope.key === 'reviewTask') return '审核任务日志';
  return `${TARGET_TYPE_LABELS[scope.targetType] || scope.targetType || '业务对象'}日志`;
}

export function evaluateTraceCoverage({
  context,
  detailState = 'not_requested',
  diffState = 'not_requested',
  scopeStates = []
}) {
  const covered = [];
  const missing = [...(context?.issues || [])];
  const reviewTaskId = textId(context?.reviewTaskId);

  if (context?.businessTarget) {
    covered.push(`${TARGET_TYPE_LABELS[context.businessTarget.targetType] || context.businessTarget.targetType}对象关联`);
  } else {
    missing.push('无法确认关联业务对象');
  }

  if (reviewTaskId) {
    if (detailState === 'loaded' && context?.reviewTaskTrusted) covered.push('审核任务真实状态与审核意见');
    else if (detailState === 'loaded') missing.push('审核任务详情未通过一致性校验');
    else missing.push('审核任务详情未加载');
    if (diffState === 'loaded' && context?.diffTrusted) covered.push('字段变更明细');
    else if (diffState === 'loaded') missing.push('字段变更明细未通过一致性校验');
    else missing.push('字段变更明细未加载');
  } else {
    missing.push('当前日志未提供可验证的审核任务关联');
  }

  buildOperationLogScopes(context).forEach(scope => {
    const state = scopeStates.find(item => item.key === scope.key);
    if (state?.loaded) covered.push(scopeLabel(scope));
    else missing.push(`${scopeLabel(scope)}未加载`);
  });

  const normalizedMissing = [...new Set(missing.filter(Boolean))];
  const normalizedCovered = [...new Set(covered.filter(Boolean))];
  const complete = normalizedMissing.length === 0;
  return {
    level: complete ? 'complete' : 'partial',
    title: complete ? '追踪链路完整' : '追踪信息不完整',
    message: complete
      ? `已覆盖：${normalizedCovered.join('、')}。`
      : `缺失：${normalizedMissing.join('；')}。${normalizedCovered.length ? `已展示：${normalizedCovered.join('、')}。` : ''}`,
    covered: normalizedCovered,
    missing: normalizedMissing
  };
}
