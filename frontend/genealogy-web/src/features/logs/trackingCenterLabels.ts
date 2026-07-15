import type { RiskAuditEventResponse, TrackingTraceTimelineEventResponse } from '../../shared/api/generated/tracking-types';

export const OBJECT_TYPE_OPTIONS = [
  { value: 'person', label: '人物' },
  { value: 'relationship', label: '亲属关系' },
  { value: 'source', label: '来源资料' },
  { value: 'branch', label: '支派' },
  { value: 'review_task', label: '审核事项' }
];

export const AUDIT_TARGET_OPTIONS = [
  { value: '', label: '全部对象' },
  ...OBJECT_TYPE_OPTIONS,
  { value: 'clan', label: '宗族' }
];

export const OBJECT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待审核' },
  { value: 'pending_review', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'official', label: '正式' },
  { value: 'verified', label: '已核验' },
  { value: 'unverified', label: '待核验' },
  { value: 'archived', label: '已归档' }
];

export const AUDIT_RESULT_OPTIONS = [
  { value: '', label: '全部结果' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' }
];

export const RISK_LEVEL_OPTIONS = [
  { value: '', label: '全部等级' },
  { value: 'critical', label: '严重' },
  { value: 'high', label: '高风险' },
  { value: 'medium', label: '中风险' },
  { value: 'low', label: '低风险' }
];

export const RISK_EVENT_OPTIONS = [
  { value: '', label: '全部事件' },
  { value: 'permission_change', label: '权限与管理员变更' },
  { value: 'sensitive_access', label: '敏感资料访问' },
  { value: 'bulk_export', label: '批量导出' },
  { value: 'formal_data_change', label: '正式数据高影响变更' },
  { value: 'review_anomaly', label: '审核异常' },
  { value: 'access_denied', label: '越权拒绝' }
];

export const RISK_DISPOSITION_OPTIONS = [
  { value: '', label: '全部处置状态' },
  { value: 'open', label: '待处置' },
  { value: 'reviewing', label: '处置中' },
  { value: 'resolved', label: '已完成' },
  { value: 'accepted', label: '已接受风险' }
];

export const ACTION_OPTIONS = [
  {
    label: '人物维护',
    options: [
      { value: 'person_create', label: '创建人物' },
      { value: 'person_update', label: '更新人物' },
      { value: 'person_delete', label: '删除人物' }
    ]
  },
  {
    label: '关系维护',
    options: [
      { value: 'relationship_create', label: '创建关系' },
      { value: 'relationship_update', label: '更新关系' },
      { value: 'relationship_delete', label: '删除关系' }
    ]
  },
  {
    label: '来源资料',
    options: [
      { value: 'source_create', label: '创建来源' },
      { value: 'source_update', label: '更新来源' },
      { value: 'source_binding_create', label: '绑定来源' }
    ]
  },
  {
    label: '审核处理',
    options: [
      { value: 'review_submit', label: '提交审核' },
      { value: 'review_approve', label: '审核通过' },
      { value: 'review_reject', label: '审核驳回' }
    ]
  },
  {
    label: '批量导入',
    options: [
      { value: 'person_csv_import', label: '人物导入' },
      { value: 'relationship_csv_import', label: '关系导入' }
    ]
  }
];

export function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function statusText(value?: string | null) {
  const dict: Record<string, string> = {
    pending: '待审核',
    pending_review: '待审核',
    approved: '已通过',
    rejected: '已驳回',
    draft: '草稿',
    official: '正式',
    archived: '已归档',
    active: '有效',
    disabled: '停用',
    verified: '已核验',
    unverified: '待核验',
    success: '成功',
    failed: '失败',
    submitted: '已提交'
  };
  return dict[String(value || '').toLowerCase()] || value || '-';
}

export function statusColor(value?: string | null) {
  const status = String(value || '').toLowerCase();
  if (['approved', 'official', 'active', 'verified', 'success'].includes(status)) return 'success';
  if (['rejected', 'disabled', 'failed'].includes(status)) return 'error';
  if (['pending', 'pending_review', 'draft', 'unverified', 'submitted'].includes(status)) return 'processing';
  return 'default';
}

export function riskLevelText(value?: string | null) {
  const dict: Record<string, string> = { critical: '严重', high: '高风险', medium: '中风险', low: '低风险' };
  return dict[String(value || '').toLowerCase()] || value || '-';
}

export function riskLevelColor(value?: string | null) {
  const level = String(value || '').toLowerCase();
  if (level === 'critical') return 'error';
  if (level === 'high') return 'volcano';
  if (level === 'medium') return 'warning';
  if (level === 'low') return 'processing';
  return 'default';
}

export function riskEventText(value?: RiskAuditEventResponse['eventType'] | null) {
  return RISK_EVENT_OPTIONS.find(option => option.value === value)?.label || value || '-';
}

export function riskDispositionText(value?: RiskAuditEventResponse['dispositionStatus'] | null) {
  return RISK_DISPOSITION_OPTIONS.find(option => option.value === value)?.label || value || '-';
}

export function riskDispositionColor(value?: RiskAuditEventResponse['dispositionStatus'] | null) {
  if (value === 'open') return 'error';
  if (value === 'reviewing') return 'processing';
  if (value === 'resolved') return 'success';
  if (value === 'accepted') return 'warning';
  return 'default';
}

export function actionText(value?: string | null) {
  for (const group of ACTION_OPTIONS) {
    const found = group.options.find(option => option.value === value);
    if (found) return found.label;
  }
  return value || '-';
}

export function targetTypeText(type?: string | null) {
  const dict: Record<string, string> = {
    person: '人物',
    persons: '人物',
    relationship: '亲属关系',
    relationships: '亲属关系',
    source: '来源资料',
    sources: '来源资料',
    source_attachment: '来源附件',
    member_role: '成员授权',
    clan_membership: '宗族成员',
    operation_log: '操作日志',
    branch: '支派',
    branches: '支派',
    clan: '宗族',
    review_task: '审核事项'
  };
  return dict[type || ''] || type || '业务对象';
}

export function traceSourceText(source: TrackingTraceTimelineEventResponse['sourceType']) {
  const dict: Record<TrackingTraceTimelineEventResponse['sourceType'], string> = {
    revision: '版本变更',
    review_task: '审核记录',
    source_binding: '来源证据',
    operation_log: '操作记录'
  };
  return dict[source];
}

export function traceEventColor(event: TrackingTraceTimelineEventResponse) {
  if (event.eventType === 'REVIEW_REJECTED' || event.eventType === 'OBJECT_DELETED') return 'red';
  if (event.eventType === 'REVIEW_APPROVED' || event.eventType === 'OBJECT_CREATED') return 'green';
  if (event.eventType === 'REVIEW_REQUESTED' || event.eventType === 'REVISION_SUBMITTED') return 'blue';
  return 'gray';
}

export function formatDateTime(value?: string | null, fallback = '时间未记录') {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(parsed).replace(/\//g, '-');
}

export function coverageText(level?: string | null) {
  if (level === 'complete') return '完整覆盖';
  if (level === 'minimal') return '基础记录';
  if (level === 'partial') return '部分覆盖';
  return '尚未加载';
}
