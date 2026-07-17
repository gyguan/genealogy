export type AppViewKey =
  | 'home'
  | 'mvp1Wizard'
  | 'personArchive'
  | 'treeProduct'
  | 'sourceLibrary'
  | 'culture'
  | 'imports'
  | 'editingWorkspace'
  | 'reviewCenter'
  | 'memberManage'
  | 'auditTrace';

const VIEW_QUERY_KEYS: Record<AppViewKey, readonly string[]> = {
  home: ['clanId', 'metric', 'category'],
  mvp1Wizard: ['clanId', 'step'],
  personArchive: [
    'clanId',
    'branchId',
    'personId',
    'keyword',
    'name',
    'gender',
    'generationWord',
    'generationNo',
    'dataStatus',
    'sort',
    'page',
    'pageSize'
  ],
  treeProduct: [
    'clanId',
    'branchId',
    'personId',
    'mode',
    'personDepth',
    'branchDepth',
    'direction',
    'relations',
    'includeSubBranches'
  ],
  sourceLibrary: ['clanId', 'sourceId', 'quality'],
  culture: [
    'clanId',
    'tab',
    'cultureKeyword',
    'cultureCategory',
    'cultureBranch',
    'cultureStatus',
    'culturePrivacy',
    'cultureHasSource',
    'cultureFeatured',
    'cultureSort',
    'culturePage',
    'culturePageSize',
    'cultureItem',
    'migrationKeyword',
    'migrationBranch',
    'migrationFrom',
    'migrationTo',
    'migrationTime',
    'migrationStatus',
    'migrationSort',
    'migrationPage',
    'migrationPageSize',
    'migrationItem',
    'siteKeyword',
    'siteType',
    'siteBranch',
    'siteAddress',
    'siteCurrentStatus',
    'siteStatus',
    'siteSort',
    'sitePage',
    'sitePageSize',
    'siteItem'
  ],
  imports: ['clanId', 'type', 'historyPage', 'historyPageSize', 'status'],
  editingWorkspace: ['clanId', 'branchId', 'personId', 'quality', 'status'],
  reviewCenter: ['clanId', 'reviewTab', 'status', 'page', 'pageSize'],
  memberManage: ['clanId', 'role', 'status'],
  auditTrace: ['clanId', 'tab', 'objectType', 'auditAction', 'auditTarget', 'riskEvent']
};

export type ViewUrlOptions = {
  pathname?: string;
  hash?: string;
  params?: URLSearchParams | Record<string, string | number | boolean | null | undefined>;
};

function toUrl(input: string | URL) {
  return typeof input === 'string' ? new URL(input, 'http://localhost') : new URL(input.toString());
}

function applyParams(url: URL, params: ViewUrlOptions['params']) {
  if (!params) return;
  const entries = params instanceof URLSearchParams ? params.entries() : Object.entries(params);
  for (const [key, rawValue] of entries) {
    if (rawValue === null || rawValue === undefined || rawValue === '') url.searchParams.delete(key);
    else url.searchParams.set(key, String(rawValue));
  }
}

export function buildViewUrl(view: AppViewKey, input: string | URL, options: ViewUrlOptions = {}) {
  const current = toUrl(input);
  const next = new URL(options.pathname || '/', current.origin);
  const allowedKeys = new Set(VIEW_QUERY_KEYS[view]);

  for (const key of allowedKeys) {
    const values = current.searchParams.getAll(key);
    values.forEach(value => {
      if (value !== '') next.searchParams.append(key, value);
    });
  }

  applyParams(next, options.params);

  for (const key of [...next.searchParams.keys()]) {
    if (key !== 'view' && !allowedKeys.has(key)) next.searchParams.delete(key);
  }

  if (view === 'home') next.searchParams.delete('view');
  else next.searchParams.set('view', view);
  next.hash = options.hash || '';
  return `${next.pathname}${next.search}${next.hash}`;
}

export function navigateToView(
  view: AppViewKey,
  input: string | URL,
  options: ViewUrlOptions & { mode?: 'push' | 'replace'; state?: unknown } = {}
) {
  const { mode = 'push', state = window.history.state, ...urlOptions } = options;
  const next = buildViewUrl(view, input, urlOptions);
  window.history[mode === 'replace' ? 'replaceState' : 'pushState'](state, '', next);
  return next;
}