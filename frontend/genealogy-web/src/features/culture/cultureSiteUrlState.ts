import type { CultureDataStatus, CultureSiteType } from '../../shared/api/generated/culture-types';

export type CultureSiteTabSearchState = {
  keyword: string;
  siteType?: CultureSiteType[];
  branchId?: number[];
  addressText: string;
  currentStatus: string;
  dataStatus?: CultureDataStatus[];
  sort: string;
  pageNo: number;
  pageSize: number;
};

export const defaultCultureSiteSearch: CultureSiteTabSearchState = {
  keyword: '',
  addressText: '',
  currentStatus: '',
  sort: 'sortOrder,asc',
  pageNo: 1,
  pageSize: 10
};

const siteTypes: CultureSiteType[] = ['ancestral_hall', 'ancestral_home', 'cemetery', 'memorial', 'other'];
const statuses: CultureDataStatus[] = ['draft', 'pending_review', 'official', 'rejected', 'archived'];
const sorts = ['sortOrder,asc', 'updatedAt,desc'];
const keys = [
  'siteKeyword', 'siteType', 'siteBranch', 'siteAddress', 'siteCurrentStatus',
  'siteStatus', 'siteSort', 'sitePage', 'sitePageSize', 'siteItem'
];

function positive(value: string | null, fallback?: number) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return parsed > 0 ? parsed : fallback;
}

function positives(values: string[]) {
  const result = [...new Set(values.map(value => positive(value)).filter((value): value is number => Boolean(value)))];
  return result.length ? result : undefined;
}

function valid<T extends string>(values: readonly T[], value: string | null) {
  return values.includes(value as T) ? value as T : undefined;
}

function valids<T extends string>(allowed: readonly T[], values: string[]) {
  const result = [...new Set(values.map(value => valid(allowed, value)).filter((value): value is T => Boolean(value)))];
  return result.length ? result : undefined;
}

function text(value: string | null, maxLength: number) {
  return String(value || '').trim().slice(0, maxLength);
}

function appendAll(params: URLSearchParams, key: string, values?: Array<string | number>) {
  values?.forEach(value => params.append(key, String(value)));
}

export function readCultureSiteLocation(href = window.location.href) {
  const url = new URL(href, 'https://genealogy.local');
  const pageSize = positive(url.searchParams.get('sitePageSize'), defaultCultureSiteSearch.pageSize) || defaultCultureSiteSearch.pageSize;
  return {
    search: {
      keyword: text(url.searchParams.get('siteKeyword'), 100),
      siteType: valids(siteTypes, url.searchParams.getAll('siteType')),
      branchId: positives(url.searchParams.getAll('siteBranch')),
      addressText: text(url.searchParams.get('siteAddress'), 200),
      currentStatus: text(url.searchParams.get('siteCurrentStatus'), 100),
      dataStatus: valids(statuses, url.searchParams.getAll('siteStatus')),
      sort: valid(sorts, url.searchParams.get('siteSort')) || defaultCultureSiteSearch.sort,
      pageNo: positive(url.searchParams.get('sitePage'), 1) || 1,
      pageSize: [10, 20, 50].includes(pageSize) ? pageSize : defaultCultureSiteSearch.pageSize
    } satisfies CultureSiteTabSearchState,
    selectedId: positive(url.searchParams.get('siteItem'))
  };
}

export function buildCultureSiteLocation(href: string, search: CultureSiteTabSearchState, selectedId?: number) {
  const url = new URL(href, 'https://genealogy.local');
  keys.forEach(key => url.searchParams.delete(key));
  if (search.keyword.trim()) url.searchParams.set('siteKeyword', search.keyword.trim());
  appendAll(url.searchParams, 'siteType', search.siteType);
  appendAll(url.searchParams, 'siteBranch', search.branchId);
  if (search.addressText.trim()) url.searchParams.set('siteAddress', search.addressText.trim());
  if (search.currentStatus.trim()) url.searchParams.set('siteCurrentStatus', search.currentStatus.trim());
  appendAll(url.searchParams, 'siteStatus', search.dataStatus);
  if (search.sort !== defaultCultureSiteSearch.sort) url.searchParams.set('siteSort', search.sort);
  if (search.pageNo > 1) url.searchParams.set('sitePage', String(search.pageNo));
  if (search.pageSize !== defaultCultureSiteSearch.pageSize) url.searchParams.set('sitePageSize', String(search.pageSize));
  if (selectedId) url.searchParams.set('siteItem', String(selectedId));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function cultureSiteSearchKey(clanId: string, search: CultureSiteTabSearchState) {
  return JSON.stringify([
    clanId,
    search.keyword.trim(),
    search.siteType || [],
    search.branchId || [],
    search.addressText.trim(),
    search.currentStatus.trim(),
    search.dataStatus || [],
    search.sort,
    search.pageNo,
    search.pageSize
  ]);
}
