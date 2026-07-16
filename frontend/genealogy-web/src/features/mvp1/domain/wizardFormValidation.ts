import type { Mvp1StepKey } from './wizardStepState';

export type WizardFieldValues = Record<string, string | boolean | undefined>;
export type WizardFieldErrors = Record<string, string>;

const REQUIRED_FIELDS: Partial<Record<Mvp1StepKey, Array<[string, string]>>> = {
  clan: [['宗族名称', '请填写宗族名称'], ['姓氏', '请填写姓氏']],
  branch: [['适用宗族', '请选择宗族'], ['支派名称', '请填写支派名称']],
  generation: [['方案名称', '请填写方案名称'], ['代次', '请填写有效代次'], ['字辈', '请填写字辈']],
  person: [['适用宗族', '请选择宗族'], ['所属支派', '请选择已审核通过的所属支派'], ['姓名', '请填写人物姓名'], ['性别', '请选择性别']],
  relationship: [['中心人物', '请选择中心人物'], ['关系类型', '请选择关系类型'], ['亲属', '请选择亲属']],
  source: [['来源名称', '请填写来源名称'], ['来源类型', '请选择来源类型']],
  review: [['对象类型', '请选择对象类型'], ['可提交对象', '请选择可提交对象']]
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : value === true ? 'true' : '';
}

function dateTime(value: unknown) {
  const valueText = text(value);
  if (!valueText) return undefined;
  const parsed = Date.parse(valueText);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function validateWizardStep(step: Mvp1StepKey, values: WizardFieldValues): WizardFieldErrors {
  const errors: WizardFieldErrors = {};
  for (const [field, message] of REQUIRED_FIELDS[step] || []) {
    if (!text(values[field])) errors[field] = message;
  }

  if (step === 'person') {
    const birth = dateTime(values['出生日期']);
    const death = dateTime(values['逝世日期']);
    if (birth !== undefined && death !== undefined && birth > death) {
      errors['逝世日期'] = '逝世日期不能早于出生日期';
    }
    const living = text(values['是否在世']);
    if ((living === '在世' || living === 'true') && death !== undefined) {
      errors['是否在世'] = '人物标记为在世时不能填写逝世日期';
      errors['逝世日期'] = '请清空逝世日期，或将是否在世调整为已故/未知';
    }
  }

  if (step === 'relationship') {
    const center = text(values['中心人物']);
    const relative = text(values['亲属']);
    if (center && relative && center === relative) errors['亲属'] = '中心人物和亲属不能是同一人物';
    const rule = text(values['选择规则']);
    if (rule.includes('需维护代次')) errors['中心人物'] = '中心人物需维护代次后才能建立关系';
  }

  return errors;
}

export function firstWizardFieldError(errors: WizardFieldErrors) {
  const entry = Object.entries(errors)[0];
  return entry ? { field: entry[0], message: entry[1] } : undefined;
}

export function mergeWizardFieldErrors(...groups: Array<WizardFieldErrors | undefined>) {
  return Object.assign({}, ...groups.filter(Boolean));
}
