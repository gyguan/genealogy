import type { ImportExecutionAction, ImportExecutionStage, ImportExecutionStatus } from '../../shared/api/generated/import-execution-types';
import type { ImportTaskQueryState, ImportTaskStatusFilter } from './import-task-query-state';
import type { ImportTypeKey } from './import-type-registry';

export type ImportTaskRecord = {
  id: number;
  taskNo?: string;
  importType?: string;
  legacyImportType?: string;
  originalFilename?: string;
  branchName?: string;
  clanName?: string;
  totalCount?: number;
  successCount?: number;
  failureCount?: number;
  errorSummary?: string;
  status?: string;
  processingStatus?: string;
  reviewStatus?: string;
  executionMode?: string;
  executionStatus?: ImportExecutionStatus;
  executionStage?: ImportExecutionStage;
  processedCount?: number;
  publishedCount?: number;
  chunkSize?: number;
  executionRetryCount?: number;
  executionMaxRetries?: number;
  manualInterventionRequired?: boolean;
  nextRetryAt?: string;
  heartbeatAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const importTaskStatusOptions: Array<{ value: ImportTaskStatusFilter; label: string }> = [
  { value: 'queued', label: '排队中' },
  { value: 'running', label: '执行中' },
  { value: 'retry_wait', label: '等待重试' },
  { value: 'paused', label: '已暂停' },
  { value: 'completed', label: '已完成' },
  { value: 'partial_completed', label: '部分成功' },
  { value: 'failed', label: '执行失败' },
  { value: 'dead_letter', label: '待人工处理' },
  { value: 'cancelled', label: '已取消' }
];

export const importTaskStatusText: Record<ImportTaskStatusFilter, string> = Object.fromEntries(
  importTaskStatusOptions.map(option => [option.value, option.label])
) as Record<ImportTaskStatusFilter, string>;

export const importTaskStageText: Record<ImportExecutionStage, string> = {
  queued: '等待执行',
  parsing: '解析文件',
  drafting: '生成草稿',
  ready_for_review: '等待提交审核',
  publishing: '正式发布',
  completed: '处理完成',
  failed: '失败处理',
  cancelled: '已取消'
};

export function normalizeImportTaskType(value?: string): ImportTypeKey | '' {
  const normalized = String(value || '').trim().toLowerCase().replace(/_(csv|xlsx)$/, '');
  return ['person', 'relationship', 'source'].includes(normalized) ? normalized as ImportTypeKey : '';
}

export function importTaskStatus(job: ImportTaskRecord): ImportTaskStatusFilter {
  const executionStatus = job.executionStatus;
  if (executionStatus === 'completed' && Number(job.failureCount || 0) > 0) return 'partial_completed';
  if (executionStatus) return executionStatus;

  const status = String(job.processingStatus || job.status || '').trim().toLowerCase();
  if (['partial_completed', 'correction_required'].includes(status)) return 'partial_completed';
  if (['processing', 'running'].includes(status)) return 'running';
  if (['ready_for_review', 'completed'].includes(status)) return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'cancelled') return 'cancelled';
  return 'queued';
}

export function importTaskStatusColor(status: ImportTaskStatusFilter) {
  if (status === 'completed') return 'success';
  if (status === 'partial_completed' || status === 'paused' || status === 'retry_wait') return 'warning';
  if (status === 'failed' || status === 'dead_letter') return 'error';
  if (status === 'queued' || status === 'running') return 'processing';
  return 'default';
}

export function importTaskNumber(job: ImportTaskRecord) {
  return job.taskNo || `IMP-${String(job.id).padStart(8, '0')}`;
}

export function importTaskStage(job: ImportTaskRecord) {
  if (job.executionStage) return importTaskStageText[job.executionStage];
  const status = importTaskStatus(job);
  if (status === 'partial_completed' || status === 'completed') return '处理完成';
  if (status === 'failed' || status === 'dead_letter') return '失败处理';
  if (status === 'cancelled') return '已取消';
  if (status === 'running') return '处理中';
  return '等待执行';
}

export function importTaskProgress(job: ImportTaskRecord) {
  const publishing = job.executionStage === 'publishing';
  const denominator = publishing ? Number(job.successCount || 0) : Number(job.totalCount || 0);
  const completed = publishing ? Number(job.publishedCount || 0) : Number(job.processedCount || 0);
  const status = importTaskStatus(job);
  if (status === 'completed' || status === 'partial_completed') return 100;
  return denominator <= 0 ? 0 : Math.min(100, Math.round(completed * 100 / denominator));
}

export function importTaskHasSideEffects(job: ImportTaskRecord) {
  return Number(job.processedCount || 0) > 0 || Number(job.publishedCount || 0) > 0;
}

export function allowedImportTaskActions(job: ImportTaskRecord): ImportExecutionAction[] {
  const cancellable = !importTaskHasSideEffects(job);
  const status = importTaskStatus(job);
  if (status === 'queued' || status === 'running' || status === 'retry_wait') return cancellable ? ['pause', 'cancel'] : ['pause'];
  if (status === 'paused') return cancellable ? ['resume', 'cancel'] : ['resume'];
  if (status === 'failed' || status === 'dead_letter') return cancellable ? ['retry', 'cancel'] : ['retry'];
  return [];
}

export function matchesImportTask(job: ImportTaskRecord, query: ImportTaskQueryState) {
  const type = normalizeImportTaskType(job.importType || job.legacyImportType);
  if (query.importTypes.length && (!type || !query.importTypes.includes(type))) return false;

  const status = importTaskStatus(job);
  if (query.statuses.length && !query.statuses.includes(status)) return false;

  const keyword = query.keyword.trim().toLowerCase();
  if (keyword) {
    const haystack = [job.originalFilename, job.taskNo, importTaskNumber(job), job.id]
      .map(value => String(value || '').toLowerCase())
      .join(' ');
    if (!haystack.includes(keyword)) return false;
  }

  if (query.createdFrom || query.createdTo) {
    const createdAt = job.createdAt ? new Date(job.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
    if (query.createdFrom && createdAt < new Date(`${query.createdFrom}T00:00:00+08:00`)) return false;
    if (query.createdTo && createdAt > new Date(`${query.createdTo}T23:59:59+08:00`)) return false;
  }

  return true;
}
