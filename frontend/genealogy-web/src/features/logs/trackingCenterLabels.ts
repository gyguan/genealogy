import type { TrackingTraceTimelineEventResponse } from '../../shared/api/generated/tracking-types';

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
  }).format(parsed).replaceAll('/', '-');
}

export function coverageText(level?: string | null) {
  if (level === 'complete') return '完整覆盖';
  if (level === 'minimal') return '基础记录';
  if (level === 'partial') return '部分覆盖';
  return '尚未加载';
}
