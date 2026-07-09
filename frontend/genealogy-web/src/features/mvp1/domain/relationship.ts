export type RelationshipMode = 'father' | 'mother' | 'spouse' | 'child';

export type RelationshipPersonLike = {
  id?: number | string;
  name?: string;
  gender?: string;
  generationNo?: number | string;
  generationWord?: string;
};

export type RelationshipLike = {
  id?: number | string;
  fromPersonId?: number | string;
  fromPersonName?: string;
  fromName?: string;
  toPersonId?: number | string;
  toPersonName?: string;
  toName?: string;
  relationType?: string;
  relationLabel?: string;
};

export type RelationshipCreatePayload = {
  fromPersonId: number;
  toPersonId: number;
  relationType: 'spouse' | 'parent_child';
  relationLabel: string;
  isLineageRelation: boolean;
  isBiological: boolean;
  isPrimary: boolean;
  confidenceLevel: 'high';
};

export const RELATIONSHIP_MODE_LABEL: Record<RelationshipMode, string> = {
  father: '父亲',
  mother: '母亲',
  spouse: '配偶',
  child: '子女'
};

export function genderText(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (text === 'male') return '男';
  if (text === 'female') return '女';
  return '未知';
}

export function personLabel(person: RelationshipPersonLike) {
  const generation = person.generationNo ? `第${person.generationNo}世` : '未维护代次';
  const word = person.generationWord ? `${person.generationWord}字辈` : '无字辈';
  return `${person.name || `人物#${person.id}`}（${generation} · ${word} · ${genderText(person.gender)}）`;
}

export function expectedGenerationNo(center: RelationshipPersonLike | undefined, mode: RelationshipMode) {
  const centerNo = Number(center?.generationNo);
  if (!Number.isFinite(centerNo) || centerNo <= 0) return null;
  const expected = mode === 'child' ? centerNo + 1 : mode === 'spouse' ? centerNo : centerNo - 1;
  return expected > 0 ? expected : null;
}

export function relationshipRuleText(mode: RelationshipMode) {
  if (mode === 'father') return '父亲必须是中心人物上一代男性';
  if (mode === 'mother') return '母亲必须是中心人物上一代女性';
  if (mode === 'spouse') return '配偶必须是中心人物同一代女性';
  return '子女必须是中心人物下一代';
}

export function isRelationshipCandidate(center: RelationshipPersonLike | undefined, candidate: RelationshipPersonLike, mode: RelationshipMode) {
  if (!center?.id || !candidate?.id || String(center.id) === String(candidate.id)) return false;
  const expectedNo = expectedGenerationNo(center, mode);
  if (!expectedNo) return false;
  if (Number(candidate.generationNo) !== expectedNo) return false;
  const gender = String(candidate.gender || '').toLowerCase();
  if (mode === 'father') return gender === 'male';
  if (mode === 'mother') return gender === 'female';
  if (mode === 'spouse') return gender === 'female';
  return true;
}

export function buildRelationshipBody(center: RelationshipPersonLike, relative: RelationshipPersonLike, mode: RelationshipMode): RelationshipCreatePayload {
  if (mode === 'spouse') {
    return {
      fromPersonId: Number(center.id),
      toPersonId: Number(relative.id),
      relationType: 'spouse',
      relationLabel: 'spouse',
      isLineageRelation: false,
      isBiological: false,
      isPrimary: true,
      confidenceLevel: 'high'
    };
  }
  if (mode === 'child') {
    return {
      fromPersonId: Number(center.id),
      toPersonId: Number(relative.id),
      relationType: 'parent_child',
      relationLabel: String(center.gender || '').toLowerCase() === 'female' ? 'mother' : 'father',
      isLineageRelation: true,
      isBiological: true,
      isPrimary: true,
      confidenceLevel: 'high'
    };
  }
  return {
    fromPersonId: Number(relative.id),
    toPersonId: Number(center.id),
    relationType: 'parent_child',
    relationLabel: mode,
    isLineageRelation: true,
    isBiological: true,
    isPrimary: true,
    confidenceLevel: 'high'
  };
}

export function relationshipName(row: RelationshipLike) {
  const fromName = row.fromPersonName || row.fromName || `人物#${row.fromPersonId || '-'}`;
  const toName = row.toPersonName || row.toName || `人物#${row.toPersonId || '-'}`;
  return `${fromName} → ${toName}`;
}

export function relativeName(row: RelationshipLike, centerPersonId: string) {
  const centerIsFrom = String(row.fromPersonId) === String(centerPersonId);
  if (centerIsFrom) return row.toPersonName || row.toName || `人物#${row.toPersonId || '-'}`;
  return row.fromPersonName || row.fromName || `人物#${row.fromPersonId || '-'}`;
}

export function relationTypeText(row: RelationshipLike, centerPersonId?: string) {
  const label = String(row.relationLabel || row.relationType || '').toLowerCase();
  if (label === 'spouse' || row.relationType === 'spouse') return '配偶';
  if (centerPersonId && String(row.fromPersonId) === String(centerPersonId)) return '子女';
  if (label === 'father') return '父亲';
  if (label === 'mother') return '母亲';
  return centerPersonId ? '亲属' : row.relationLabel || row.relationType || '关系';
}
