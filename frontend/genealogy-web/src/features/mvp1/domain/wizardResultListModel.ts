export const WIZARD_RESULT_PAGE_SIZE = 10;

export type WizardResultListState<T> = {
  items: T[];
  stale: boolean;
  error: string;
};

export function pageWizardResults<T>(items: T[], page: number, pageSize = WIZARD_RESULT_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return { page: safePage, pageCount, total: items.length, items: items.slice(start, start + pageSize) };
}

export function wizardBatchToolbarVisible(selectedCount: number) {
  return selectedCount > 0;
}

export function retainWizardResultsAfterRefreshFailure<T>(previous: T[], error: unknown): WizardResultListState<T> {
  return {
    items: previous,
    stale: previous.length > 0,
    error: error instanceof Error && error.message ? error.message : '刷新失败，请重试'
  };
}

export function wizardSelectionLabel(name: string, selected: boolean) {
  return selected ? `${name}，已选择` : `选择${name}`;
}

export function wizardMobileListMode(width: number) {
  return width < 768 ? 'scroll' as const : 'table' as const;
}
