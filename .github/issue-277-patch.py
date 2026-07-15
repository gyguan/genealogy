from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(content, encoding="utf-8")


def replace_exact(path: str, old: str, new: str) -> None:
    text = read(path)
    if old not in text:
        raise SystemExit(f"expected block not found in {path}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


# Frontend: migration tab and request serialization.
replace_exact(
    "frontend/genealogy-web/src/features/culture/MigrationEventTab.tsx",
    """type SearchFormValues = {
  keyword?: string;
  branchId?: number;
  fromLocation?: string;
  toLocation?: string;
  migrationTimeText?: string;
  dataStatus?: CultureDataStatus;
  sort?: string;
};""",
    """type SearchFormValues = {
  keyword?: string;
  branchId?: number[];
  fromLocation?: string;
  toLocation?: string;
  migrationTimeText?: string;
  dataStatus?: CultureDataStatus[];
  sort?: string;
};""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/MigrationEventTab.tsx",
    """const migrationSortOptions = [
  { value: 'sequenceNo,asc', label: '迁徙顺序' },
  { value: 'updatedAt,desc', label: '最近更新' },
  { value: 'migrationTimeText,asc', label: '历史时期' }
];""",
    """const migrationSortOptions = [
  { value: 'sequenceNo,asc', label: '迁徙顺序' },
  { value: 'updatedAt,desc', label: '最近更新' },
  { value: 'migrationTimeText,asc', label: '历史时期' }
];
const multiSelectProps = {
  mode: 'multiple' as const,
  allowClear: true,
  maxTagCount: 'responsive' as const
};""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/MigrationEventTab.tsx",
    """          <Col xs={24} md={8} xl={4}><Form.Item name="branchId" label="支派"><Select allowClear showSearch optionFilterProp="label" options={branchOptions} /></Form.Item></Col>""",
    """          <Col xs={24} md={8} xl={4}><Form.Item name="branchId" label="支派"><Select {...multiSelectProps} placeholder="可多选" showSearch optionFilterProp="label" options={branchOptions} /></Form.Item></Col>""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/MigrationEventTab.tsx",
    """          <Col xs={24} md={8} xl={3}><Form.Item name="dataStatus" label="状态"><Select allowClear options={statusOptions} /></Form.Item></Col>""",
    """          <Col xs={24} md={8} xl={3}><Form.Item name="dataStatus" label="状态"><Select {...multiSelectProps} placeholder="可多选" options={statusOptions} /></Form.Item></Col>""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/migrationEventService.ts",
    """  branchId?: number;""",
    """  branchId?: number[];""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/migrationEventService.ts",
    """  dataStatus?: CultureDataStatus | string;""",
    """  dataStatus?: CultureDataStatus[];""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/migrationEventService.ts",
    """function queryString(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  return params.toString();
}""",
    """function queryString(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach(item => params.append(key, String(item)));
      return;
    }
    params.set(key, String(value));
  });
  return params.toString();
}""",
)

write(
    "frontend/genealogy-web/src/features/culture/migrationEventUrlState.ts",
    r"""import type { CultureDataStatus } from '../../shared/api/generated/culture-types';

export type MigrationSearchState = {
  keyword: string;
  branchId?: number[];
  fromLocation: string;
  toLocation: string;
  migrationTimeText: string;
  dataStatus?: CultureDataStatus[];
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

export function readMigrationLocation(href = window.location.href) {
  const url = new URL(href, 'https://genealogy.local');
  const pageSize = positive(url.searchParams.get('migrationPageSize'), defaultMigrationSearch.pageSize) || defaultMigrationSearch.pageSize;
  return {
    search: {
      keyword: text(url.searchParams.get('migrationKeyword'), 100),
      branchId: positives(url.searchParams.getAll('migrationBranch')),
      fromLocation: text(url.searchParams.get('migrationFrom'), 200),
      toLocation: text(url.searchParams.get('migrationTo'), 200),
      migrationTimeText: text(url.searchParams.get('migrationTime'), 100),
      dataStatus: valids(statuses, url.searchParams.getAll('migrationStatus')),
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
  appendAll(url.searchParams, 'migrationBranch', search.branchId);
  if (search.fromLocation.trim()) url.searchParams.set('migrationFrom', search.fromLocation.trim());
  if (search.toLocation.trim()) url.searchParams.set('migrationTo', search.toLocation.trim());
  if (search.migrationTimeText.trim()) url.searchParams.set('migrationTime', search.migrationTimeText.trim());
  appendAll(url.searchParams, 'migrationStatus', search.dataStatus);
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
    search.branchId || [],
    search.fromLocation.trim(),
    search.toLocation.trim(),
    search.migrationTimeText.trim(),
    search.dataStatus || [],
    search.sort,
    search.pageNo,
    search.pageSize
  ]);
}
""",
)

write(
    "frontend/genealogy-web/src/features/culture/migrationEventUrlState.test.mjs",
    r"""import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.culture-shell-test/features/culture/migrationEventUrlState.js');
const { buildMigrationLocation, defaultMigrationSearch, readMigrationLocation } = await import(pathToFileURL(modulePath).href);

test('reads migration multi-select filters, paging and detail location', () => {
  const location = readMigrationLocation('https://example.test/?view=culture&tab=migrations&migrationKeyword=%E5%8D%97%E8%BF%81&migrationBranch=8&migrationBranch=9&migrationFrom=%E6%B1%9F%E8%A5%BF&migrationTo=%E5%B9%BF%E4%B8%9C&migrationTime=%E6%98%8E%E4%BB%A3&migrationStatus=official&migrationStatus=draft&migrationSort=updatedAt%2Cdesc&migrationPage=3&migrationPageSize=20&migrationItem=91');
  assert.deepEqual(location, {
    search: {
      keyword: '南迁',
      branchId: [8, 9],
      fromLocation: '江西',
      toLocation: '广东',
      migrationTimeText: '明代',
      dataStatus: ['official', 'draft'],
      sort: 'updatedAt,desc',
      pageNo: 3,
      pageSize: 20
    },
    selectedId: 91
  });
});

test('keeps old single-value links compatible and normalizes invalid values', () => {
  const legacy = readMigrationLocation('https://example.test/?migrationBranch=8&migrationStatus=official');
  assert.deepEqual(legacy.search.branchId, [8]);
  assert.deepEqual(legacy.search.dataStatus, ['official']);

  const invalid = readMigrationLocation('https://example.test/?view=culture&tab=migrations&migrationBranch=0&migrationStatus=invalid&migrationPage=0&migrationPageSize=200');
  assert.equal(invalid.search.keyword, defaultMigrationSearch.keyword);
  assert.equal(invalid.search.branchId, undefined);
  assert.equal(invalid.search.dataStatus, undefined);
  assert.equal(invalid.search.pageNo, 1);
  assert.equal(invalid.search.pageSize, 10);
  assert.equal(invalid.search.sort, defaultMigrationSearch.sort);
});

test('writes repeated migration parameters and preserves sibling tab state', () => {
  const next = buildMigrationLocation('https://example.test/?view=culture&tab=migrations&culturePage=2&sitePage=5', {
    ...defaultMigrationSearch,
    keyword: '迁粤',
    branchId: [12, 13],
    dataStatus: ['official', 'draft'],
    pageNo: 4
  }, 27);
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'culture');
  assert.equal(url.searchParams.get('tab'), 'migrations');
  assert.equal(url.searchParams.get('culturePage'), '2');
  assert.equal(url.searchParams.get('sitePage'), '5');
  assert.equal(url.searchParams.get('migrationKeyword'), '迁粤');
  assert.deepEqual(url.searchParams.getAll('migrationBranch'), ['12', '13']);
  assert.deepEqual(url.searchParams.getAll('migrationStatus'), ['official', 'draft']);
  assert.equal(url.searchParams.get('migrationPage'), '4');
  assert.equal(url.searchParams.get('migrationItem'), '27');
});
""",
)

# Frontend: culture-site tab and request serialization.
replace_exact(
    "frontend/genealogy-web/src/features/culture/CultureSiteTab.tsx",
    """type SearchFormValues = {
  keyword?: string;
  siteType?: CultureSiteType;
  branchId?: number;
  addressText?: string;
  currentStatus?: string;
  dataStatus?: CultureDataStatus;
  sort?: string;
};""",
    """type SearchFormValues = {
  keyword?: string;
  siteType?: CultureSiteType[];
  branchId?: number[];
  addressText?: string;
  currentStatus?: string;
  dataStatus?: CultureDataStatus[];
  sort?: string;
};""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/CultureSiteTab.tsx",
    """const sortOptions = [
  { value: 'sortOrder,asc', label: '业务顺序' },
  { value: 'updatedAt,desc', label: '最近更新' }
];""",
    """const sortOptions = [
  { value: 'sortOrder,asc', label: '业务顺序' },
  { value: 'updatedAt,desc', label: '最近更新' }
];
const multiSelectProps = {
  mode: 'multiple' as const,
  allowClear: true,
  maxTagCount: 'responsive' as const
};""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/CultureSiteTab.tsx",
    """          <Col xs={24} md={8} xl={3}><Form.Item name="siteType" label="场所类型"><Select allowClear options={siteTypes} /></Form.Item></Col>""",
    """          <Col xs={24} md={8} xl={3}><Form.Item name="siteType" label="场所类型"><Select {...multiSelectProps} placeholder="可多选" options={siteTypes} /></Form.Item></Col>""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/CultureSiteTab.tsx",
    """          <Col xs={24} md={8} xl={4}><Form.Item name="branchId" label="所属支派"><Select allowClear showSearch optionFilterProp="label" options={branchOptions} /></Form.Item></Col>""",
    """          <Col xs={24} md={8} xl={4}><Form.Item name="branchId" label="所属支派"><Select {...multiSelectProps} placeholder="可多选" showSearch optionFilterProp="label" options={branchOptions} /></Form.Item></Col>""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/CultureSiteTab.tsx",
    """          <Col xs={24} md={8} xl={3}><Form.Item name="dataStatus" label="数据状态"><Select allowClear options={statusOptions} /></Form.Item></Col>""",
    """          <Col xs={24} md={8} xl={3}><Form.Item name="dataStatus" label="数据状态"><Select {...multiSelectProps} placeholder="可多选" options={statusOptions} /></Form.Item></Col>""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/cultureSiteService.ts",
    """  siteType?: string;
  branchId?: number;""",
    """  siteType?: string[];
  branchId?: number[];""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/cultureSiteService.ts",
    """  dataStatus?: string;""",
    """  dataStatus?: string[];""",
)
replace_exact(
    "frontend/genealogy-web/src/features/culture/cultureSiteService.ts",
    """function queryString(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  return params.toString();
}""",
    """function queryString(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach(item => params.append(key, String(item)));
      return;
    }
    params.set(key, String(value));
  });
  return params.toString();
}""",
)

write(
    "frontend/genealogy-web/src/features/culture/cultureSiteUrlState.ts",
    r"""import type { CultureDataStatus, CultureSiteType } from '../../shared/api/generated/culture-types';

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
""",
)

write(
    "frontend/genealogy-web/src/features/culture/cultureSiteUrlState.test.mjs",
    r"""import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.culture-shell-test/features/culture/cultureSiteUrlState.js');
const {
  buildCultureSiteLocation,
  cultureSiteSearchKey,
  defaultCultureSiteSearch,
  readCultureSiteLocation
} = await import(pathToFileURL(modulePath).href);

test('reads valid culture site multi-select filters and rejects invalid values', () => {
  const result = readCultureSiteLocation('https://example.test/?view=culture&tab=sites&siteKeyword=%20祠堂%20&siteType=ancestral_hall&siteType=ancestral_home&siteBranch=12&siteBranch=13&siteAddress=杭州&siteCurrentStatus=存续&siteStatus=official&siteStatus=draft&siteSort=updatedAt,desc&sitePage=3&sitePageSize=20&siteItem=99');
  assert.deepEqual(result, {
    search: {
      keyword: '祠堂',
      siteType: ['ancestral_hall', 'ancestral_home'],
      branchId: [12, 13],
      addressText: '杭州',
      currentStatus: '存续',
      dataStatus: ['official', 'draft'],
      sort: 'updatedAt,desc',
      pageNo: 3,
      pageSize: 20
    },
    selectedId: 99
  });

  const invalid = readCultureSiteLocation('https://example.test/?tab=sites&siteType=invalid&siteBranch=0&siteStatus=bad&sitePage=-2&sitePageSize=999');
  assert.equal(invalid.search.keyword, defaultCultureSiteSearch.keyword);
  assert.equal(invalid.search.siteType, undefined);
  assert.equal(invalid.search.branchId, undefined);
  assert.equal(invalid.search.addressText, defaultCultureSiteSearch.addressText);
  assert.equal(invalid.search.currentStatus, defaultCultureSiteSearch.currentStatus);
  assert.equal(invalid.search.dataStatus, undefined);
  assert.equal(invalid.search.sort, defaultCultureSiteSearch.sort);
  assert.equal(invalid.search.pageNo, defaultCultureSiteSearch.pageNo);
  assert.equal(invalid.search.pageSize, defaultCultureSiteSearch.pageSize);
  assert.equal(invalid.selectedId, undefined);
});

test('keeps old single-value culture site links compatible', () => {
  const result = readCultureSiteLocation('https://example.test/?siteType=ancestral_hall&siteBranch=8&siteStatus=official');
  assert.deepEqual(result.search.siteType, ['ancestral_hall']);
  assert.deepEqual(result.search.branchId, [8]);
  assert.deepEqual(result.search.dataStatus, ['official']);
});

test('writes repeated site parameters without removing other tab state', () => {
  const href = buildCultureSiteLocation('https://example.test/?view=culture&tab=sites&cultureKeyword=家训&migrationKeyword=南迁', {
    keyword: '祠堂',
    siteType: ['ancestral_hall', 'ancestral_home'],
    branchId: [8, 9],
    addressText: '宁波',
    currentStatus: '重建',
    dataStatus: ['official', 'draft'],
    sort: 'updatedAt,desc',
    pageNo: 2,
    pageSize: 20
  }, 66);
  const url = new URL(href, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'culture');
  assert.equal(url.searchParams.get('tab'), 'sites');
  assert.equal(url.searchParams.get('cultureKeyword'), '家训');
  assert.equal(url.searchParams.get('migrationKeyword'), '南迁');
  assert.equal(url.searchParams.get('siteKeyword'), '祠堂');
  assert.deepEqual(url.searchParams.getAll('siteType'), ['ancestral_hall', 'ancestral_home']);
  assert.deepEqual(url.searchParams.getAll('siteBranch'), ['8', '9']);
  assert.deepEqual(url.searchParams.getAll('siteStatus'), ['official', 'draft']);
  assert.equal(url.searchParams.get('siteItem'), '66');
});

test('site search key changes with clan and multi-select filters', () => {
  const first = cultureSiteSearchKey('1', defaultCultureSiteSearch);
  const second = cultureSiteSearchKey('2', defaultCultureSiteSearch);
  const third = cultureSiteSearchKey('1', { ...defaultCultureSiteSearch, branchId: [8, 9] });
  assert.notEqual(first, second);
  assert.notEqual(first, third);
});
""",
)

# Backend criteria DTOs retain old single-value constructors for compatibility.
write(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/dto/MigrationEventSearchCriteria.java",
    r"""package com.genealogy.culture.dto;

import java.util.List;
import java.util.Objects;

public final class MigrationEventSearchCriteria {

    private final String keyword;
    private final List<Long> branchIds;
    private final String fromLocation;
    private final String toLocation;
    private final String migrationTimeText;
    private final Long founderPersonId;
    private final List<String> dataStatuses;
    private final String privacyLevel;
    private final String sort;

    public MigrationEventSearchCriteria(
            String keyword,
            Long branchId,
            String fromLocation,
            String toLocation,
            String migrationTimeText,
            Long founderPersonId,
            String dataStatus,
            String privacyLevel,
            String sort
    ) {
        this(keyword, single(branchId), fromLocation, toLocation, migrationTimeText, founderPersonId,
                single(dataStatus), privacyLevel, sort);
    }

    private MigrationEventSearchCriteria(
            String keyword,
            List<Long> branchIds,
            String fromLocation,
            String toLocation,
            String migrationTimeText,
            Long founderPersonId,
            List<String> dataStatuses,
            String privacyLevel,
            String sort
    ) {
        this.keyword = keyword;
        this.branchIds = copy(branchIds);
        this.fromLocation = fromLocation;
        this.toLocation = toLocation;
        this.migrationTimeText = migrationTimeText;
        this.founderPersonId = founderPersonId;
        this.dataStatuses = copy(dataStatuses);
        this.privacyLevel = privacyLevel;
        this.sort = sort;
    }

    public static MigrationEventSearchCriteria multi(
            String keyword,
            List<Long> branchIds,
            String fromLocation,
            String toLocation,
            String migrationTimeText,
            Long founderPersonId,
            List<String> dataStatuses,
            String privacyLevel,
            String sort
    ) {
        return new MigrationEventSearchCriteria(keyword, branchIds, fromLocation, toLocation, migrationTimeText,
                founderPersonId, dataStatuses, privacyLevel, sort);
    }

    private static <T> List<T> single(T value) {
        return value == null ? List.of() : List.of(value);
    }

    private static <T> List<T> copy(List<T> values) {
        return values == null ? List.of() : values.stream().filter(Objects::nonNull).toList();
    }

    public String keyword() { return keyword; }
    public List<Long> branchIds() { return branchIds; }
    public String fromLocation() { return fromLocation; }
    public String toLocation() { return toLocation; }
    public String migrationTimeText() { return migrationTimeText; }
    public Long founderPersonId() { return founderPersonId; }
    public List<String> dataStatuses() { return dataStatuses; }
    public String privacyLevel() { return privacyLevel; }
    public String sort() { return sort; }

    public Long branchId() { return branchIds.isEmpty() ? null : branchIds.get(0); }
    public String dataStatus() { return dataStatuses.isEmpty() ? null : dataStatuses.get(0); }
}
""",
)

write(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/dto/CultureSiteSearchCriteria.java",
    r"""package com.genealogy.culture.dto;

import java.util.List;
import java.util.Objects;

public final class CultureSiteSearchCriteria {

    private final String keyword;
    private final List<String> siteTypes;
    private final List<Long> branchIds;
    private final String addressText;
    private final String foundedPeriod;
    private final String currentStatus;
    private final Long relatedPersonId;
    private final List<String> dataStatuses;
    private final String privacyLevel;
    private final Boolean featuredOnHome;
    private final String sort;

    public CultureSiteSearchCriteria(
            String keyword,
            String siteType,
            Long branchId,
            String addressText,
            String foundedPeriod,
            String currentStatus,
            Long relatedPersonId,
            String dataStatus,
            String privacyLevel,
            Boolean featuredOnHome,
            String sort
    ) {
        this(keyword, single(siteType), single(branchId), addressText, foundedPeriod, currentStatus, relatedPersonId,
                single(dataStatus), privacyLevel, featuredOnHome, sort);
    }

    private CultureSiteSearchCriteria(
            String keyword,
            List<String> siteTypes,
            List<Long> branchIds,
            String addressText,
            String foundedPeriod,
            String currentStatus,
            Long relatedPersonId,
            List<String> dataStatuses,
            String privacyLevel,
            Boolean featuredOnHome,
            String sort
    ) {
        this.keyword = keyword;
        this.siteTypes = copy(siteTypes);
        this.branchIds = copy(branchIds);
        this.addressText = addressText;
        this.foundedPeriod = foundedPeriod;
        this.currentStatus = currentStatus;
        this.relatedPersonId = relatedPersonId;
        this.dataStatuses = copy(dataStatuses);
        this.privacyLevel = privacyLevel;
        this.featuredOnHome = featuredOnHome;
        this.sort = sort;
    }

    public static CultureSiteSearchCriteria multi(
            String keyword,
            List<String> siteTypes,
            List<Long> branchIds,
            String addressText,
            String foundedPeriod,
            String currentStatus,
            Long relatedPersonId,
            List<String> dataStatuses,
            String privacyLevel,
            Boolean featuredOnHome,
            String sort
    ) {
        return new CultureSiteSearchCriteria(keyword, siteTypes, branchIds, addressText, foundedPeriod, currentStatus,
                relatedPersonId, dataStatuses, privacyLevel, featuredOnHome, sort);
    }

    private static <T> List<T> single(T value) {
        return value == null ? List.of() : List.of(value);
    }

    private static <T> List<T> copy(List<T> values) {
        return values == null ? List.of() : values.stream().filter(Objects::nonNull).toList();
    }

    public String keyword() { return keyword; }
    public List<String> siteTypes() { return siteTypes; }
    public List<Long> branchIds() { return branchIds; }
    public String addressText() { return addressText; }
    public String foundedPeriod() { return foundedPeriod; }
    public String currentStatus() { return currentStatus; }
    public Long relatedPersonId() { return relatedPersonId; }
    public List<String> dataStatuses() { return dataStatuses; }
    public String privacyLevel() { return privacyLevel; }
    public Boolean featuredOnHome() { return featuredOnHome; }
    public String sort() { return sort; }

    public String siteType() { return siteTypes.isEmpty() ? null : siteTypes.get(0); }
    public Long branchId() { return branchIds.isEmpty() ? null : branchIds.get(0); }
    public String dataStatus() { return dataStatuses.isEmpty() ? null : dataStatuses.get(0); }
}
""",
)

# Controllers accept repeated query parameters while preserving parameter names.
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/controller/MigrationEventController.java",
    """import org.springframework.web.bind.annotation.RestController;

@Validated""",
    """import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated""",
)
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/controller/MigrationEventController.java",
    """            @Positive @RequestParam(required = false) Long branchId,
            @Size(max = 500) @RequestParam(required = false) String fromLocation,
            @Size(max = 500) @RequestParam(required = false) String toLocation,
            @Size(max = 200) @RequestParam(required = false) String migrationTimeText,
            @Positive @RequestParam(required = false) Long founderPersonId,
            @RequestParam(required = false) String dataStatus,""",
    """            @Size(max = 100) @RequestParam(name = "branchId", required = false) List<@Positive Long> branchIds,
            @Size(max = 500) @RequestParam(required = false) String fromLocation,
            @Size(max = 500) @RequestParam(required = false) String toLocation,
            @Size(max = 200) @RequestParam(required = false) String migrationTimeText,
            @Positive @RequestParam(required = false) Long founderPersonId,
            @Size(max = 20) @RequestParam(name = "dataStatus", required = false) List<String> dataStatuses,""",
)
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/controller/MigrationEventController.java",
    """                new MigrationEventSearchCriteria(
                        keyword,
                        branchId,
                        fromLocation,
                        toLocation,
                        migrationTimeText,
                        founderPersonId,
                        dataStatus,
                        privacyLevel,
                        sort
                ),""",
    """                MigrationEventSearchCriteria.multi(
                        keyword,
                        branchIds,
                        fromLocation,
                        toLocation,
                        migrationTimeText,
                        founderPersonId,
                        dataStatuses,
                        privacyLevel,
                        sort
                ),""",
)

replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/controller/CultureSiteController.java",
    """import org.springframework.web.bind.annotation.RestController;

@Validated""",
    """import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated""",
)
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/controller/CultureSiteController.java",
    """            @RequestParam(required = false) String siteType,
            @Positive @RequestParam(required = false) Long branchId,
            @Size(max = 500) @RequestParam(required = false) String addressText,
            @Size(max = 200) @RequestParam(required = false) String foundedPeriod,
            @Size(max = 100) @RequestParam(required = false) String currentStatus,
            @Positive @RequestParam(required = false) Long relatedPersonId,
            @RequestParam(required = false) String dataStatus,""",
    """            @Size(max = 20) @RequestParam(name = "siteType", required = false) List<String> siteTypes,
            @Size(max = 100) @RequestParam(name = "branchId", required = false) List<@Positive Long> branchIds,
            @Size(max = 500) @RequestParam(required = false) String addressText,
            @Size(max = 200) @RequestParam(required = false) String foundedPeriod,
            @Size(max = 100) @RequestParam(required = false) String currentStatus,
            @Positive @RequestParam(required = false) Long relatedPersonId,
            @Size(max = 20) @RequestParam(name = "dataStatus", required = false) List<String> dataStatuses,""",
)
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/controller/CultureSiteController.java",
    """                new CultureSiteSearchCriteria(
                        keyword, siteType, branchId, addressText, foundedPeriod, currentStatus, relatedPersonId,
                        dataStatus, privacyLevel, featuredOnHome, sort
                ),""",
    """                CultureSiteSearchCriteria.multi(
                        keyword, siteTypes, branchIds, addressText, foundedPeriod, currentStatus, relatedPersonId,
                        dataStatuses, privacyLevel, featuredOnHome, sort
                ),""",
)

# Domain normalization validates, normalizes and deduplicates list values.
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/domain/MigrationEventDomainService.java",
    """import java.util.Locale;
import java.util.Set;""",
    """import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;""",
)
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/domain/MigrationEventDomainService.java",
    """    public MigrationEventSearchCriteria normalize(MigrationEventSearchCriteria criteria) {
        MigrationEventSearchCriteria safe = criteria == null
                ? new MigrationEventSearchCriteria(null, null, null, null, null, null, null, null, null)
                : criteria;
        return new MigrationEventSearchCriteria(
                optionalText(safe.keyword(), 100, "MIGRATION_EVENT_KEYWORD_TOO_LONG", "搜索关键词不能超过 100 字"),
                safe.branchId(),
                optionalText(safe.fromLocation(), 500, "MIGRATION_EVENT_FROM_TOO_LONG", "迁出地不能超过 500 字"),
                optionalText(safe.toLocation(), 500, "MIGRATION_EVENT_TO_TOO_LONG", "迁入地不能超过 500 字"),
                optionalText(safe.migrationTimeText(), 200, "MIGRATION_EVENT_TIME_TOO_LONG", "迁徙时间不能超过 200 字"),
                safe.founderPersonId(),
                optionalEnum(safe.dataStatus(), this::normalizeStatus),
                optionalEnum(safe.privacyLevel(), this::normalizePrivacy),
                normalizeSort(safe.sort())
        );
    }""",
    """    public MigrationEventSearchCriteria normalize(MigrationEventSearchCriteria criteria) {
        MigrationEventSearchCriteria safe = criteria == null
                ? MigrationEventSearchCriteria.multi(null, List.of(), null, null, null, null, List.of(), null, null)
                : criteria;
        return MigrationEventSearchCriteria.multi(
                optionalText(safe.keyword(), 100, "MIGRATION_EVENT_KEYWORD_TOO_LONG", "搜索关键词不能超过 100 字"),
                normalizeValues(safe.branchIds(), this::normalizeBranchId),
                optionalText(safe.fromLocation(), 500, "MIGRATION_EVENT_FROM_TOO_LONG", "迁出地不能超过 500 字"),
                optionalText(safe.toLocation(), 500, "MIGRATION_EVENT_TO_TOO_LONG", "迁入地不能超过 500 字"),
                optionalText(safe.migrationTimeText(), 200, "MIGRATION_EVENT_TIME_TOO_LONG", "迁徙时间不能超过 200 字"),
                safe.founderPersonId(),
                normalizeValues(safe.dataStatuses(), this::normalizeStatus),
                optionalEnum(safe.privacyLevel(), this::normalizePrivacy),
                normalizeSort(safe.sort())
        );
    }""",
)
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/domain/MigrationEventDomainService.java",
    """    private String normalizeEnum(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }""",
    """    private Long normalizeBranchId(Long value) {
        if (value == null || value <= 0) {
            throw new BusinessException("MIGRATION_EVENT_BRANCH_INVALID", "迁徙事件支派不合法");
        }
        return value;
    }

    private <T, R> List<R> normalizeValues(List<T> values, Function<T, R> normalizer) {
        if (values == null || values.isEmpty()) return List.of();
        return values.stream().filter(Objects::nonNull).map(normalizer).distinct().toList();
    }

    private String normalizeEnum(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }""",
)

replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/domain/CultureSiteDomainService.java",
    """import java.math.BigDecimal;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;""",
    """import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;""",
)
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/domain/CultureSiteDomainService.java",
    """    public CultureSiteSearchCriteria normalize(CultureSiteSearchCriteria criteria) {
        CultureSiteSearchCriteria safe = criteria == null
                ? new CultureSiteSearchCriteria(null, null, null, null, null, null, null, null, null, null, null)
                : criteria;
        return new CultureSiteSearchCriteria(
                optionalText(safe.keyword(), 100, "CULTURE_SITE_KEYWORD_TOO_LONG", "搜索关键词不能超过 100 字"),
                optionalEnum(safe.siteType(), this::normalizeSiteType),
                safe.branchId(),
                optionalText(safe.addressText(), 500, "CULTURE_SITE_ADDRESS_TOO_LONG", "地址不能超过 500 字"),
                optionalText(safe.foundedPeriod(), 200, "CULTURE_SITE_PERIOD_TOO_LONG", "始建年代不能超过 200 字"),
                optionalText(safe.currentStatus(), 100, "CULTURE_SITE_CURRENT_STATUS_TOO_LONG", "现实状态不能超过 100 字"),
                safe.relatedPersonId(),
                optionalEnum(safe.dataStatus(), this::normalizeStatus),
                optionalEnum(safe.privacyLevel(), this::normalizePrivacy),
                safe.featuredOnHome(),
                normalizeSort(safe.sort())
        );
    }""",
    """    public CultureSiteSearchCriteria normalize(CultureSiteSearchCriteria criteria) {
        CultureSiteSearchCriteria safe = criteria == null
                ? CultureSiteSearchCriteria.multi(null, List.of(), List.of(), null, null, null, null, List.of(), null, null, null)
                : criteria;
        return CultureSiteSearchCriteria.multi(
                optionalText(safe.keyword(), 100, "CULTURE_SITE_KEYWORD_TOO_LONG", "搜索关键词不能超过 100 字"),
                normalizeValues(safe.siteTypes(), this::normalizeSiteType),
                normalizeValues(safe.branchIds(), this::normalizeBranchId),
                optionalText(safe.addressText(), 500, "CULTURE_SITE_ADDRESS_TOO_LONG", "地址不能超过 500 字"),
                optionalText(safe.foundedPeriod(), 200, "CULTURE_SITE_PERIOD_TOO_LONG", "始建年代不能超过 200 字"),
                optionalText(safe.currentStatus(), 100, "CULTURE_SITE_CURRENT_STATUS_TOO_LONG", "现实状态不能超过 100 字"),
                safe.relatedPersonId(),
                normalizeValues(safe.dataStatuses(), this::normalizeStatus),
                optionalEnum(safe.privacyLevel(), this::normalizePrivacy),
                safe.featuredOnHome(),
                normalizeSort(safe.sort())
        );
    }""",
)
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/domain/CultureSiteDomainService.java",
    """    private String normalizeEnum(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }""",
    """    private Long normalizeBranchId(Long value) {
        if (value == null || value <= 0) {
            throw new BusinessException("CULTURE_SITE_BRANCH_INVALID", "文化场所支派不合法");
        }
        return value;
    }

    private <T, R> List<R> normalizeValues(List<T> values, Function<T, R> normalizer) {
        if (values == null || values.isEmpty()) return List.of();
        return values.stream().filter(Objects::nonNull).map(normalizer).distinct().toList();
    }

    private String normalizeEnum(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }""",
)

# Application services apply OR semantics within each list-valued dimension.
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/application/MigrationEventApplicationService.java",
    """        if (normalized.branchId() != null && !readableBranchIds.contains(normalized.branchId())) {
            throw new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见");
        }""",
    """        for (Long branchId : normalized.branchIds()) {
            if (!readableBranchIds.contains(branchId)) {
                throw new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见");
            }
        }""",
)
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/application/MigrationEventApplicationService.java",
    """            if (criteria.branchId() != null) {
                predicates.add(cb.equal(root.get("branchId"), criteria.branchId()));
            }""",
    """            if (!criteria.branchIds().isEmpty()) {
                predicates.add(root.get("branchId").in(criteria.branchIds()));
            }""",
)
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/application/MigrationEventApplicationService.java",
    """            if (criteria.dataStatus() != null) {
                predicates.add(cb.equal(root.get("dataStatus"), criteria.dataStatus()));
            }""",
    """            if (!criteria.dataStatuses().isEmpty()) {
                predicates.add(root.get("dataStatus").in(criteria.dataStatuses()));
            }""",
)

replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/application/CultureSiteApplicationService.java",
    """        if (normalized.branchId() != null) {
            requireBranchInClan(clanId, normalized.branchId());
            if (!readScope.canReadBranch(normalized.branchId())) throw notFound();
        }""",
    """        for (Long branchId : normalized.branchIds()) {
            requireBranchInClan(clanId, branchId);
            if (!readScope.canReadBranch(branchId)) throw notFound();
        }""",
)
replace_exact(
    "backend/genealogy-backend/src/main/java/com/genealogy/culture/application/CultureSiteApplicationService.java",
    """            if (criteria.siteType() != null) predicates.add(cb.equal(root.get("siteType"), criteria.siteType()));
            if (criteria.branchId() != null) predicates.add(cb.equal(root.get("branchId"), criteria.branchId()));
            if (criteria.relatedPersonId() != null) predicates.add(cb.equal(root.get("relatedPersonId"), criteria.relatedPersonId()));
            if (criteria.dataStatus() != null) predicates.add(cb.equal(root.get("dataStatus"), criteria.dataStatus()));""",
    """            if (!criteria.siteTypes().isEmpty()) predicates.add(root.get("siteType").in(criteria.siteTypes()));
            if (!criteria.branchIds().isEmpty()) predicates.add(root.get("branchId").in(criteria.branchIds()));
            if (criteria.relatedPersonId() != null) predicates.add(cb.equal(root.get("relatedPersonId"), criteria.relatedPersonId()));
            if (!criteria.dataStatuses().isEmpty()) predicates.add(root.get("dataStatus").in(criteria.dataStatuses()));""",
)

write(
    "backend/genealogy-backend/src/test/java/com/genealogy/culture/domain/CultureSearchMultiSelectDomainServiceTest.java",
    r"""package com.genealogy.culture.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.CultureSiteSearchCriteria;
import com.genealogy.culture.dto.MigrationEventSearchCriteria;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CultureSearchMultiSelectDomainServiceTest {

    @Test
    void normalizesMigrationBranchAndStatusLists() {
        MigrationEventSearchCriteria normalized = new MigrationEventDomainService().normalize(
                MigrationEventSearchCriteria.multi(
                        " 南迁 ",
                        List.of(8L, 8L, 9L),
                        " 江西 ",
                        " 广东 ",
                        " 明代 ",
                        null,
                        List.of("official", "draft", "official"),
                        null,
                        null
                )
        );

        assertEquals("南迁", normalized.keyword());
        assertEquals(List.of(8L, 9L), normalized.branchIds());
        assertEquals(List.of("official", "draft"), normalized.dataStatuses());
        assertEquals("sequenceNo,asc", normalized.sort());
    }

    @Test
    void rejectsInvalidMigrationListValues() {
        BusinessException branch = assertThrows(BusinessException.class, () -> new MigrationEventDomainService().normalize(
                MigrationEventSearchCriteria.multi(null, List.of(0L), null, null, null, null, List.of(), null, null)
        ));
        assertEquals("MIGRATION_EVENT_BRANCH_INVALID", branch.getCode());

        BusinessException status = assertThrows(BusinessException.class, () -> new MigrationEventDomainService().normalize(
                MigrationEventSearchCriteria.multi(null, List.of(), null, null, null, null, List.of("bad"), null, null)
        ));
        assertEquals("MIGRATION_EVENT_STATUS_INVALID", status.getCode());
    }

    @Test
    void normalizesCultureSiteTypeBranchAndStatusLists() {
        CultureSiteSearchCriteria normalized = new CultureSiteDomainService().normalize(
                CultureSiteSearchCriteria.multi(
                        " 祠堂 ",
                        List.of("ancestral_hall", "ancestral_home", "ancestral_hall"),
                        List.of(8L, 9L, 8L),
                        " 杭州 ",
                        null,
                        " 存续 ",
                        null,
                        List.of("official", "draft", "official"),
                        null,
                        null,
                        null
                )
        );

        assertEquals("祠堂", normalized.keyword());
        assertEquals(List.of("ancestral_hall", "ancestral_home"), normalized.siteTypes());
        assertEquals(List.of(8L, 9L), normalized.branchIds());
        assertEquals(List.of("official", "draft"), normalized.dataStatuses());
        assertEquals("sortOrder,asc", normalized.sort());
    }

    @Test
    void rejectsInvalidCultureSiteListValues() {
        BusinessException type = assertThrows(BusinessException.class, () -> new CultureSiteDomainService().normalize(
                CultureSiteSearchCriteria.multi(null, List.of("bad"), List.of(), null, null, null, null, List.of(), null, null, null)
        ));
        assertEquals("CULTURE_SITE_TYPE_INVALID", type.getCode());

        BusinessException branch = assertThrows(BusinessException.class, () -> new CultureSiteDomainService().normalize(
                CultureSiteSearchCriteria.multi(null, List.of(), List.of(-1L), null, null, null, null, List.of(), null, null, null)
        ));
        assertEquals("CULTURE_SITE_BRANCH_INVALID", branch.getCode());
    }
}
""",
)

# OpenAPI explicitly models repeated form query parameters.
replace_exact(
    "docs/api/openapi.culture.json",
    """        "summary": "分页搜索迁徙事件",
        "parameters": [
          { "name": "clanId", "in": "path", "required": true, "schema": { "type": "integer", "format": "int64" } },
          { "name": "keyword", "in": "query", "required": false, "schema": { "type": "string", "maxLength": 100 } },
          { "name": "branchId", "in": "query", "required": false, "schema": { "type": "integer", "format": "int64" } },
          { "name": "founderPersonId", "in": "query", "required": false, "schema": { "type": "integer", "format": "int64" } },
          { "name": "dataStatus", "in": "query", "required": false, "schema": { "$ref": "#/components/schemas/CultureDataStatus" } },""",
    """        "summary": "分页搜索迁徙事件",
        "description": "支派和数据状态支持重复 query 参数；同一维度按 OR，不同维度按 AND。旧单值请求继续兼容。",
        "parameters": [
          { "name": "clanId", "in": "path", "required": true, "schema": { "type": "integer", "format": "int64" } },
          { "name": "keyword", "in": "query", "required": false, "schema": { "type": "string", "maxLength": 100 } },
          { "name": "branchId", "in": "query", "required": false, "style": "form", "explode": true, "schema": { "type": "array", "maxItems": 100, "items": { "type": "integer", "format": "int64", "minimum": 1 } } },
          { "name": "founderPersonId", "in": "query", "required": false, "schema": { "type": "integer", "format": "int64" } },
          { "name": "dataStatus", "in": "query", "required": false, "style": "form", "explode": true, "schema": { "type": "array", "maxItems": 20, "items": { "$ref": "#/components/schemas/CultureDataStatus" } } },""",
)
replace_exact(
    "docs/api/openapi.culture.json",
    """        "summary": "分页搜索文化场所",
        "parameters": [
          { "name": "clanId", "in": "path", "required": true, "schema": { "type": "integer", "format": "int64" } },
          { "name": "keyword", "in": "query", "required": false, "schema": { "type": "string", "maxLength": 100 } },
          { "name": "siteType", "in": "query", "required": false, "schema": { "$ref": "#/components/schemas/CultureSiteType" } },
          { "name": "branchId", "in": "query", "required": false, "schema": { "type": "integer", "format": "int64" } },
          { "name": "dataStatus", "in": "query", "required": false, "schema": { "$ref": "#/components/schemas/CultureDataStatus" } },""",
    """        "summary": "分页搜索文化场所",
        "description": "场所类型、支派和数据状态支持重复 query 参数；同一维度按 OR，不同维度按 AND。旧单值请求继续兼容。",
        "parameters": [
          { "name": "clanId", "in": "path", "required": true, "schema": { "type": "integer", "format": "int64" } },
          { "name": "keyword", "in": "query", "required": false, "schema": { "type": "string", "maxLength": 100 } },
          { "name": "siteType", "in": "query", "required": false, "style": "form", "explode": true, "schema": { "type": "array", "maxItems": 20, "items": { "$ref": "#/components/schemas/CultureSiteType" } } },
          { "name": "branchId", "in": "query", "required": false, "style": "form", "explode": true, "schema": { "type": "array", "maxItems": 100, "items": { "type": "integer", "format": "int64", "minimum": 1 } } },
          { "name": "dataStatus", "in": "query", "required": false, "style": "form", "explode": true, "schema": { "type": "array", "maxItems": 20, "items": { "$ref": "#/components/schemas/CultureDataStatus" } } },""",
)

print("Issue 277 multi-select patch applied")
