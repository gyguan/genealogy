export type PersonArchiveSearchState = {
  keyword: string;
  name: string;
  genders: string[];
  generationWords: string[];
  generationNos: string[];
  branchId: string;
  dataStatuses: string[];
  pageNo: number;
  pageSize: number;
  sort: string;
};

export type PersonDetailTab = 'basic' | 'events' | 'relations' | 'sources' | 'tracking';

export const DEFAULT_PERSON_SORT = 'updatedAt,desc';
export const DEFAULT_PERSON_PAGE_SIZE = 10;
export const PERSON_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const PERSON_SORT_OPTIONS = [
  { value: 'updatedAt,desc', label: '最近更新' },
  { value: 'name,asc', label: '姓名升序' },
  { value: 'generationNo,asc', label: '代次升序' }
] as const;

const PERSON_ARCHIVE_QUERY_KEYS = [
  'keyword', 'name', 'gender', 'generationWord', 'generationNo', 'branchId', 'dataStatus', 'page', 'pageSize', 'sort'
] as const;
const allowedGender = new Set(['male', 'female', 'unknown']);
const allowedStatus = new Set(['draft', 'pending_review', 'official', 'rejected', 'archived']);
const allowedSort = new Set<string>(PERSON_SORT_OPTIONS.map(item => item.value));
const allowedTabs = new Set<PersonDetailTab>(['basic', 'events', 'relations', 'sources', 'tracking']);

function text(params: URLSearchParams, key: string) {
  return String(params.get(key) || '').trim().slice(0, 200);
}

function list(params: URLSearchParams, key: string) {
  return params.getAll(key)
    .flatMap(value => value.split(','))
    .map(value => value.trim().slice(0, 200))
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1;
}

function pageSize(value: string | null) {
  const size = Number(value);
  return PERSON_PAGE_SIZE_OPTIONS.includes(size as typeof PERSON_PAGE_SIZE_OPTIONS[number])
    ? size
    : DEFAULT_PERSON_PAGE_SIZE;
}

export function emptyPersonArchiveSearch(): PersonArchiveSearchState {
  return {
    keyword: '',
    name: '',
    genders: [],
    generationWords: [],
    generationNos: [],
    branchId: '',
    dataStatuses: ['official'],
    pageNo: 1,
    pageSize: DEFAULT_PERSON_PAGE_SIZE,
    sort: DEFAULT_PERSON_SORT
  };
}

export function readPersonArchiveSearch(url = new URL(window.location.href)): PersonArchiveSearchState {
  const params = url.searchParams;
  const sort = text(params, 'sort');
  const branchId = text(params, 'branchId');
  const genders = list(params, 'gender').filter(value => allowedGender.has(value));
  const generationNos = list(params, 'generationNo').filter(value => /^\d{1,4}$/.test(value) && Number(value) > 0);
  const dataStatuses = list(params, 'dataStatus').filter(value => allowedStatus.has(value));
  return {
    keyword: text(params, 'keyword'),
    name: text(params, 'name'),
    genders,
    generationWords: list(params, 'generationWord'),
    generationNos,
    branchId: /^\d+$/.test(branchId) ? branchId : '',
    dataStatuses: dataStatuses.length ? dataStatuses : ['official'],
    pageNo: positivePage(params.get('page')),
    pageSize: pageSize(params.get('pageSize')),
    sort: allowedSort.has(sort) ? sort : DEFAULT_PERSON_SORT
  };
}

export function hasPersonArchiveQuery(url = new URL(window.location.href)) {
  return PERSON_ARCHIVE_QUERY_KEYS.some(key => url.searchParams.has(key));
}

export function buildPersonArchiveUrl(state: PersonArchiveSearchState, source = window.location.href) {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const url = new URL(source, origin);
  url.pathname = '/';
  url.hash = '';
  url.searchParams.set('view', 'personArchive');
  [...PERSON_ARCHIVE_QUERY_KEYS, 'tab'].forEach(key => url.searchParams.delete(key));

  const scalarValues: Array<[string, string]> = [
    ['keyword', state.keyword.trim()],
    ['name', state.name.trim()],
    ['branchId', state.branchId]
  ];
  scalarValues.forEach(([key, value]) => { if (value) url.searchParams.set(key, value); });

  const multiValues: Array<[string, string[]]> = [
    ['gender', state.genders],
    ['generationWord', state.generationWords],
    ['generationNo', state.generationNos],
    ['dataStatus', state.dataStatuses]
  ];
  multiValues.forEach(([key, values]) => values.forEach(value => {
    const normalized = String(value || '').trim();
    if (normalized) url.searchParams.append(key, normalized);
  }));

  if (state.pageNo > 1) url.searchParams.set('page', String(state.pageNo));
  if (state.pageSize !== DEFAULT_PERSON_PAGE_SIZE) url.searchParams.set('pageSize', String(state.pageSize));
  if (state.sort !== DEFAULT_PERSON_SORT) url.searchParams.set('sort', state.sort);
  return `${url.pathname}${url.search}`;
}

export function writePersonArchiveUrl(state: PersonArchiveSearchState, mode: 'push' | 'replace' = 'push') {
  const href = buildPersonArchiveUrl(state);
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](
    { ...(window.history.state || {}), genealogyPersonArchiveScrollY: window.scrollY }, '', href
  );
}

export function readPersonDetailTab(url = new URL(window.location.href)): PersonDetailTab {
  const value = String(url.searchParams.get('tab') || 'basic') as PersonDetailTab;
  return allowedTabs.has(value) ? value : 'basic';
}

export function writePersonDetailTab(tab: PersonDetailTab, _mode: 'push' | 'replace' = 'replace') {
  const url = new URL(window.location.href);
  if (tab === 'basic') url.searchParams.delete('tab'); else url.searchParams.set('tab', tab);
  // TAB 属于同一详情页的内部状态，必须替换当前记录，避免返回按钮逐个回退 TAB 历史。
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
