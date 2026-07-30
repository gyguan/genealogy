export type WorkbenchFilters = {
  taskName: string;
  keyword: string;
  taskTypes: string[];
  risks: string[];
  statuses: string[];
  creator: string;
  createdFrom: string;
  createdTo: string;
};

export type WorkbenchUrlState = WorkbenchFilters & {
  clanId: string;
  page: number;
  taskId: string;
};

export type WorkbenchKpiKey = 'pending' | 'high' | 'source' | 'generation';
export type WorkbenchEmptyState = { description: string; action: '' | 'clear' | 'retry' };

export function workbenchTotalText(total: number) {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  return `共 ${safeTotal} 条任务`;
}

export const EMPTY_FILTERS: WorkbenchFilters = {
  taskName: '',
  keyword: '',
  taskTypes: [],
  risks: [],
  statuses: [],
  creator: '',
  createdFrom: '',
  createdTo: ''
};

const TASK_TYPES = new Set(['review_follow_up', 'missing_source', 'generation_mismatch', 'relationship_check', 'import_follow_up']);
const RISKS = new Set(['high', 'medium', 'low']);
const STATUSES = new Set(['pending', 'processing', 'ready', 'blocked']);
const CREATORS = new Set(['system_rule', 'review_flow']);

function readText(params: URLSearchParams, key: string) {
  return String(params.get(key) || '').trim();
}

function readAllowedText(params: URLSearchParams, key: string, allowed: Set<string>) {
  const value = readText(params, key);
  return allowed.has(value) ? value : '';
}

function readMany(params: URLSearchParams, key: string, allowed: Set<string>) {
  const values = params.getAll(key)
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(value => allowed.has(value));
  return Array.from(new Set(values));
}

export function readWorkbenchUrlState(search: string): WorkbenchUrlState {
  const params = new URLSearchParams(search);
  const pageValue = Number(params.get('page'));
  return {
    clanId: readText(params, 'clanId'),
    taskName: readText(params, 'taskName'),
    keyword: readText(params, 'keyword'),
    taskTypes: readMany(params, 'type', TASK_TYPES),
    risks: readMany(params, 'risk', RISKS),
    statuses: readMany(params, 'status', STATUSES),
    creator: readAllowedText(params, 'creator', CREATORS),
    createdFrom: readText(params, 'createdFrom'),
    createdTo: readText(params, 'createdTo'),
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
    taskId: readText(params, 'taskId')
  };
}

export function writeWorkbenchUrlState(currentUrl: string, patch: Partial<WorkbenchUrlState>) {
  const url = new URL(currentUrl, 'http://genealogy.local');
  const scalarMapping: Array<[keyof WorkbenchUrlState, string]> = [
    ['clanId', 'clanId'],
    ['taskName', 'taskName'],
    ['keyword', 'keyword'],
    ['creator', 'creator'],
    ['createdFrom', 'createdFrom'],
    ['createdTo', 'createdTo'],
    ['page', 'page'],
    ['taskId', 'taskId']
  ];
  scalarMapping.forEach(([key, param]) => {
    if (!(key in patch)) return;
    const value = patch[key];
    const empty = value === undefined || value === null || value === '' || (key === 'page' && value === 1);
    if (empty) url.searchParams.delete(param);
    else url.searchParams.set(param, String(value));
  });
  const arrayMapping: Array<[keyof Pick<WorkbenchUrlState, 'taskTypes' | 'risks' | 'statuses'>, string]> = [
    ['taskTypes', 'type'],
    ['risks', 'risk'],
    ['statuses', 'status']
  ];
  arrayMapping.forEach(([key, param]) => {
    if (!(key in patch)) return;
    url.searchParams.delete(param);
    const values = patch[key];
    if (Array.isArray(values)) values.forEach(value => url.searchParams.append(param, value));
  });
  return `${url.pathname}${url.search}${url.hash}`;
}

export function filtersForKpi(key: WorkbenchKpiKey): WorkbenchFilters {
  if (key === 'pending') return { ...EMPTY_FILTERS, statuses: ['pending'] };
  if (key === 'high') return { ...EMPTY_FILTERS, risks: ['high'] };
  if (key === 'source') return { ...EMPTY_FILTERS, taskTypes: ['missing_source'] };
  return { ...EMPTY_FILTERS, taskTypes: ['generation_mismatch'] };
}

export function filterLabels(filters: WorkbenchFilters) {
  const labels: Array<{ key: keyof WorkbenchFilters; label: string }> = [];
  const taskTypeLabels: Record<string, string> = {
    review_follow_up: '审核跟进',
    missing_source: '来源证据缺失',
    generation_mismatch: '字辈/代次待补',
    relationship_check: '关系复核建议',
    import_follow_up: '导入异常'
  };
  const riskLabels: Record<string, string> = { high: '高风险', medium: '中风险', low: '低风险' };
  const statusLabels: Record<string, string> = { pending: '待处理', processing: '处理中', ready: '待确认', blocked: '已阻塞' };
  if (filters.taskName) labels.push({ key: 'taskName', label: `任务：${filters.taskName}` });
  if (filters.keyword) labels.push({ key: 'keyword', label: `关键词：${filters.keyword}` });
  if (filters.taskTypes.length) labels.push({ key: 'taskTypes', label: `类型：${filters.taskTypes.map(value => taskTypeLabels[value] || value).join('、')}` });
  if (filters.risks.length) labels.push({ key: 'risks', label: `优先级：${filters.risks.map(value => riskLabels[value] || value).join('、')}` });
  if (filters.statuses.length) labels.push({ key: 'statuses', label: `状态：${filters.statuses.map(value => statusLabels[value] || value).join('、')}` });
  if (filters.creator) labels.push({ key: 'creator', label: `创建人：${filters.creator === 'review_flow' ? '审核流程' : '系统规则'}` });
  if (filters.createdFrom || filters.createdTo) labels.push({ key: 'createdFrom', label: '创建时间' });
  return labels;
}

export function summarizeBulkResults(results: Array<PromiseSettledResult<unknown>>) {
  return results.reduce(
    (summary, result) => {
      if (result.status === 'fulfilled') summary.succeeded += 1;
      else summary.failed += 1;
      return summary;
    },
    { succeeded: 0, failed: 0 }
  );
}

export function workbenchEmptyState(input: {
  hasClan: boolean;
  loading: boolean;
  error: boolean;
  hasFilters: boolean;
  count: number;
}): WorkbenchEmptyState {
  if (input.loading || input.count > 0) return { description: '', action: '' };
  if (input.error) return { description: '任务列表加载失败', action: 'retry' };
  if (!input.hasClan) return { description: '请选择宗族后查看修谱任务', action: '' };
  if (input.hasFilters) return { description: '当前筛选条件下暂无修谱任务', action: 'clear' };
  return { description: '当前宗族暂无待处理修谱任务', action: '' };
}
