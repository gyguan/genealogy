import { relationshipName, type RelationshipLike } from './relationship';
import { isReviewable, statusText, type StatusLike } from './status';

export type ReviewTargetType = 'persons' | 'relationships' | 'sources' | 'branches' | 'generation-schemes';

export type ReviewTaskLike = {
  id?: number | string;
  title?: string;
  targetType?: string;
  targetId?: number | string;
};

export type ReviewTargetOption = {
  value: string;
  label: string;
};

type ReviewPersonLike = StatusLike & {
  id?: number | string;
  name?: string;
};

type ReviewSourceLike = StatusLike & {
  id?: number | string;
  sourceName?: string;
};

type ReviewBranchLike = StatusLike & {
  id?: number | string;
  branchName?: string;
};

type ReviewGenerationSchemeLike = StatusLike & {
  id?: number | string;
  schemeName?: string;
};

export type ReviewTargetOptionData = {
  persons: ReviewPersonLike[];
  relationships: (RelationshipLike & StatusLike)[];
  sources: ReviewSourceLike[];
  branches: ReviewBranchLike[];
  schemes: ReviewGenerationSchemeLike[];
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

export function buildReviewTargetOptions(type: ReviewTargetType, data: ReviewTargetOptionData): ReviewTargetOption[] {
  if (type === 'persons') {
    return data.persons
      .filter(isReviewable)
      .map(item => ({ value: String(item.id), label: `${item.name || '未命名人物'} · ${statusText(item)}` }));
  }
  if (type === 'relationships') {
    return data.relationships
      .filter(isReviewable)
      .map(item => ({ value: String(item.id), label: `${relationshipName(item)} · ${statusText(item)}` }));
  }
  if (type === 'sources') {
    return data.sources
      .filter(isReviewable)
      .map(item => ({ value: String(item.id), label: `${item.sourceName || '未命名来源'} · ${statusText(item)}` }));
  }
  if (type === 'branches') {
    return data.branches
      .filter(isReviewable)
      .map(item => ({ value: String(item.id), label: `${item.branchName || '未命名支派'} · ${statusText(item)}` }));
  }
  if (type === 'generation-schemes') {
    return data.schemes
      .filter(isReviewable)
      .map(item => ({ value: String(item.id), label: `${item.schemeName || '未命名字辈方案'} · ${statusText(item)}` }));
  }
  return [];
}

export function reviewTaskTitle(row: ReviewTaskLike) {
  const title = String(row.title || '').trim();
  if (title && !/#\d+/.test(title)) return title;
  return `${reviewTargetTypeText(row.targetType)}审核任务`;
}

export function createdAtText(value?: string) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-';
}
