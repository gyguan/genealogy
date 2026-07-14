import type {
  CultureCategory,
  CultureConfidenceLevel,
  CultureDataStatus,
  CulturePrivacyLevel,
  CultureSensitiveLevel
} from '../../shared/api/generated/culture-types';

export type CultureOption<T extends string = string> = { value: T; label: string };

export const categoryOptions: CultureOption<CultureCategory>[] = [
  { value: 'surname_origin', label: '姓氏源流' },
  { value: 'hall_name', label: '堂号' },
  { value: 'commandery', label: '郡望' },
  { value: 'family_instruction', label: '家训' },
  { value: 'ancestor_instruction', label: '祖训' },
  { value: 'clan_rule', label: '族规' },
  { value: 'genealogy_preface', label: '谱序' },
  { value: 'genealogy_rule', label: '凡例' },
  { value: 'person_story', label: '人物故事' },
  { value: 'custom_tradition', label: '传统习俗' },
  { value: 'other', label: '其他' }
];

export const statusOptions: CultureOption<CultureDataStatus>[] = [
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待审核' },
  { value: 'official', label: '正式' },
  { value: 'rejected', label: '已驳回' },
  { value: 'archived', label: '已归档' }
];

export const privacyOptions: CultureOption<CulturePrivacyLevel>[] = [
  { value: 'public', label: '公开' },
  { value: 'clan_only', label: '宗族内可见' },
  { value: 'branch_only', label: '支派内可见' },
  { value: 'relatives_only', label: '亲属可见' },
  { value: 'private', label: '私密' },
  { value: 'sealed', label: '封存' }
];

export const confidenceOptions: CultureOption<CultureConfidenceLevel>[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
  { value: 'unknown', label: '待评估' }
];

export const sensitiveOptions: CultureOption<CultureSensitiveLevel>[] = [
  { value: 'normal', label: '普通' },
  { value: 'sensitive', label: '敏感' },
  { value: 'highly_sensitive', label: '高敏' }
];

export const sortOptions: CultureOption[] = [
  { value: 'updatedAt,desc', label: '最近更新' },
  { value: 'createdAt,desc', label: '最近创建' },
  { value: 'title,asc', label: '标题升序' },
  { value: 'category,asc', label: '分类升序' },
  { value: 'sortOrder,asc', label: '人工排序' }
];

export const booleanOptions: CultureOption[] = [
  { value: 'true', label: '是' },
  { value: 'false', label: '否' }
];

export function optionLabel<T extends string>(options: CultureOption<T>[], value?: string | null, fallback = '待维护') {
  return options.find(option => option.value === value)?.label || fallback;
}

export function statusColor(value?: CultureDataStatus) {
  if (value === 'official') return 'success';
  if (value === 'pending_review') return 'processing';
  if (value === 'rejected') return 'error';
  if (value === 'draft') return 'warning';
  return 'default';
}

export function privacyColor(value?: CulturePrivacyLevel) {
  if (value === 'sealed' || value === 'private') return 'error';
  if (value === 'relatives_only' || value === 'branch_only') return 'warning';
  if (value === 'public') return 'success';
  return 'default';
}

export function confidenceColor(value?: CultureConfidenceLevel) {
  if (value === 'high') return 'success';
  if (value === 'medium') return 'processing';
  if (value === 'low') return 'warning';
  return 'default';
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);
}

export function formatFileSize(value?: number | null) {
  const size = Number(value || 0);
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function formatCoverageRate(value?: number | null) {
  const raw = Number(value || 0);
  return Math.max(0, Math.min(100, raw <= 1 ? raw * 100 : raw));
}
