import type { HomeDashboardResponse } from '../../shared/api/generated/home-types';

export type HomeCultureEntry = {
  type: 'compatibility' | 'culture_item' | 'migration_event' | 'culture_site' | string;
  category: string;
  title: string;
  subtitle: string;
  status: string;
  sourceCount: number;
  targetTab: 'items' | 'migrations' | 'sites';
  targetQueryKey?: string;
  targetQueryValue?: string;
};

export function displayHomeValue(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function isPublicCultureEntry(entry: HomeCultureEntry) {
  const status = String(entry.status || '').trim().toLowerCase();
  return ['official', 'active', 'approved'].includes(status) || entry.type === 'compatibility';
}

export function homeCategoryText(category: string) {
  const labels: Record<string, string> = {
    surname_origin: '姓氏源流', hall_name: '堂号', commandery: '郡望', family_instruction: '家训',
    ancestor_instruction: '祖训', clan_rule: '族规', genealogy_preface: '谱序', genealogy_rule: '凡例',
    person_story: '人物故事', custom_tradition: '民俗传统', ancestral_hall: '祠堂', ancestral_home: '祖居',
    cemetery: '墓园', memorial: '纪念设施', migration: '迁徙事件', other: '其他'
  };
  return labels[category] || category || '宗族文化';
}

export function homePercent(value: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return Math.min(100, Math.round(value * 10000 / denominator) / 100);
}

export function buildHomeDashboardModel(dashboard: HomeDashboardResponse | null, entries: HomeCultureEntry[]) {
  const generationBuckets = (dashboard?.generationDistribution || []).filter(item => item.count > 0);
  return {
    generationBuckets,
    generationCount: generationBuckets.length,
    branches: (dashboard?.branchDistribution || []).filter(item => item.count > 0).slice(0, 5),
    latestEntries: entries.filter(entry => entry.type !== 'compatibility').slice(0, 5),
    timelineEntries: entries.filter(entry => entry.type === 'migration_event' || ['migration', 'genealogy_preface', 'genealogy_rule', 'ancestral_hall', 'ancestral_home'].includes(entry.category)).slice(0, 6),
    memoryEntries: entries.filter(entry => entry.type === 'culture_site' || ['person_story', 'genealogy_preface', 'ancestral_hall', 'ancestral_home', 'memorial'].includes(entry.category)).slice(0, 6),
    featuredCulture: entries.filter(entry => entry.type !== 'compatibility').slice(0, 4)
  };
}
