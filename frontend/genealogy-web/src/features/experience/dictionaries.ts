export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  pending_review: '待审核',
  reviewing: '审核中',
  official: '正式',
  active: '正式',
  approved: '已通过',
  reviewed: '已复核',
  rejected: '已驳回',
  archived: '已归档'
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  genealogy_book: '族谱原文',
  photo: '照片资料',
  local_chronicle: '地方志',
  oral_record: '口述记录',
  tombstone: '墓志/碑刻',
  archive: '档案资料',
  other: '其他'
};

export const SOURCE_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待复核',
  pending_review: '待复核',
  reviewed: '已复核',
  approved: '已复核',
  official: '正式',
  rejected: '已驳回',
  archived: '已归档'
};

export const RELATION_TYPE_LABELS: Record<string, string> = {
  father: '父亲',
  mother: '母亲',
  parent_child: '亲子',
  child: '子女',
  spouse: '配偶',
  husband: '丈夫',
  wife: '妻子',
  adopted_in: '继入',
  adopted_out: '出嗣'
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
  person: '人物',
  relationship: '关系',
  source: '来源',
  branch: '支派',
  generation_scheme: '字辈方案',
  clan: '宗族'
};

export const CONFIDENCE_LABELS: Record<string, string> = { high: '高', medium: '中', low: '低' };

export const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' }
];

export const SOURCE_TYPE_OPTIONS = Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function statusText(value?: string) {
  const status = String(value || '').trim().toLowerCase();
  return STATUS_LABELS[status] || value || '已记录';
}

export function statusColor(value?: string) {
  const status = String(value || '').trim().toLowerCase();
  if (['official', 'active', 'approved', 'reviewed'].includes(status)) return 'success';
  if (['pending', 'pending_review', 'reviewing'].includes(status)) return 'processing';
  if (status === 'rejected') return 'error';
  return 'default';
}

export function sourceTypeText(value?: string) {
  const type = String(value || '').trim().toLowerCase();
  return SOURCE_TYPE_LABELS[type] || value || '资料来源待维护';
}

export function sourceStatusText(value?: string) {
  const status = String(value || '').trim().toLowerCase();
  return SOURCE_STATUS_LABELS[status] || value || '待复核';
}

export function sourceStatusColor(value?: string) {
  const status = String(value || '').trim().toLowerCase();
  if (['reviewed', 'approved', 'official'].includes(status)) return 'success';
  if (['pending', 'pending_review'].includes(status)) return 'processing';
  if (status === 'rejected') return 'error';
  return 'default';
}

export function confidenceText(value?: string) {
  const text = String(value || '').trim().toLowerCase();
  return CONFIDENCE_LABELS[text] || value || '待评估';
}

export function relationTypeText(value?: string) {
  const type = String(value || '').trim().toLowerCase();
  return RELATION_TYPE_LABELS[type] || value || '亲属关系';
}

export function targetTypeText(value?: string) {
  const type = String(value || '').trim().toLowerCase();
  return TARGET_TYPE_LABELS[type] || value || '审核对象';
}
