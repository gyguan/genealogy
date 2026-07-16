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
  birthDatePrecision: string;
  deathDate: string;
  deathDatePrecision: string;
  isLiving: string;
  birthPlace: string;
  residencePlace: string;
  occupation: string;
  education: string;
  titleOrHonor: string;
  biography: string;
  tombPlace: string;
  epitaph: string;
  hasDescendant: string;
  lineageStatus: string;
  privacyLevel: string;
  dataStatus: string;
};

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

export const personDataStatusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待审核' },
  { value: 'official', label: '正式' },
  { value: 'rejected', label: '已驳回' },
  { value: 'archived', label: '已归档' }
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

function asDate(value: unknown) {
  return asString(value).slice(0, 10);
}

function nullableString(value: string) {
  return value.trim() ? value.trim() : null;
}

function nullableNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

function nullableBoolean(value: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

export function toPersonEditForm(person: any): PersonEditForm {
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
    birthDate: asDate(person.birthDate),
    birthDatePrecision: asString(person.birthDatePrecision || 'day'),
    deathDate: asDate(person.deathDate),
    deathDatePrecision: asString(person.deathDatePrecision || 'day'),
    isLiving: person.isLiving === false ? 'false' : 'true',
    birthPlace: asString(person.birthPlace),
    residencePlace: asString(person.residencePlace),
    occupation: asString(person.occupation),
    education: asString(person.education),
    titleOrHonor: asString(person.titleOrHonor),
    biography: asString(person.biography),
    tombPlace: asString(person.tombPlace),
    epitaph: asString(person.epitaph),
    hasDescendant: person.hasDescendant === false ? 'false' : person.hasDescendant === true ? 'true' : '',
    lineageStatus: asString(person.lineageStatus || 'normal'),
    privacyLevel: asString(person.privacyLevel || 'clan_only'),
    dataStatus: asString(person.dataStatus || 'draft')
  };
}

export function toPersonUpdatePayload(form: PersonEditForm) {
  return {
    branchId: nullableNumber(form.branchId),
    name: form.name.trim(),
    genealogyName: nullableString(form.genealogyName),
    courtesyName: nullableString(form.courtesyName),
    aliasName: nullableString(form.aliasName),
    gender: nullableString(form.gender) || 'unknown',
    generationNo: nullableNumber(form.generationNo),
    generationWord: nullableString(form.generationWord),
    rankInFamily: nullableString(form.rankInFamily),
    birthDate: nullableString(form.birthDate),
    birthDatePrecision: nullableString(form.birthDatePrecision),
    deathDate: nullableString(form.deathDate),
    deathDatePrecision: nullableString(form.deathDatePrecision),
    isLiving: nullableBoolean(form.isLiving),
    birthPlace: nullableString(form.birthPlace),
    residencePlace: nullableString(form.residencePlace),
    occupation: nullableString(form.occupation),
    education: nullableString(form.education),
    titleOrHonor: nullableString(form.titleOrHonor),
    biography: nullableString(form.biography),
    tombPlace: nullableString(form.tombPlace),
    epitaph: nullableString(form.epitaph),
    hasDescendant: nullableBoolean(form.hasDescendant),
    lineageStatus: nullableString(form.lineageStatus),
    privacyLevel: nullableString(form.privacyLevel),
    dataStatus: nullableString(form.dataStatus)
  };
}

export function personStatusText(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  const labels: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    pending_review: '待审核',
    official: '正式',
    active: '正式',
    approved: '已通过',
    rejected: '已驳回',
    archived: '已归档'
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
