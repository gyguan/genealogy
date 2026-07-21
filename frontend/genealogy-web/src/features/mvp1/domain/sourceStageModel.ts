import { isOfficial, isReviewable } from './status';

export const SOURCE_BINDING_PAGE_SIZE = 10;

export type SourceStageSource = {
  id?: number | string;
  sourceName?: string;
  name?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

export type SourceStageLink = {
  id?: number | string;
  sourceId?: number | string;
  targetType?: string;
  targetId?: number | string;
};

export type SourceStageState = {
  selectedSource?: SourceStageSource;
  bindingOpen: boolean;
  stageOneStatus: 'empty' | 'draft' | 'reviewing' | 'official' | 'rejected';
  stageTwoReason: string;
};

export type SourceBindingPage<T> = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  rows: T[];
};

export function deriveSourceStageState(sources: SourceStageSource[], selectedSourceId?: string): SourceStageState {
  const selectedSource = sources.find(source => String(source.id || '') === String(selectedSourceId || ''));
  if (!selectedSource) {
    return {
      selectedSource: undefined,
      bindingOpen: false,
      stageOneStatus: 'empty',
      stageTwoReason: '请先创建来源，或从来源列表选择一条已审核通过的来源。'
    };
  }
  if (isOfficial(selectedSource)) {
    return { selectedSource, bindingOpen: true, stageOneStatus: 'official', stageTwoReason: '' };
  }
  const raw = String(selectedSource.dataStatus || selectedSource.status || selectedSource.verificationStatus || '').toLowerCase();
  const rejected = raw.includes('reject');
  const reviewing = raw.includes('review') || raw.includes('pending') || raw.includes('submit');
  return {
    selectedSource,
    bindingOpen: false,
    stageOneStatus: rejected ? 'rejected' : reviewing ? 'reviewing' : isReviewable(selectedSource) ? 'draft' : 'draft',
    stageTwoReason: rejected
      ? '当前来源已被驳回，请修正并重新提交审核。'
      : reviewing
        ? '当前来源正在审核，审核通过后才能绑定对象。'
        : '当前来源仍是草稿，请先提交审核并等待通过。'
  };
}

export function resetSourceBindingSelection(previousSourceId: string, nextSourceId: string) {
  return previousSourceId === nextSourceId ? undefined : { targetType: 'person' as const, targetId: '' };
}

export function appendSourceBinding(links: SourceStageLink[], created: SourceStageLink) {
  const key = (link: SourceStageLink) => String(link.id || `${link.sourceId}-${link.targetType}-${link.targetId}`);
  return [created, ...links.filter(link => key(link) !== key(created))];
}

export function paginateSourceBindings<T>(rows: T[], requestedPage: number, pageSize = SOURCE_BINDING_PAGE_SIZE): SourceBindingPage<T> {
  const normalizedPageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : SOURCE_BINDING_PAGE_SIZE;
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / normalizedPageSize));
  const normalizedPage = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const page = Math.min(normalizedPage, pageCount);
  const start = (page - 1) * normalizedPageSize;

  return {
    page,
    pageSize: normalizedPageSize,
    pageCount,
    total,
    rows: rows.slice(start, start + normalizedPageSize)
  };
}
