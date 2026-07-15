import type { CultureCategory, CultureDataStatus, CulturePrivacyLevel } from '../../shared/api/generated/culture-types';

export type CultureSearchState = {
  keyword: string;
  category?: CultureCategory;
  branchId?: number;
  dataStatus?: CultureDataStatus;
  privacyLevel?: CulturePrivacyLevel;
  hasSource?: boolean;
  featuredOnHome?: boolean;
  sort: string;
  pageNo: number;
  pageSize: number;
};

export const defaultCultureSearch: CultureSearchState = {
  keyword: '', sort: 'updatedAt,desc', pageNo: 1, pageSize: 10
};

const categories: CultureCategory[] = [
  'surname_origin', 'hall_name', 'commandery', 'family_instruction', 'ancestor_instruction',
  'clan_rule', 'genealogy_preface', 'genealogy_rule', 'person_story', 'custom_tradition', 'other'
];
const statuses: CultureDataStatus[] = ['draft', 'pending_review', 'official', 'rejected', 'archived'];
const privacyLevels: CulturePrivacyLevel[] = ['public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed'];
const sorts = ['updatedAt,desc', 'createdAt,desc', 'title,asc', 'category,asc', 'sortOrder,asc'];
const keys = [
  'cultureKeyword', 'cultureCategory', 'cultureBranch', 'cultureStatus', 'culturePrivacy',
  'cultureHasSource', 'cultureFeatured', 'cultureSort', 'culturePage', 'culturePageSize', 'cultureItem'
];

function positive(value: string | null, fallback?: number) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return parsed > 0 ? parsed : fallback;
}

function bool(value: string | null) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function valid<T extends string>(values: readonly T[], value: string | null) {
  return values.includes(value as T) ? value as T : undefined;
}

export function readCultureLocation(href = window.location.href) {
  const url = new URL(href, 'https://genealogy.local');
  const pageSize = positive(url.searchParams.get('culturePageSize'), 10) || 10;
  return {
    search: {
      keyword: String(url.searchParams.get('cultureKeyword') || '').trim().slice(0, 100),
      category: valid(categories, url.searchParams.get('cultureCategory')),
      branchId: positive(url.searchParams.get('cultureBranch')),
      dataStatus: valid(statuses, url.searchParams.get('cultureStatus')),
      privacyLevel: valid(privacyLevels, url.searchParams.get('culturePrivacy')),
      hasSource: bool(url.searchParams.get('cultureHasSource')),
      featuredOnHome: bool(url.searchParams.get('cultureFeatured')),
      sort: valid(sorts, url.searchParams.get('cultureSort')) || defaultCultureSearch.sort,
      pageNo: positive(url.searchParams.get('culturePage'), 1) || 1,
      pageSize: [10, 20, 50].includes(pageSize) ? pageSize : 10
    } satisfies CultureSearchState,
    selectedItemId: positive(url.searchParams.get('cultureItem'))
  };
}

export function buildCultureLocation(href: string, search: CultureSearchState, selectedItemId?: number) {
  const url = new URL(href, 'https://genealogy.local');
  keys.forEach(key => url.searchParams.delete(key));
  const keyword = search.keyword.trim();
  if (keyword) url.searchParams.set('cultureKeyword', keyword);
  if (search.category) url.searchParams.set('cultureCategory', search.category);
  if (search.branchId) url.searchParams.set('cultureBranch', String(search.branchId));
  if (search.dataStatus) url.searchParams.set('cultureStatus', search.dataStatus);
  if (search.privacyLevel) url.searchParams.set('culturePrivacy', search.privacyLevel);
  if (typeof search.hasSource === 'boolean') url.searchParams.set('cultureHasSource', String(search.hasSource));
  if (typeof search.featuredOnHome === 'boolean') url.searchParams.set('cultureFeatured', String(search.featuredOnHome));
  if (search.sort !== defaultCultureSearch.sort) url.searchParams.set('cultureSort', search.sort);
  if (search.pageNo > 1) url.searchParams.set('culturePage', String(search.pageNo));
  if (search.pageSize !== defaultCultureSearch.pageSize) url.searchParams.set('culturePageSize', String(search.pageSize));
  if (selectedItemId) url.searchParams.set('cultureItem', String(selectedItemId));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function cultureSearchKey(clanId: string, search: CultureSearchState) {
  return JSON.stringify([clanId, search.keyword.trim(), search.category || '', search.branchId || '',
    search.dataStatus || '', search.privacyLevel || '', search.hasSource ?? '', search.featuredOnHome ?? '',
    search.sort, search.pageNo, search.pageSize]);
}
