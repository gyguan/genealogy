import type { ImportTypeKey } from './import-type-registry';

export type ImportViewKey = 'create' | 'executions' | 'history';
export type ImportPageUrlState = {
  tab: ImportViewKey;
  type: ImportTypeKey;
  branchId: string;
};

const views: ImportViewKey[] = ['create', 'executions', 'history'];
const types: ImportTypeKey[] = ['person', 'relationship', 'source'];

export function readImportPageUrl(search: string): ImportPageUrlState {
  const params = new URLSearchParams(search);
  const tab = params.get('tab') as ImportViewKey | null;
  const type = params.get('type') as ImportTypeKey | null;
  return {
    tab: tab && views.includes(tab) ? tab : 'create',
    type: type && types.includes(type) ? type : 'person',
    branchId: params.get('branchId') || ''
  };
}

export function writeImportPageUrl(patch: Partial<ImportPageUrlState>, mode: 'push' | 'replace' = 'replace') {
  const current = readImportPageUrl(window.location.search);
  const next = { ...current, ...patch };
  const params = new URLSearchParams(window.location.search);
  params.set('tab', next.tab);
  params.set('type', next.type);
  if (next.branchId) params.set('branchId', next.branchId);
  else params.delete('branchId');
  const url = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
  window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
}
