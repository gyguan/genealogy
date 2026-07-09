export type DictionaryOption = { value: string; label: string };
export type DictionaryColor = 'success' | 'processing' | 'error' | 'warning' | 'default' | 'blue' | 'green' | 'red' | 'orange' | 'purple';

function normalize(value?: string | number | boolean | null) {
  return String(value ?? '').trim().toLowerCase();
}

function toOptions(labels: Record<string, string>): DictionaryOption[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

export const STATUS_LABELS: Record<string, string> = { draft: '草稿', pending: '待审核', pending_review: '待审核', reviewing: '审核中', submitted: '已提交', official: '正式', active: '正式', enabled: '启用', disabled: '已停用', approved: '已通过', passed: '已通过', reviewed: '已复核', rejected: '已驳回', revoked: '已撤销', cancelled: '已取消', canceled: '已取消', completed: '已完成', archived: '已归档', failed: '失败', success: '成功', processing: '处理中', uploaded: '已上传' };
export const STATUS_COLORS: Record<string, DictionaryColor> = { official: 'success', active: 'success', enabled: 'success', approved: 'success', passed: 'success', reviewed: 'success', completed: 'success', success: 'success', uploaded: 'success', pending: 'processing', pending_review: 'processing', reviewing: 'processing', submitted: 'processing', processing: 'processing', rejected: 'error', failed: 'error', revoked: 'default', disabled: 'default', archived: 'default', cancelled: 'default', canceled: 'default', draft: 'default' };
export const GENDER_LABELS: Record<string, string> = { male: '男', female: '女', unknown: '未知' };
export const SOURCE_TYPE_LABELS: Record<string, string> = { genealogy_book: '族谱文献', genealogy: '族谱文献', photo: '照片资料', image: '照片资料', local_chronicle: '地方志', oral: '口述材料', oral_record: '口述材料', tombstone: '碑刻墓志', archive: '档案资料', file: '附件资料', other: '其他' };
export const RELATION_TYPE_LABELS: Record<string, string> = { father: '父亲', mother: '母亲', parent_child: '亲子', child: '子女', son: '子', daughter: '女', spouse: '配偶', husband: '丈夫', wife: '妻子', adoptive: '收养', adopted_in: '继入', adopted_out: '出嗣', adoptive_father: '养父', adoptive_mother: '养母', heir_successor: '继嗣', successor: '继嗣', out_adoption: '出嗣', out_adopted: '出嗣' };
export const REVIEW_TARGET_TYPE_LABELS: Record<string, string> = { person: '人物', persons: '人物', relationship: '关系', relationships: '关系', source: '来源', sources: '来源', branch: '支派', branches: '支派', generation_scheme: '字辈方案', generation_schemes: '字辈方案', generation_scheme_item: '字辈明细', clan: '宗族', review_task: '审核任务' };
export const PRIVACY_LEVEL_LABELS: Record<string, string> = { public: '公开', clan_only: '宗族内可见', branch_only: '支派内可见', relatives_only: '亲属可见', private: '私密', sealed: '封存' };
export const ROLE_TYPE_LABELS: Record<string, string> = { manage: '管理角色', view: '查看角色', system: '系统角色', business: '业务角色' };
export const MEMBER_STATUS_LABELS: Record<string, string> = { active: '有效', enabled: '有效', disabled: '已停用', revoked: '已撤销', pending: '待生效' };
export const IMPORT_STATUS_LABELS: Record<string, string> = { pending: '待处理', processing: '处理中', success: '成功', completed: '已完成', failed: '失败', partial_success: '部分成功' };
export const SOURCE_STATUS_LABELS: Record<string, string> = { ...STATUS_LABELS, pending: '待复核', pending_review: '待复核', reviewed: '已复核', approved: '已复核' };
export const CONFIDENCE_LABELS: Record<string, string> = { high: '高', medium: '中', low: '低' };

export const STATUS_OPTIONS = toOptions(STATUS_LABELS);
export const GENDER_OPTIONS = toOptions(GENDER_LABELS);
export const SOURCE_TYPE_OPTIONS = toOptions(SOURCE_TYPE_LABELS);
export const RELATION_TYPE_OPTIONS = toOptions(RELATION_TYPE_LABELS);
export const REVIEW_TARGET_TYPE_OPTIONS = toOptions(REVIEW_TARGET_TYPE_LABELS);
export const PRIVACY_LEVEL_OPTIONS = toOptions(PRIVACY_LEVEL_LABELS);
export const ROLE_TYPE_OPTIONS = toOptions(ROLE_TYPE_LABELS);
export const MEMBER_STATUS_OPTIONS = toOptions(MEMBER_STATUS_LABELS);
export const IMPORT_STATUS_OPTIONS = toOptions(IMPORT_STATUS_LABELS);

export function dictionaryText(labels: Record<string, string>, value?: string | number | boolean | null, fallback = '待维护') {
  const key = normalize(value);
  return labels[key] || String(value ?? '').trim() || fallback;
}

export function dictionaryColor(colors: Record<string, DictionaryColor>, value?: string | number | boolean | null, fallback: DictionaryColor = 'default') {
  return colors[normalize(value)] || fallback;
}

export function statusText(value?: string | number | null, fallback = '已记录') { return dictionaryText(STATUS_LABELS, value, fallback); }
export function statusColor(value?: string | number | null) { return dictionaryColor(STATUS_COLORS, value); }
export function genderText(value?: string | number | null, fallback = '未知') { return dictionaryText(GENDER_LABELS, value, fallback); }
export function sourceTypeText(value?: string | number | null, fallback = '资料来源待维护') { return dictionaryText(SOURCE_TYPE_LABELS, value, fallback); }
export function sourceStatusText(value?: string | number | null, fallback = '待复核') { return dictionaryText(SOURCE_STATUS_LABELS, value, fallback); }
export function sourceStatusColor(value?: string | number | null) { return statusColor(value); }
export function relationTypeText(value?: string | number | null, fallback = '亲属关系') { return dictionaryText(RELATION_TYPE_LABELS, value, fallback); }
export function reviewTargetTypeText(value?: string | number | null, fallback = '审核对象') { return dictionaryText(REVIEW_TARGET_TYPE_LABELS, value, fallback); }
export const targetTypeText = reviewTargetTypeText;
export function privacyLevelText(value?: string | number | null, fallback = '隐私级别待维护') { return dictionaryText(PRIVACY_LEVEL_LABELS, value, fallback); }
export function roleTypeText(value?: string | number | null, fallback = '角色类型待维护') { return dictionaryText(ROLE_TYPE_LABELS, value, fallback); }
export function roleTypeColor(value?: string | number | null): DictionaryColor { const key = normalize(value); if (key === 'view') return 'blue'; if (key === 'manage') return 'green'; return 'default'; }
export function memberStatusText(value?: string | number | null, fallback = '成员状态待维护') { return dictionaryText(MEMBER_STATUS_LABELS, value, fallback); }
export function memberStatusColor(value?: string | number | null) { return statusColor(value); }
export function importStatusText(value?: string | number | null, fallback = '导入状态待维护') { return dictionaryText(IMPORT_STATUS_LABELS, value, fallback); }
export function importStatusColor(value?: string | number | null) { return statusColor(value); }
export function confidenceText(value?: string | number | null, fallback = '待评估') { return dictionaryText(CONFIDENCE_LABELS, value, fallback); }
