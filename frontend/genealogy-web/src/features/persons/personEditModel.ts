export type PersonDatePrecision = 'unknown' | 'year' | 'month' | 'day';

export type PersonEditForm = {
  branchId: string;
  name: string;
  genealogyName: string;
  courtesyName: string;
  aliasName: string;
  gender: string;
  generationNo: string;
  generationWord: string;
  rankInFamily: string;
  birthDate: string;
  birthDatePrecision: PersonDatePrecision;
  deathDate: string;
  deathDatePrecision: PersonDatePrecision;
  isLiving: '' | 'true' | 'false';
  birthPlace: string;
  residencePlace: string;
  occupation: string;
  education: string;
  titleOrHonor: string;
  biography: string;
  tombPlace: string;
  epitaph: string;
  hasDescendant: '' | 'true' | 'false';
  lineageStatus: string;
  privacyLevel: string;
};

export const personDatePrecisionOptions = [
  { value: 'unknown', label: '不详' },
  { value: 'year', label: '年' },
  { value: 'month', label: '月' },
  { value: 'day', label: '日' }
];

export const personTriStateOptions = [
  { value: '', label: '未知' },
  { value: 'true', label: '是' },
  { value: 'false', label: '否' }
];

export const personLivingOptions = [
  { value: '', label: '未知' },
  { value: 'true', label: '在世' },
  { value: 'false', label: '已故' }
];

export const personGenderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' }
];

export const personPrivacyOptions = [
  { value: 'public', label: '公开' },
  { value: 'clan_only', label: '宗族内可见' },
  { value: 'branch_only', label: '支派内可见' },
  { value: 'relatives_only', label: '亲属可见' },
  { value: 'private', label: '私密' },
  { value: 'sealed', label: '封存' }
];

export const personLineageStatusOptions = [
  { value: 'normal', label: '正常' },
  { value: 'adopted_in', label: '继入' },
  { value: 'adopted_out', label: '出嗣' },
  { value: 'unknown', label: '待考' }
];

function asString(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function nullableString(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function nullableNumber(value: unknown) {
  const text = String(value ?? '').trim();
  return text ? Number(text) : null;
}

export function toTriStateFormValue(value: unknown): '' | 'true' | 'false' {
  if (value === true || value === 'true') return 'true';
  if (value === false || value === 'false') return 'false';
  return '';
}

export function toNullableBoolean(value: unknown): boolean | null {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

export function normalizePersonDatePrecision(value: unknown, dateValue?: unknown): PersonDatePrecision {
  const precision = String(value || '').toLowerCase();
  if (precision === 'unknown' || precision === 'year' || precision === 'month' || precision === 'day') return precision;
  const date = String(dateValue || '').trim();
  if (/^\d{4}$/.test(date)) return 'year';
  if (/^\d{4}-\d{2}$/.test(date)) return 'month';
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return 'day';
  return 'unknown';
}

export function normalizePersonDate(value: unknown, precision: PersonDatePrecision): string | null {
  if (precision === 'unknown') return null;
  const text = String(value ?? '').trim();
  const matched = text.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!matched) return null;
  if (precision === 'year') return matched[1];
  if (precision === 'month') return matched[2] ? `${matched[1]}-${matched[2]}` : null;
  return matched[2] && matched[3] ? `${matched[1]}-${matched[2]}-${matched[3]}` : null;
}

export function toPersonEditForm(person: any): PersonEditForm {
  const birthDatePrecision = normalizePersonDatePrecision(person.birthDatePrecision, person.birthDate);
  const deathDatePrecision = normalizePersonDatePrecision(person.deathDatePrecision, person.deathDate);
  return {
    branchId: asString(person.branchId || person.branch?.id),
    name: asString(person.name || person.personName),
    genealogyName: asString(person.genealogyName),
    courtesyName: asString(person.courtesyName),
    aliasName: asString(person.aliasName),
    gender: asString(person.gender || 'unknown'),
    generationNo: asString(person.generationNo),
    generationWord: asString(person.generationWord),
    rankInFamily: asString(person.rankInFamily),
    birthDate: normalizePersonDate(person.birthDate, birthDatePrecision) || '',
    birthDatePrecision,
    deathDate: normalizePersonDate(person.deathDate, deathDatePrecision) || '',
    deathDatePrecision,
    isLiving: toTriStateFormValue(person.isLiving),
    birthPlace: asString(person.birthPlace),
    residencePlace: asString(person.residencePlace),
    occupation: asString(person.occupation),
    education: asString(person.education),
    titleOrHonor: asString(person.titleOrHonor),
    biography: asString(person.biography),
    tombPlace: asString(person.tombPlace),
    epitaph: asString(person.epitaph),
    hasDescendant: toTriStateFormValue(person.hasDescendant),
    lineageStatus: asString(person.lineageStatus || 'normal'),
    privacyLevel: asString(person.privacyLevel || 'clan_only')
  };
}

export function toPersonUpdatePayload(form: PersonEditForm) {
  return {
    branchId: nullableNumber(form.branchId),
    name: String(form.name ?? '').trim(),
    genealogyName: nullableString(form.genealogyName),
    courtesyName: nullableString(form.courtesyName),
    aliasName: nullableString(form.aliasName),
    gender: nullableString(form.gender) || 'unknown',
    generationNo: nullableNumber(form.generationNo),
    generationWord: nullableString(form.generationWord),
    rankInFamily: nullableString(form.rankInFamily),
    birthDate: normalizePersonDate(form.birthDate, form.birthDatePrecision),
    birthDatePrecision: form.birthDatePrecision,
    deathDate: normalizePersonDate(form.deathDate, form.deathDatePrecision),
    deathDatePrecision: form.deathDatePrecision,
    isLiving: toNullableBoolean(form.isLiving),
    birthPlace: nullableString(form.birthPlace),
    residencePlace: nullableString(form.residencePlace),
    occupation: nullableString(form.occupation),
    education: nullableString(form.education),
    titleOrHonor: nullableString(form.titleOrHonor),
    biography: nullableString(form.biography),
    tombPlace: nullableString(form.tombPlace),
    epitaph: nullableString(form.epitaph),
    hasDescendant: toNullableBoolean(form.hasDescendant),
    lineageStatus: nullableString(form.lineageStatus),
    privacyLevel: nullableString(form.privacyLevel)
  };
}

export function personStatusText(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  const labels: Record<string, string> = {
    draft: '草稿', pending: '待审核', pending_review: '待审核', official: '正式', active: '正式',
    approved: '已通过', rejected: '已驳回', archived: '已归档'
  };
  return labels[status] || (status ? '未知状态' : '未设置状态');
}

export function personStatusColor(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (['official', 'active', 'approved'].includes(status)) return 'success';
  if (['pending', 'pending_review'].includes(status)) return 'processing';
  if (status === 'rejected') return 'error';
  return 'default';
}
