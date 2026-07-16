export type WorkbenchFilters = {
  taskType: string;
  risk: string;
  status: string;
};

export type WorkbenchUrlState = WorkbenchFilters & {
  clanId: string;
  page: number;
  taskId: string;
};

export type WorkbenchKpiKey = 'pending' | 'high' | 'source' | 'generation';

export const EMPTY_FILTERS: WorkbenchFilters = { taskType: '', risk: '', status: '' };

const TASK_TYPES = new Set(['review_follow_up', 'missing_source', 'generation_mismatch', 'relationship_check', 'import_follow_up']);
const RISKS = new Set(['high', 'medium', 'low']);
const STATUSES = new Set(['pending', 'processing', 'ready', 'blocked']);

function allowed(value: string | null, values: Set<string>) {
  return value && values.has(value) ? value : '';
}

export function readWorkbenchUrlState(search: string): WorkbenchUrlState {
  const params = new URLSearchParams(search);
  const pageValue = Number(params.get('page'));
  return {
    clanId: String(params.get('clanId') || '').trim(),
    taskType: allowed(params.get('type'), TASK_TYPES),
    risk: allowed(params.get('risk'), RISKS),
    status: allowed(params.get('status'), STATUSES),
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
    taskId: String(params.get('taskId') || '').trim()
  };
}

export function writeWorkbenchUrlState(currentUrl: string, patch: Partial<WorkbenchUrlState>) {
  const url = new URL(currentUrl, 'http://genealogy.local');
  const mapping: Array<[keyof WorkbenchUrlState, string]> = [
    ['clanId', 'clanId'],
    ['taskType', 'type'],
    ['risk', 'risk'],
    ['status', 'status'],
    ['page', 'page'],
    ['taskId', 'taskId']
  ];
  mapping.forEach(([key, param]) => {
    if (!(key in patch)) return;
    const value = patch[key];
    const empty = value === undefined || value === null || value === '' || (key === 'page' && value === 1);
    if (empty) url.searchParams.delete(param);
    else url.searchParams.set(param, String(value));
  });
  return `${url.pathname}${url.search}${url.hash}`;
}

export function filtersForKpi(key: WorkbenchKpiKey): WorkbenchFilters {
  if (key === 'pending') return { ...EMPTY_FILTERS, status: 'pending' };
  if (key === 'high') return { ...EMPTY_FILTERS, risk: 'high' };
  if (key === 'source') return { ...EMPTY_FILTERS, taskType: 'missing_source' };
  return { ...EMPTY_FILTERS, taskType: 'generation_mismatch' };
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
  if (filters.taskType) labels.push({ key: 'taskType', label: `问题：${taskTypeLabels[filters.taskType] || filters.taskType}` });
  if (filters.risk) labels.push({ key: 'risk', label: `风险：${riskLabels[filters.risk] || filters.risk}` });
  if (filters.status) labels.push({ key: 'status', label: `状态：${statusLabels[filters.status] || filters.status}` });
  return labels;
}
