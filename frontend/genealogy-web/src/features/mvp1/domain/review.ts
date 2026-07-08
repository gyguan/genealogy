export type ReviewTargetType = 'persons' | 'relationships' | 'sources' | 'branches' | 'generation-schemes';

export type ReviewTaskLike = {
  id?: number | string;
  title?: string;
  targetType?: string;
  targetId?: number | string;
};

export function reviewTargetTypeText(value?: string) {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  const dict: Record<string, string> = {
    person: '人物',
    persons: '人物',
    relationship: '关系',
    relationships: '关系',
    source: '来源',
    sources: '来源',
    branch: '支派',
    branches: '支派',
    generation_scheme: '字辈方案',
    generation_schemes: '字辈方案'
  };
  return dict[normalized] || value || '-';
}

export function toApiReviewTargetType(type: ReviewTargetType) {
  const dict: Record<ReviewTargetType, string> = {
    persons: 'person',
    relationships: 'relationship',
    sources: 'source',
    branches: 'branch',
    'generation-schemes': 'generation_scheme'
  };
  return dict[type];
}

export function reviewTaskTitle(row: ReviewTaskLike) {
  if (row.title) return row.title;
  return `${reviewTargetTypeText(row.targetType)} #${row.targetId || '-'}`;
}

export function createdAtText(value?: string) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-';
}
