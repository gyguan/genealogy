import type { Mvp1StepKey } from './wizardStepState';

export type SummaryStatus = 'unmaintained' | 'draft' | 'reviewing' | 'approved' | 'rejected' | 'invalid';
export type SummaryObject = { id?: string | number; dataStatus?: unknown; status?: unknown; verificationStatus?: unknown; invalid?: boolean };
export type SummaryCounts = Record<SummaryStatus, number> & { total: number };
export type SummarySectionKey = 'clan' | 'branch' | 'generation' | 'person' | 'relationship' | 'source';
export type SummarySection = { key: SummarySectionKey; title: string; step: Mvp1StepKey; counts: SummaryCounts; error?: string; detailCount?: number };
export type SummaryBlocker = { key: string; step: Mvp1StepKey; title: string; reason: string };

const emptyCounts = (): SummaryCounts => ({ total: 0, unmaintained: 0, draft: 0, reviewing: 0, approved: 0, rejected: 0, invalid: 0 });

export function summaryStatusOf(row: SummaryObject): SummaryStatus {
  if (row.invalid) return 'invalid';
  const raw = String(row.dataStatus || row.status || row.verificationStatus || '').toLowerCase();
  if (['official', 'active', 'approved', 'passed', 'completed'].includes(raw) || !raw) return 'approved';
  if (raw.includes('reject')) return 'rejected';
  if (raw.includes('pending') || raw.includes('review') || raw.includes('submit')) return 'reviewing';
  return 'draft';
}

export function countSummaryStatuses(rows: SummaryObject[]): SummaryCounts {
  const counts = emptyCounts();
  counts.total = rows.length;
  if (!rows.length) counts.unmaintained = 1;
  rows.forEach(row => { counts[summaryStatusOf(row)] += 1; });
  return counts;
}

export function buildWizardSummary(input: {
  clanSelected: boolean;
  branches: SummaryObject[];
  schemes: SummaryObject[];
  generationItemCount: number;
  persons: SummaryObject[];
  relationships: SummaryObject[];
  sources: SummaryObject[];
  sourceLinkCount: number;
  errors?: Partial<Record<SummarySectionKey, string>>;
}) {
  const sections: SummarySection[] = [
    { key: 'clan', title: '宗族', step: 'clan', counts: input.clanSelected ? { ...emptyCounts(), total: 1, approved: 1 } : countSummaryStatuses([]), error: input.errors?.clan },
    { key: 'branch', title: '支派', step: 'branch', counts: countSummaryStatuses(input.branches), error: input.errors?.branch },
    { key: 'generation', title: '字辈方案及明细', step: 'generation', counts: countSummaryStatuses(input.schemes), detailCount: input.generationItemCount, error: input.errors?.generation },
    { key: 'person', title: '人物', step: 'person', counts: countSummaryStatuses(input.persons), error: input.errors?.person },
    { key: 'relationship', title: '关系', step: 'relationship', counts: countSummaryStatuses(input.relationships), error: input.errors?.relationship },
    { key: 'source', title: '来源及绑定', step: 'source', counts: countSummaryStatuses(input.sources), detailCount: input.sourceLinkCount, error: input.errors?.source }
  ];
  const blockers: SummaryBlocker[] = [];
  sections.forEach(section => {
    if (section.error) blockers.push({ key: `${section.key}-error`, step: section.step, title: `${section.title}加载失败`, reason: section.error });
    if (section.counts.unmaintained) blockers.push({ key: `${section.key}-empty`, step: section.step, title: `${section.title}尚未维护`, reason: `请返回${section.title}步骤补充数据。` });
    if (section.counts.draft) blockers.push({ key: `${section.key}-draft`, step: section.step, title: `${section.title}存在草稿`, reason: `仍有 ${section.counts.draft} 条草稿需要提交审核。` });
    if (section.counts.reviewing) blockers.push({ key: `${section.key}-reviewing`, step: section.step, title: `${section.title}正在审核`, reason: `仍有 ${section.counts.reviewing} 条对象审核中，不能视为完成。` });
    if (section.counts.rejected) blockers.push({ key: `${section.key}-rejected`, step: section.step, title: `${section.title}存在驳回`, reason: `仍有 ${section.counts.rejected} 条对象需要修正。` });
    if (section.counts.invalid) blockers.push({ key: `${section.key}-invalid`, step: section.step, title: `${section.title}需重新确认`, reason: `仍有 ${section.counts.invalid} 条上下文失效对象。` });
  });
  if (input.schemes.length && input.generationItemCount === 0) blockers.push({ key: 'generation-items', step: 'generation', title: '字辈明细为空', reason: '字辈方案至少需要一条有效明细。' });
  if (input.sources.length && input.sourceLinkCount === 0) blockers.push({ key: 'source-links', step: 'source', title: '来源尚未绑定对象', reason: '请为正式来源绑定至少一个对象，或在来源步骤明确跳过。' });
  return { sections, blockers, complete: blockers.length === 0 };
}
