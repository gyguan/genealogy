import type { ImportExecutionStatus } from '../../shared/api/generated/import-execution-types';
import type { ImportTypeKey } from './import-type-registry';

export type ImportTaskStatusFilter = ImportExecutionStatus | 'partial_completed';

export type ImportTaskQueryState = {
  importTypes: ImportTypeKey[];
  statuses: ImportTaskStatusFilter[];
  keyword: string;
  createdFrom: string;
  createdTo: string;
  pageNo: number;
  pageSize: number;
};

const allowedTypes: ImportTypeKey[] = ['person', 'relationship', 'source'];
const allowedStatuses: ImportTaskStatusFilter[] = [
  'queued',
  'running',
  'paused',
  'retry_wait',
  'completed',
  'partial_completed',
  'failed',
  'cancelled',
  'dead_letter'
];
const allowedPageSizes = [10, 20, 50];

export const defaultImportTaskQuery: ImportTaskQueryState = {
  importTypes: [],
  statuses: [],
  keyword: '',
  createdFrom: '',
  createdTo: '',
  pageNo: 1,
  pageSize: 10
};

function parseList<T extends string>(value: string | null, allowed: T[]) {
  if (!value) return [];
  return Array.from(new Set(value.split(',').map(item => item.trim()).filter(item => allowed.includes(item as T)))) as T[];
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

export function readImportTaskQuery(search: string): ImportTaskQueryState {
  const params = new URLSearchParams(search);
  const pageSize = parsePositiveInt(params.get('importPageSize'), defaultImportTaskQuery.pageSize);
  return {
    importTypes: parseList(params.get('importTypes'), allowedTypes),
    statuses: parseList(params.get('importStatuses'), allowedStatuses),
    keyword: params.get('importKeyword')?.trim() || '',
    createdFrom: parseDate(params.get('importCreatedFrom')),
    createdTo: parseDate(params.get('importCreatedTo')),
    pageNo: parsePositiveInt(params.get('importPage'), defaultImportTaskQuery.pageNo),
    pageSize: allowedPageSizes.includes(pageSize) ? pageSize : defaultImportTaskQuery.pageSize
  };
}

export function writeImportTaskQuery(
  patch: Partial<ImportTaskQueryState>,
  mode: 'push' | 'replace' = 'replace'
) {
  const next = { ...readImportTaskQuery(window.location.search), ...patch };
  const params = new URLSearchParams(window.location.search);

  const setList = (name: string, values: string[]) => {
    if (values.length) params.set(name, values.join(','));
    else params.delete(name);
  };
  const setText = (name: string, value: string) => {
    if (value) params.set(name, value);
    else params.delete(name);
  };

  setList('importTypes', next.importTypes);
  setList('importStatuses', next.statuses);
  setText('importKeyword', next.keyword.trim());
  setText('importCreatedFrom', next.createdFrom);
  setText('importCreatedTo', next.createdTo);
  params.set('importPage', String(next.pageNo));
  params.set('importPageSize', String(next.pageSize));

  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](window.history.state, '', url);
}
