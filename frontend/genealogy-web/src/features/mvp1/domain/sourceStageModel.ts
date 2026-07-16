import type { SourceLike, SourceLinkLike } from '../services/sourceService';
import { isOfficial, isReviewable } from './status';

export type SourceStageState = {
  selectedSource?: SourceLike;
  bindingOpen: boolean;
  stageOneStatus: 'empty' | 'draft' | 'reviewing' | 'official' | 'rejected';
  stageTwoReason: string;
};

export function deriveSourceStageState(sources: SourceLike[], selectedSourceId?: string): SourceStageState {
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

export function appendSourceBinding(links: SourceLinkLike[], created: SourceLinkLike) {
  const key = (link: SourceLinkLike) => String(link.id || `${link.sourceId}-${link.targetType}-${link.targetId}`);
  return [created, ...links.filter(link => key(link) !== key(created))];
}
