export type PersonArchiveSearchState = {
  keyword: string;
  name: string;
  gender: string;
  generationWord: string;
  generationNo: string;
  branchId: string;
  dataStatus: string;
  pageNo: number;
  sort: string;
};

export type PersonDetailTab = 'basic' | 'events' | 'relations' | 'sources' | 'tracking';

export const DEFAULT_PERSON_SORT = 'updatedAt,desc';
export const PERSON_SORT_OPTIONS = [
  { value: 'updatedAt,desc', label: '最近更新' },
  { value: 'name,asc', label: '姓名升序' },
  { value: 'generationNo,asc', label: '代次升序' }
] as const;

const PERSON_ARCHIVE_QUERY_KEYS = ['keyword', 'name', 'gender', 'generationWord', 'generationNo', 'branchId', 'dataStatus', 'page', 'sort'] as const;
const allowedGender = new Set(['', 'male', 'female', 'unknown']);
const allowedStatus = new Set(['', 'draft', 'pending_review', 'official', 'rejected', 'archived']);
const allowedSort = new Set<string>(PERSON_SORT_OPTIONS.map(item => item.value));
const allowedTabs = new Set<PersonDetailTab>(['basic', 'events', 'relations', 'sources', 'tracking']);

function text(params: URLSearchParams, key: string) {
  return String(params.get(key) || '').trim().slice(0, 200);
}
function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1;
}

export function emptyPersonArchiveSearch(): PersonArchiveSearchState {
  return { keyword: '', name: '', gender: '', generationWord: '', generationNo: '', branchId: '', dataStatus: '', pageNo: 1, sort: DEFAULT_PERSON_SORT };
}

export function readPersonArchiveSearch(url = new URL(window.location.href)): PersonArchiveSearchState {
  const params = url.searchParams;
  const gender = text(params, 'gender');
  const dataStatus = text(params, 'dataStatus');
  const sort = text(params, 'sort');
  const generationNo = text(params, 'generationNo');
  const branchId = text(params, 'branchId');
  return {
    keyword: text(params, 'keyword'),
    name: text(params, 'name'),
    gender: allowedGender.has(gender) ? gender : '',
    generationWord: text(params, 'generationWord'),
    generationNo: /^\d{1,4}$/.test(generationNo) ? generationNo : '',
    branchId: /^\d+$/.test(branchId) ? branchId : '',
    dataStatus: allowedStatus.has(dataStatus) ? dataStatus : '',
    pageNo: positivePage(params.get('page')),
    sort: allowedSort.has(sort) ? sort : DEFAULT_PERSON_SORT
  };
}

export function hasPersonArchiveQuery(url = new URL(window.location.href)) {
  return PERSON_ARCHIVE_QUERY_KEYS.some(key => url.searchParams.has(key));
}

export function buildPersonArchiveUrl(state: PersonArchiveSearchState, source = window.location.href) {
  const url = new URL(source, window.location.origin);
  url.pathname = '/';
  url.hash = '';
  url.searchParams.set('view', 'personArchive');
  [...PERSON_ARCHIVE_QUERY_KEYS, 'tab'].forEach(key => url.searchParams.delete(key));
  const values: Array<[string, string]> = [
    ['keyword', state.keyword.trim()], ['name', state.name.trim()], ['gender', state.gender], ['generationWord', state.generationWord],
    ['generationNo', state.generationNo], ['branchId', state.branchId], ['dataStatus', state.dataStatus]
  ];
  values.forEach(([key, value]) => { if (value) url.searchParams.set(key, value); });
  if (state.pageNo > 1) url.searchParams.set('page', String(state.pageNo));
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

export function writePersonDetailTab(tab: PersonDetailTab, mode: 'push' | 'replace' = 'push') {
  const url = new URL(window.location.href);
  if (tab === 'basic') url.searchParams.delete('tab'); else url.searchParams.set('tab', tab);
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
