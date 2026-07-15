import type { CultureDataStatus } from '../../shared/api/generated/culture-types';

export type MigrationSearchState = {
  keyword: string;
  branchId?: number;
  fromLocation: string;
  toLocation: string;
  migrationTimeText: string;
  dataStatus?: CultureDataStatus;
  sort: string;
  pageNo: number;
  pageSize: number;
};

export const defaultMigrationSearch: MigrationSearchState = {
  keyword: '',
  fromLocation: '',
  toLocation: '',
  migrationTimeText: '',
  sort: 'sequenceNo,asc',
  pageNo: 1,
  pageSize: 10
};

const statuses: CultureDataStatus[] = ['draft', 'pending_review', 'official', 'rejected', 'archived'];
const sorts = ['sequenceNo,asc', 'updatedAt,desc', 'migrationTimeText,asc'];
const keys = [
  'migrationKeyword', 'migrationBranch', 'migrationFrom', 'migrationTo', 'migrationTime',
  'migrationStatus', 'migrationSort', 'migrationPage', 'migrationPageSize', 'migrationItem'
];

function positive(value: string | null, fallback?: number) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return parsed > 0 ? parsed : fallback;
}

function valid<T extends string>(values: readonly T[], value: string | null) {
  return values.includes(value as T) ? value as T : undefined;
}

function text(value: string | null, maxLength: number) {
  return String(value || '').trim().slice(0, maxLength);
}

export function readMigrationLocation(href = window.location.href) {
  const url = new URL(href, 'https://genealogy.local');
  const pageSize = positive(url.searchParams.get('migrationPageSize'), defaultMigrationSearch.pageSize) || defaultMigrationSearch.pageSize;
  return {
    search: {
      keyword: text(url.searchParams.get('migrationKeyword'), 100),
      branchId: positive(url.searchParams.get('migrationBranch')),
      fromLocation: text(url.searchParams.get('migrationFrom'), 200),
      toLocation: text(url.searchParams.get('migrationTo'), 200),
      migrationTimeText: text(url.searchParams.get('migrationTime'), 100),
      dataStatus: valid(statuses, url.searchParams.get('migrationStatus')),
      sort: valid(sorts, url.searchParams.get('migrationSort')) || defaultMigrationSearch.sort,
      pageNo: positive(url.searchParams.get('migrationPage'), 1) || 1,
      pageSize: [10, 20, 50].includes(pageSize) ? pageSize : defaultMigrationSearch.pageSize
    } satisfies MigrationSearchState,
    selectedId: positive(url.searchParams.get('migrationItem'))
  };
}

export function buildMigrationLocation(href: string, search: MigrationSearchState, selectedId?: number) {
  const url = new URL(href, 'https://genealogy.local');
  keys.forEach(key => url.searchParams.delete(key));
  if (search.keyword.trim()) url.searchParams.set('migrationKeyword', search.keyword.trim());
  if (search.branchId) url.searchParams.set('migrationBranch', String(search.branchId));
  if (search.fromLocation.trim()) url.searchParams.set('migrationFrom', search.fromLocation.trim());
  if (search.toLocation.trim()) url.searchParams.set('migrationTo', search.toLocation.trim());
  if (search.migrationTimeText.trim()) url.searchParams.set('migrationTime', search.migrationTimeText.trim());
  if (search.dataStatus) url.searchParams.set('migrationStatus', search.dataStatus);
  if (search.sort !== defaultMigrationSearch.sort) url.searchParams.set('migrationSort', search.sort);
  if (search.pageNo > 1) url.searchParams.set('migrationPage', String(search.pageNo));
  if (search.pageSize !== defaultMigrationSearch.pageSize) url.searchParams.set('migrationPageSize', String(search.pageSize));
  if (selectedId) url.searchParams.set('migrationItem', String(selectedId));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function migrationSearchKey(clanId: string, search: MigrationSearchState) {
  return JSON.stringify([
    clanId,
    search.keyword.trim(),
    search.branchId || '',
    search.fromLocation.trim(),
    search.toLocation.trim(),
    search.migrationTimeText.trim(),
    search.dataStatus || '',
    search.sort,
    search.pageNo,
    search.pageSize
  ]);
}
