export type PersonEvent = {
  id: number | string;
  eventType?: string;
  eventTitle?: string;
  eventDate?: string;
  eventDatePrecision?: string;
  eventPlace?: string;
  eventDescription?: string;
  sourceType?: string;
  sourceName?: string;
  sourceTitle?: string;
};

export function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function personName(person: any) {
  return display(person?.name || person?.personName || person?.displayName || person?.fullName, '未命名人物');
}

export function personStatus(person: any) {
  return person?.dataStatus || person?.status || person?.verificationStatus || person?.reviewStatus || '';
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

export function privacyText(value: unknown) {
  const labels: Record<string, string> = {
    public: '公开', clan_only: '宗族内可见', branch_only: '支派内可见', relatives_only: '亲属可见', private: '私密', sealed: '封存'
  };
  return labels[String(value || '')] || display(value);
}

export function genderText(value: unknown) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'male') return '男';
  if (normalized === 'female') return '女';
  if (normalized === 'unknown') return '未知';
  return display(value);
}

export function livingText(value: unknown) {
  if (value === true) return '在世';
  if (value === false) return '已故';
  return '未知';
}

export function boolText(value: unknown) {
  if (value === true) return '是';
  if (value === false) return '否';
  return '未知';
}

export function dateByPrecision(value: unknown, precision: unknown) {
  const text = String(value ?? '').trim();
  const declared = String(precision || '').toLowerCase();
  if (!text || declared === 'unknown') return '';
  const matched = text.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!matched) return '';
  if (declared === 'year') return `${matched[1]}年`;
  if (declared === 'month') return matched[2] ? `${matched[1]}年${matched[2]}月` : `${matched[1]}年`;
  if (declared === 'day') {
    if (matched[2] && matched[3]) return `${matched[1]}年${matched[2]}月${matched[3]}日`;
    if (matched[2]) return `${matched[1]}年${matched[2]}月`;
    return `${matched[1]}年`;
  }
  if (matched[2] && matched[3]) return `${matched[1]}年${matched[2]}月${matched[3]}日`;
  if (matched[2]) return `${matched[1]}年${matched[2]}月`;
  return `${matched[1]}年`;
}

export function lifeText(person: any) {
  const birth = dateByPrecision(person?.birthDate, person?.birthDatePrecision);
  const death = dateByPrecision(person?.deathDate, person?.deathDatePrecision);
  if (!birth && !death) return '-';
  return `${birth || '?'} - ${death || (person?.isLiving === true ? '今' : '?')}`;
}

export function generationText(person: any) {
  const generationNo = person?.generationNo || person?.generation || person?.generationNumber;
  return generationNo ? `第${generationNo}世` : '-';
}

export function branchText(person: any) {
  return display(person?.branchName || person?.branch?.branchName || person?.branch?.name, '支派待维护');
}

export function updatedText(person: any) {
  const value = person?.updatedAt || person?.modifiedAt || person?.lastModifiedAt || person?.updateTime;
  if (!value) return '-';
  const text = String(value).replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '');
  return text || '-';
}

export function eventTypeText(type?: string) {
  const labels: Record<string, string> = {
    birth: '出生', education: '教育', career: '职业', migration: '迁徙', marriage: '婚配', child_birth: '子女', death: '逝世', burial: '墓葬'
  };
  return labels[type || ''] || type || '事件';
}

export function eventDateText(event: PersonEvent) {
  return dateByPrecision(event.eventDate, event.eventDatePrecision) || '时间未详';
}

export function relationshipName(row: any, side: 'from' | 'to') {
  if (side === 'from') return row.fromPersonName || row.fromName || row.sourcePersonName || row.personName || '起点人物待维护';
  return row.toPersonName || row.toName || row.targetPersonName || row.relativeName || '关联人物待维护';
}

export function relationshipTypeText(value: unknown) {
  const type = String(value || '').trim().toLowerCase();
  const labels: Record<string, string> = {
    father: '父亲', mother: '母亲', parent: '父母', son: '儿子', daughter: '女儿', child: '子女', spouse: '配偶', husband: '丈夫', wife: '妻子', adopted_in: '继入', adopted_out: '出嗣'
  };
  return labels[type] || display(value, '关系待维护');
}

export function sourceTitle(row: any) {
  return row.sourceName || row.sourceTitle || row.title || row.fileName || row.materialName || '来源资料待维护';
}

export function sourceTypeText(value: unknown) {
  const type = String(value || '').trim().toLowerCase();
  const labels: Record<string, string> = {
    genealogy_book: '族谱文献', oral: '口述材料', archive: '档案材料', tombstone: '碑刻墓志', image: '图片资料', file: '附件资料'
  };
  return labels[type] || display(value, '来源类型待维护');
}

function numericPercent(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export function completenessOf(person: any, relationshipCount: number, sourceCount: number, eventCount: number) {
  const backendValue = numericPercent(person?.completeness)
    ?? numericPercent(person?.completenessRate)
    ?? numericPercent(person?.profileCompleteness)
    ?? numericPercent(person?.dataCompleteness);
  if (backendValue !== null) return backendValue;
  const fields = [
    person?.name, person?.genealogyName, person?.courtesyName, person?.gender, person?.branchId, person?.generationNo,
    person?.generationWord, person?.rankInFamily, person?.birthDate, person?.deathDate, person?.birthPlace,
    person?.residencePlace, person?.biography, person?.tombPlace, person?.epitaph, person?.privacyLevel,
    relationshipCount, sourceCount, eventCount
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
