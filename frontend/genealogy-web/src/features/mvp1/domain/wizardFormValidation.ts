import type { Mvp1StepKey } from './wizardStepState';

export type WizardFieldValues = Record<string, string | boolean | undefined>;
export type WizardFieldErrors = Record<string, string>;

export const WIZARD_FIELD_ALIASES: Record<string, string> = {
  '宗族名称': 'clanName',
  '姓氏': 'surname',
  '适用宗族': 'clanId',
  '支派名称': 'branchName',
  '字辈方案名称': 'schemeName',
  '方案名称': 'schemeName',
  '代次': 'generationNo',
  '字辈': 'generationWord',
  '所属支派': 'branchId',
  '姓名': 'personName',
  '性别': 'gender',
  '出生日期': 'birthDate',
  '逝世日期': 'deathDate',
  '是否在世': 'isLiving',
  '中心人物': 'centerPersonId',
  '关系类型': 'relationType',
  '亲属': 'relativePersonId',
  '选择规则': 'selectionRule',
  '来源名称': 'sourceName',
  '来源类型': 'sourceType'
};

const REQUIRED_FIELDS: Partial<Record<Mvp1StepKey, Array<[string, string]>>> = {
  clan: [['clanName', '请填写宗族名称'], ['surname', '请填写姓氏']],
  branch: [['clanId', '请选择宗族'], ['branchName', '请填写支派名称']],
  generation: [['schemeName', '请填写方案名称'], ['generationNo', '请填写有效代次'], ['generationWord', '请填写字辈']],
  person: [['clanId', '请选择宗族'], ['branchId', '请选择已审核通过的所属支派'], ['personName', '请填写人物姓名'], ['gender', '请选择性别']],
  relationship: [['centerPersonId', '请选择中心人物'], ['relationType', '请选择关系类型'], ['relativePersonId', '请选择亲属']],
  source: [['sourceName', '请填写来源名称'], ['sourceType', '请选择来源类型']]
};

function normalizeLabel(value: string) {
  return value.replace(/[：:*＊]/g, '').replace(/\s+/g, ' ').trim();
}

export function wizardFieldName(label: string) {
  const normalized = normalizeLabel(label);
  return WIZARD_FIELD_ALIASES[normalized] || normalized;
}

function valueOf(values: WizardFieldValues, semanticName: string) {
  if (values[semanticName] !== undefined) return values[semanticName];
  const label = Object.entries(WIZARD_FIELD_ALIASES).find(([, name]) => name === semanticName)?.[0];
  return label ? values[label] : undefined;
}

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
    if (!text(valueOf(values, field))) errors[field] = message;
  }

  if (step === 'person') {
    const birth = dateTime(valueOf(values, 'birthDate'));
    const death = dateTime(valueOf(values, 'deathDate'));
    if (birth !== undefined && death !== undefined && birth > death) {
      errors.deathDate = '逝世日期不能早于出生日期';
    }
    const living = text(valueOf(values, 'isLiving'));
    if ((living === '在世' || living === 'true') && death !== undefined) {
      errors.isLiving = '人物标记为在世时不能填写逝世日期';
      errors.deathDate = '请清空逝世日期，或将是否在世调整为已故/未知';
    }
  }

  if (step === 'relationship') {
    const center = text(valueOf(values, 'centerPersonId'));
    const relative = text(valueOf(values, 'relativePersonId'));
    if (center && relative && center === relative) errors.relativePersonId = '中心人物和亲属不能是同一人物';
    const rule = text(valueOf(values, 'selectionRule'));
    if (rule.includes('需维护代次')) errors.centerPersonId = '中心人物需维护代次后才能建立关系';
  }

  return errors;
}

export function mapWizardServerFieldErrors(errors: WizardFieldErrors | undefined) {
  const mapped: WizardFieldErrors = {};
  for (const [field, message] of Object.entries(errors || {})) {
    mapped[wizardFieldName(field)] = message;
  }
  return mapped;
}

export function firstWizardFieldError(errors: WizardFieldErrors) {
  const entry = Object.entries(errors)[0];
  return entry ? { field: entry[0], message: entry[1] } : undefined;
}

export function mergeWizardFieldErrors(...groups: Array<WizardFieldErrors | undefined>) {
  return Object.assign({}, ...groups.filter(Boolean).map(mapWizardServerFieldErrors));
}
