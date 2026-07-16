export type ImportHistoryUrlState = {
  status?: string;
  type?: string;
  format?: string;
  page: number;
  pageSize: number;
};

export function readImportHistoryUrl(search: string): ImportHistoryUrlState {
  const params = new URLSearchParams(search);
  const page = Number(params.get('historyPage') || 1);
  const pageSize = Number(params.get('historyPageSize') || 10);
  return {
    status: params.get('historyStatus') || undefined,
    type: params.get('historyType') || undefined,
    format: params.get('historyFormat') || undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: [10, 20, 50].includes(pageSize) ? pageSize : 10
  };
}

export function writeImportHistoryUrl(state: ImportHistoryUrlState) {
  const params = new URLSearchParams(window.location.search);
  const setOptional = (key: string, value?: string) => value ? params.set(key, value) : params.delete(key);
  setOptional('historyStatus', state.status);
  setOptional('historyType', state.type);
  setOptional('historyFormat', state.format);
  params.set('historyPage', String(state.page));
  params.set('historyPageSize', String(state.pageSize));
  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
}
