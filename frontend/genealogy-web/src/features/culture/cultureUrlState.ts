import type { CultureCategory, CultureDataStatus, CulturePrivacyLevel } from '../../shared/api/generated/culture-types';

export type CultureSearchState = {
  keyword: string;
  category?: CultureCategory[];
  branchId?: number[];
  dataStatus?: CultureDataStatus[];
  privacyLevel?: CulturePrivacyLevel[];
  hasSource?: boolean[];
  featuredOnHome?: boolean[];
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

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function positiveMany(values: string[]) {
  const parsed = unique(values.map(value => positive(value)).filter((value): value is number => Boolean(value)));
  return parsed.length ? parsed : undefined;
}

function boolMany(values: string[]) {
  const parsed = unique(values.filter(value => value === 'true' || value === 'false').map(value => value === 'true'));
  return parsed.length ? parsed : undefined;
}

function valid<T extends string>(options: readonly T[], value: string | null) {
  return options.includes(value as T) ? value as T : undefined;
}

function validMany<T extends string>(options: readonly T[], values: string[]) {
  const parsed = unique(values.map(value => valid(options, value)).filter((value): value is T => Boolean(value)));
  return parsed.length ? parsed : undefined;
}

export function readCultureLocation(href = window.location.href) {
  const url = new URL(href, 'https://genealogy.local');
  const pageSize = positive(url.searchParams.get('culturePageSize'), 10) || 10;
  return {
    search: {
      keyword: String(url.searchParams.get('cultureKeyword') || '').trim().slice(0, 100),
      category: validMany(categories, url.searchParams.getAll('cultureCategory')),
      branchId: positiveMany(url.searchParams.getAll('cultureBranch')),
      dataStatus: validMany(statuses, url.searchParams.getAll('cultureStatus')),
      privacyLevel: validMany(privacyLevels, url.searchParams.getAll('culturePrivacy')),
      hasSource: boolMany(url.searchParams.getAll('cultureHasSource')),
      featuredOnHome: boolMany(url.searchParams.getAll('cultureFeatured')),
      sort: valid(sorts, url.searchParams.get('cultureSort')) || defaultCultureSearch.sort,
      pageNo: positive(url.searchParams.get('culturePage'), 1) || 1,
      pageSize: [10, 20, 50].includes(pageSize) ? pageSize : 10
    } satisfies CultureSearchState,
    selectedItemId: positive(url.searchParams.get('cultureItem'))
  };
}

function appendMany(params: URLSearchParams, key: string, values?: Array<string | number | boolean>) {
  values?.forEach(value => params.append(key, String(value)));
}

export function buildCultureLocation(href: string, search: CultureSearchState, selectedItemId?: number) {
  const url = new URL(href, 'https://genealogy.local');
  keys.forEach(key => url.searchParams.delete(key));
  const keyword = search.keyword.trim();
  if (keyword) url.searchParams.set('cultureKeyword', keyword);
  appendMany(url.searchParams, 'cultureCategory', search.category);
  appendMany(url.searchParams, 'cultureBranch', search.branchId);
  appendMany(url.searchParams, 'cultureStatus', search.dataStatus);
  appendMany(url.searchParams, 'culturePrivacy', search.privacyLevel);
  appendMany(url.searchParams, 'cultureHasSource', search.hasSource);
  appendMany(url.searchParams, 'cultureFeatured', search.featuredOnHome);
  if (search.sort !== defaultCultureSearch.sort) url.searchParams.set('cultureSort', search.sort);
  if (search.pageNo > 1) url.searchParams.set('culturePage', String(search.pageNo));
  if (search.pageSize !== defaultCultureSearch.pageSize) url.searchParams.set('culturePageSize', String(search.pageSize));
  if (selectedItemId) url.searchParams.set('cultureItem', String(selectedItemId));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildCultureQueryString(search: CultureSearchState) {
  const params = new URLSearchParams();
  if (search.keyword.trim()) params.set('keyword', search.keyword.trim());
  appendMany(params, 'category', search.category);
  appendMany(params, 'branchId', search.branchId);
  appendMany(params, 'dataStatus', search.dataStatus);
  appendMany(params, 'privacyLevel', search.privacyLevel);
  appendMany(params, 'hasSource', search.hasSource);
  appendMany(params, 'featuredOnHome', search.featuredOnHome);
  params.set('sort', search.sort);
  params.set('pageNo', String(search.pageNo));
  params.set('pageSize', String(search.pageSize));
  return params.toString();
}

function stable<T extends string | number | boolean>(values?: T[]) {
  return values ? [...values].sort((left, right) => String(left).localeCompare(String(right))) : [];
}

export function cultureSearchKey(clanId: string, search: CultureSearchState) {
  return JSON.stringify([clanId, search.keyword.trim(), stable(search.category), stable(search.branchId),
    stable(search.dataStatus), stable(search.privacyLevel), stable(search.hasSource), stable(search.featuredOnHome),
    search.sort, search.pageNo, search.pageSize]);
}
