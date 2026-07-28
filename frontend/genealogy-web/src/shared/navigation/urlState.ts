import { commitNavigation } from './navigationEvents';

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
    'pageNo',
    'pageSize'
  ],
  treeProduct: [
    'clanId',
    'branchId',
    'personBranchId',
    'personId',
    'mode',
    'personDepth',
    'branchDepth',
    'direction',
    'relations',
    'personRelations',
    'branchRelations',
    'includeSubBranches'
  ],
  sourceLibrary: [
    'clanId',
    'sourceId',
    'quality',
    'keyword',
    'sourceType',
    'verificationStatus',
    'privacyLevel',
    'hasAttachment',
    'hasBinding',
    'pageNo',
    'pageSize',
    'sort'
  ],
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
  reviewCenter: ['clanId', 'reviewTab', 'status', 'page', 'pageNo', 'pageSize'],
  memberManage: ['clanId', 'keyword', 'role', 'scope', 'status', 'page', 'pageSize', 'member'],
  auditTrace: [
    'clanId',
    'branchId',
    'tab',
    'objectType',
    'objectStatus',
    'objectKeyword',
    'objectPage',
    'auditAction',
    'auditTarget',
    'auditActor',
    'auditResult',
    'auditKeyword',
    'auditPage',
    'riskEvent',
    'riskLevel',
    'riskDisposition',
    'riskActor',
    'riskBranch',
    'riskPage',
    'traceType',
    'traceId',
    'reviewTaskId',
    'auditLogId',
    'riskLogId'
  ]
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

function applyViewDefaults(view: AppViewKey, url: URL) {
  if (view === 'reviewCenter' && !url.searchParams.has('pageSize')) {
    url.searchParams.set('pageSize', '10');
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
  applyViewDefaults(view, next);
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
  return commitNavigation(next, { mode, state });
}
