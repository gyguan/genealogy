export type ApiFieldErrorMap = Record<string, string>;

const FIELD_ALIASES: Record<string, string> = {
  clanName: '宗族名称',
  surname: '姓氏',
  branchId: '所属支派',
  branchName: '支派名称',
  schemeName: '方案名称',
  generationNo: '代次',
  word: '字辈',
  name: '姓名',
  gender: '性别',
  birthDate: '出生日期',
  deathDate: '逝世日期',
  isLiving: '是否在世',
  centerPersonId: '中心人物',
  relativePersonId: '亲属',
  relationType: '关系类型',
  sourceName: '来源名称',
  sourceType: '来源类型',
  targetType: '对象类型',
  targetId: '可提交对象'
};

function messageOf(value: unknown) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(messageOf).filter(Boolean).join('；');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return messageOf(record.message || record.defaultMessage || record.errorMessage);
  }
  return '';
}

export function mapApiFieldErrors(error: unknown): { fieldErrors: ApiFieldErrorMap; message: string } {
  const source = error && typeof error === 'object' ? error as Record<string, any> : {};
  const payload = source.response?.data || source.data || source.body || source;
  const candidates = payload.fieldErrors || payload.errors || payload.violations || {};
  const fieldErrors: ApiFieldErrorMap = {};

  if (Array.isArray(candidates)) {
    for (const item of candidates) {
      const key = String(item?.field || item?.property || item?.path || '');
      const field = FIELD_ALIASES[key] || key;
      const message = messageOf(item);
      if (field && message) fieldErrors[field] = message;
    }
  } else if (candidates && typeof candidates === 'object') {
    for (const [key, value] of Object.entries(candidates)) {
      const field = FIELD_ALIASES[key] || key;
      const message = messageOf(value);
      if (field && message) fieldErrors[field] = message;
    }
  }

  return {
    fieldErrors,
    message: messageOf(payload) || messageOf(source) || '操作失败，请检查当前步骤输入后重试'
  };
}

export function reportWizardApiError(error: unknown) {
  const detail = mapApiFieldErrors(error);
  window.dispatchEvent(new CustomEvent('genealogy:wizard-api-error', { detail }));
  return detail;
}
