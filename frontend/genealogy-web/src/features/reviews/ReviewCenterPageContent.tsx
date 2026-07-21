import { useEffect, useMemo, useRef, useState } from 'react';
import type { Key } from 'react';
import {
  Alert, Button, Card, Col, DatePicker, Descriptions, Drawer, Empty, Form, Grid, Input,
  List, Modal, Pagination, Result, Row, Select, Space, Spin, Table, Tabs, Tag, Timeline, Typography
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { PageResponse } from '../../shared/api/client';
import { apiClient } from '../../shared/api/client';
import type {
  ReviewDiffResponse,
  ReviewTaskListItemResponse,
  ReviewTaskViewDetailResponse
} from '../../shared/api/generated/tracking-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { TrackingLinkButton } from '../../shared/navigation/TrackingLinkButton';

type Props = { notify: (data: unknown, error?: boolean) => void };
type ReviewTabKey = 'pending' | 'submitted' | 'processed';
type DecisionType = 'approve' | 'reject';
type BranchOption = { id: number | string; branchName?: string };
type DateRange = [Dayjs, Dayjs] | null;
type ReviewFilters = {
  targetType?: string;
  status?: string;
  branchId?: string;
  submittedRange: DateRange;
  processedRange: DateRange;
};
type DecisionFormValues = { decisionType: DecisionType; comment?: string };
type BatchDecision = { type: DecisionType; tasks: ReviewTaskListItemResponse[]; retry: boolean };
type BatchFailure = { task: ReviewTaskListItemResponse; reason: string; conflict: boolean };
type BatchResult = {
  type: DecisionType;
  total: number;
  successCount: number;
  failures: BatchFailure[];
  comment?: string;
};
type BatchFormValues = { comment?: string };
type ListFailure = { message: string; forbidden: boolean };

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const targetTypeOptions = [
  { value: 'import_job', label: '导入批次' },
  { value: 'person', label: '人物' },
  { value: 'relationship', label: '人物关系' },
  { value: 'source', label: '来源资料' },
  { value: 'source_binding', label: '来源绑定' },
  { value: 'branch', label: '支派' },
  { value: 'generation_scheme', label: '字辈方案' },
  { value: 'clan', label: '宗族' }
];

const statusOptions = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'cancelled', label: '已取消' }
];

const tabFilterCopy: Record<ReviewTabKey, { title: string; description: string; statusPlaceholder: string; submittedLabel: string }> = {
  pending: {
    title: '待审任务筛选',
    description: '',
    statusPlaceholder: '待我审核默认只显示待审核任务',
    submittedLabel: '提交时间'
  },
  submitted: {
    title: '我提交的筛选',
    description: '查看本人提交的审核进展，可按业务对象、状态、支派和提交时间追踪处理情况。',
    statusPlaceholder: '全部进展',
    submittedLabel: '提交时间'
  },
  processed: {
    title: '已处理筛选',
    description: '复盘本人已处理的审核记录，可按审核结果、业务对象、支派和处理时间定位记录。',
    statusPlaceholder: '全部结果',
    submittedLabel: '提交时间'
  }
};

const processedStatusOptions = statusOptions.filter(option => option.value !== 'pending');

function emptyFilters(): ReviewFilters {
  return { submittedRange: null, processedRange: null };
}

function validTab(value: string | null): ReviewTabKey {
  return value === 'submitted' || value === 'processed' ? value : 'pending';
}

function validOption(value: string | null, options: Array<{ value: string }>) {
  return value && options.some(option => option.value === value) ? value : undefined;
}

function validPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDateRange(from: string | null, to: string | null): DateRange {
  if (!from || !to) return null;
  const start = dayjs(from, 'YYYY-MM-DD', true);
  const end = dayjs(to, 'YYYY-MM-DD', true);
  return start.isValid() && end.isValid() && !start.isAfter(end) ? [start, end] : null;
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const requestedPageSize = validPositiveInt(params.get('pageSize'), DEFAULT_PAGE_SIZE);
  return {
    activeTab: validTab(params.get('reviewTab')),
    pageNo: validPositiveInt(params.get('pageNo'), 1),
    pageSize: PAGE_SIZE_OPTIONS.includes(requestedPageSize) ? requestedPageSize : DEFAULT_PAGE_SIZE,
    filters: {
      targetType: validOption(params.get('targetType'), targetTypeOptions),
      status: validOption(params.get('status'), statusOptions),
      branchId: params.get('branchId') || undefined,
      submittedRange: parseDateRange(params.get('submittedFrom'), params.get('submittedTo')),
      processedRange: parseDateRange(params.get('processedFrom'), params.get('processedTo'))
    } satisfies ReviewFilters
  };
}

function writeUrlState(activeTab: ReviewTabKey, filters: ReviewFilters, pageNo: number, pageSize: number) {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const setOrDelete = (key: string, value?: string) => value ? params.set(key, value) : params.delete(key);
  params.set('reviewTab', activeTab);
  setOrDelete('targetType', filters.targetType);
  setOrDelete('status', filters.status);
  setOrDelete('branchId', filters.branchId);
  setOrDelete('submittedFrom', filters.submittedRange?.[0].format('YYYY-MM-DD'));
  setOrDelete('submittedTo', filters.submittedRange?.[1].format('YYYY-MM-DD'));
  setOrDelete('processedFrom', filters.processedRange?.[0].format('YYYY-MM-DD'));
  setOrDelete('processedTo', filters.processedRange?.[1].format('YYYY-MM-DD'));
  if (pageNo > 1) params.set('pageNo', String(pageNo)); else params.delete('pageNo');
  if (pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(pageSize)); else params.delete('pageSize');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function rowKey(row: ReviewTaskListItemResponse) {
  return String(row.id);
}

function targetTypeText(value?: string) {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  return targetTypeOptions.find(option => option.value === normalized)?.label || '其他对象';
}

function statusText(value?: string) {
  const status = String(value || '').trim().toLowerCase();
  const dict: Record<string, string> = {
    pending: '待审核', pending_review: '待审核', reviewing: '审核中',
    approved: '已通过', passed: '已通过', rejected: '已驳回',
    cancelled: '已取消', canceled: '已取消', completed: '已完成'
  };
  return dict[status] || '未知状态';
}

function statusColor(value?: string) {
  const status = String(value || '').trim().toLowerCase();
  if (['approved', 'passed', 'completed'].includes(status)) return 'success';
  if (['rejected', 'cancelled', 'canceled'].includes(status)) return 'error';
  if (['pending', 'pending_review', 'reviewing'].includes(status)) return 'processing';
  return 'default';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined || seconds < 0) return '-';
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  if (minutes < 60) return remainSeconds ? `${minutes} 分 ${remainSeconds} 秒` : `${minutes} 分`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours < 24) return remainMinutes ? `${hours} 小时 ${remainMinutes} 分` : `${hours} 小时`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours ? `${days} 天 ${remainHours} 小时` : `${days} 天`;
}

function waitingDuration(submitTime?: string | null) {
  if (!submitTime) return '-';
  const startedAt = new Date(submitTime).getTime();
  return Number.isNaN(startedAt) ? '-' : formatDuration(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
}

function isPending(row?: ReviewTaskListItemResponse | null) {
  return String(row?.status || '').toLowerCase() === 'pending';
}

function reviewRoundText(row: ReviewTaskListItemResponse) {
  const round = row.targetSummary?.reviewRound;
  return round ? `第 ${round} 轮` : '审核记录';
}

function errorRecord(reason: unknown): Record<string, unknown> {
  return reason && typeof reason === 'object' ? reason as Record<string, unknown> : {};
}

function errorMessage(reason: unknown) {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === 'string' && reason.trim()) return reason;
  const record = errorRecord(reason);
  const response = errorRecord(record.response);
  const message = record.message || record.errorMessage || record.detail || response.message;
  return typeof message === 'string' && message.trim() ? message : '处理失败，请稍后重试';
}

function errorStatus(reason: unknown) {
  const record = errorRecord(reason);
  const response = errorRecord(record.response);
  return Number(record.status || record.statusCode || response.status);
}

function isForbiddenError(reason: unknown) {
  const record = errorRecord(reason);
  const response = errorRecord(record.response);
  const code = String(record.code || record.errorCode || response.code || '').toUpperCase();
  const message = errorMessage(reason).toLowerCase();
  return errorStatus(reason) === 403 || ['FORBIDDEN', 'ACCESS_DENIED'].includes(code) || /forbidden|无权限|拒绝访问/.test(message);
}

function isConflictError(reason: unknown) {
  const record = errorRecord(reason);
  const response = errorRecord(record.response);
  const code = String(record.code || record.errorCode || response.code || '').toUpperCase();
  const message = errorMessage(reason).toLowerCase();
  return errorStatus(reason) === 409
    || ['CONFLICT', 'REVIEW_TASK_CONFLICT', 'REVIEW_TASK_ALREADY_PROCESSED', 'STATE_CONFLICT'].includes(code)
    || /already processed|state conflict|已处理|状态冲突|重复审核/.test(message);
}

function taskTypeSummary(tasks: ReviewTaskListItemResponse[]) {
  const counts = new Map<string, number>();
  tasks.forEach(task => {
    const label = targetTypeText(task.targetType);
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

function hasFilters(filters: ReviewFilters) {
  return Boolean(filters.targetType || filters.status || filters.branchId || filters.submittedRange || filters.processedRange);
}

function filtersForTab(filters: ReviewFilters, tab: ReviewTabKey): ReviewFilters {
  if (tab === 'pending') return { ...filters, status: undefined, processedRange: null };
  if (tab === 'submitted') return { ...filters, processedRange: null };
  return { ...filters, submittedRange: null };
}

export function ReviewCenterPage({ notify }: Props) {
  const workspace = useWorkspace();
  const screens = Grid.useBreakpoint();
  const mobile = !screens.md;
  const initialState = useMemo(readUrlState, []);
  const [form] = Form.useForm<ReviewFilters>();
  const [decisionForm] = Form.useForm<DecisionFormValues>();
  const [batchForm] = Form.useForm<BatchFormValues>();
  const [activeTab, setActiveTab] = useState<ReviewTabKey>(initialState.activeTab);
  const [appliedFilters, setAppliedFilters] = useState<ReviewFilters>(() => filtersForTab(initialState.filters, initialState.activeTab));
  const [tasks, setTasks] = useState<ReviewTaskListItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNo, setPageNo] = useState(initialState.pageNo);
  const [pageSize, setPageSize] = useState(initialState.pageSize);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [listFailure, setListFailure] = useState<ListFailure>();
  const [staleFailure, setStaleFailure] = useState<string>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [processingKeys, setProcessingKeys] = useState<Key[]>([]);
  const [detail, setDetail] = useState<ReviewTaskViewDetailResponse | null>(null);
  const [reviewDiff, setReviewDiff] = useState<ReviewDiffResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailNotice, setDetailNotice] = useState<string>();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [decisionTask, setDecisionTask] = useState<ReviewTaskListItemResponse | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [batchDecision, setBatchDecision] = useState<BatchDecision | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const currentFilterCopy = tabFilterCopy[activeTab];
  const currentStatusOptions = activeTab === 'processed' ? processedStatusOptions : statusOptions;
  const requestSequence = useRef(0);

  const selectedTasks = useMemo(
    () => tasks.filter(task => selectedRowKeys.includes(rowKey(task))),
    [tasks, selectedRowKeys]
  );
  const batchTypeSummary = useMemo(() => taskTypeSummary(batchDecision?.tasks || []), [batchDecision]);

  async function loadBranches() {
    if (!workspace.clanId) {
      setBranches([]);
      return;
    }
    try {
      const data = await apiClient.get<BranchOption[]>(`/clans/${workspace.clanId}/branches`);
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      setBranches([]);
    }
  }

  async function loadTasks(nextPage = pageNo, nextPageSize = pageSize, filters = appliedFilters, tab = activeTab) {
    if (!workspace.clanId) {
      setTasks([]);
      setTotal(0);
      setSelectedRowKeys([]);
      setListFailure(undefined);
      setStaleFailure(undefined);
      setHasLoaded(false);
      return;
    }
    const requestId = ++requestSequence.current;
    const hadSuccessfulData = hasLoaded;
    setLoading(true);
    setListFailure(undefined);
    setStaleFailure(undefined);
    try {
      const params = new URLSearchParams({ view: tab, scope: 'mine', pageNo: String(nextPage), pageSize: String(nextPageSize) });
      if (filters.targetType) params.set('targetType', filters.targetType);
      if (filters.status) params.set('status', filters.status);
      if (filters.branchId) params.set('branchId', filters.branchId);
      if (filters.submittedRange) {
        params.set('submittedFrom', `${filters.submittedRange[0].format('YYYY-MM-DD')}T00:00:00`);
        params.set('submittedTo', `${filters.submittedRange[1].format('YYYY-MM-DD')}T23:59:59`);
      }
      if (filters.processedRange) {
        params.set('processedFrom', `${filters.processedRange[0].format('YYYY-MM-DD')}T00:00:00`);
        params.set('processedTo', `${filters.processedRange[1].format('YYYY-MM-DD')}T23:59:59`);
      }
      const page = await apiClient.get<PageResponse<ReviewTaskListItemResponse>>(
        `/clans/${workspace.clanId}/review-tasks/search?${params.toString()}`
      );
      if (requestId !== requestSequence.current) return;
      setTasks(page.records || []);
      setTotal(page.total || 0);
      setSelectedRowKeys([]);
      setHasLoaded(true);
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      const forbidden = isForbiddenError(error);
      const message = forbidden ? '你没有权限查看当前审核队列' : errorMessage(error);
      if (forbidden) {
        setTasks([]);
        setTotal(0);
        setSelectedRowKeys([]);
        setListFailure({ message, forbidden: true });
        setHasLoaded(false);
      } else if (hadSuccessfulData) {
        setStaleFailure(message);
      } else {
        setTasks([]);
        setTotal(0);
        setListFailure({ message, forbidden: false });
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }

  async function openDetail(taskId: number, notice?: string) {
    if (!workspace.clanId) return;
    setDetailLoading(true);
    setDetailNotice(notice);
    try {
      const [viewResult, diffResult] = await Promise.allSettled([
        apiClient.get<ReviewTaskViewDetailResponse>(`/clans/${workspace.clanId}/review-tasks/${taskId}/view`),
        apiClient.get<ReviewDiffResponse>(`/review-tasks/${taskId}/diff`)
      ]);
      if (viewResult.status === 'rejected') throw viewResult.reason;
      setDetail(viewResult.value);
      setReviewDiff(diffResult.status === 'fulfilled' ? diffResult.value : null);
    } catch (error) {
      notify({ message: errorMessage(error) || '审核详情加载失败' }, true);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => { void loadBranches(); }, [workspace.clanId]);
  useEffect(() => {
    writeUrlState(activeTab, appliedFilters, pageNo, pageSize);
    void loadTasks();
  }, [workspace.clanId, activeTab, appliedFilters, pageNo, pageSize]);
  useEffect(() => {
    const taskId = Number(workspace.reviewTaskId);
    if (workspace.clanId && Number.isFinite(taskId) && taskId > 0) void openDetail(taskId);
  }, [workspace.clanId, workspace.reviewTaskId]);

  function switchTab(key: string) {
    const nextTab = key as ReviewTabKey;
    const nextFilters = filtersForTab(form.getFieldsValue(), nextTab);
    setActiveTab(nextTab);
    setAppliedFilters(nextFilters);
    form.setFieldsValue(nextFilters);
    setPageNo(1);
    setSelectedRowKeys([]);
    setDetail(null);
    setReviewDiff(null);
    setDetailNotice(undefined);
    setHasLoaded(false);
  }

  async function applyFilters() {
    const values = await form.validateFields();
    setAppliedFilters(filtersForTab({
      targetType: values.targetType,
      status: values.status,
      branchId: values.branchId,
      submittedRange: values.submittedRange || null,
      processedRange: values.processedRange || null
    }, activeTab));
    setPageNo(1);
    setHasLoaded(false);
  }

  function resetFilters() {
    const next = emptyFilters();
    form.resetFields();
    form.setFieldsValue(next);
    setAppliedFilters(next);
    setPageNo(1);
    setHasLoaded(false);
  }

  function openDecision(row: ReviewTaskListItemResponse) {
    setDecisionTask(row);
    decisionForm.setFieldsValue({ decisionType: 'approve', comment: undefined });
  }

  async function refreshAfterConflict(taskId: number) {
    setDecisionTask(null);
    decisionForm.resetFields();
    await Promise.all([loadTasks(), openDetail(taskId, '该任务已被其他审核人处理，以下为服务端最新状态。')]);
  }

  async function submitDecision() {
    if (!decisionTask?.id) return;
    const values = await decisionForm.validateFields();
    const key = rowKey(decisionTask);
    setDecisionLoading(true);
    setProcessingKeys(previous => [...previous, key]);
    try {
      await apiClient.post(`/review-tasks/${decisionTask.id}/${values.decisionType}`, {
        comment: values.comment?.trim() || undefined
      });
      notify({ message: values.decisionType === 'approve' ? '审核已通过' : '审核已驳回' });
      setDecisionTask(null);
      decisionForm.resetFields();
      setDetail(null);
      setReviewDiff(null);
      await loadTasks();
    } catch (error) {
      if (isConflictError(error)) {
        notify({ message: '任务状态已变化，正在刷新最新审核结果' }, true);
        await refreshAfterConflict(decisionTask.id);
      } else {
        notify({ message: errorMessage(error) || '审核处理失败' }, true);
      }
    } finally {
      setDecisionLoading(false);
      setProcessingKeys(previous => previous.filter(item => item !== key));
    }
  }

  function openBatchDecision(type: DecisionType, targetTasks = selectedTasks, retry = false, comment?: string) {
    if (!targetTasks.length) return;
    batchForm.setFieldsValue({ comment: comment || undefined });
    setBatchDecision({ type, tasks: targetTasks, retry });
  }

  async function executeBatch(type: DecisionType, targetTasks: ReviewTaskListItemResponse[], comment?: string) {
    const results = await Promise.allSettled(
      targetTasks.map(task => apiClient.post(`/review-tasks/${task.id}/${type}`, { comment: comment?.trim() || undefined }))
    );
    const failures: BatchFailure[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const conflict = isConflictError(result.reason);
        failures.push({
          task: targetTasks[index],
          conflict,
          reason: conflict ? `状态冲突：${errorMessage(result.reason)}` : errorMessage(result.reason)
        });
      }
    });
    return {
      type,
      total: targetTasks.length,
      successCount: targetTasks.length - failures.length,
      failures,
      comment: comment?.trim() || undefined
    } satisfies BatchResult;
  }

  async function submitBatchDecision() {
    if (!batchDecision) return;
    const values = await batchForm.validateFields();
    setBatchLoading(true);
    try {
      const result = await executeBatch(batchDecision.type, batchDecision.tasks, values.comment);
      setBatchDecision(null);
      batchForm.resetFields();
      await loadTasks();
      setSelectedRowKeys(result.failures.map(item => rowKey(item.task)));
      if (result.failures.length) setBatchResult(result);
      else notify({ message: `已成功处理 ${result.successCount} 条审核任务` });
    } finally {
      setBatchLoading(false);
    }
  }

  function retryBatchFailures() {
    if (!batchResult?.failures.length) return;
    const failedTasks = batchResult.failures.map(item => item.task);
    const { type, comment } = batchResult;
    setBatchResult(null);
    openBatchDecision(type, failedTasks, true, comment);
  }

  const commonTitleColumn = {
    key: 'title', title: '审核事项', width: 240,
    render: (_: unknown, row: ReviewTaskListItemResponse) => (
      <Button type="link" style={{ paddingInline: 0, height: 'auto', textAlign: 'left' }} onClick={() => void openDetail(row.id)}>{row.title}</Button>
    )
  };
  const targetColumn = { key: 'targetType', title: '审核对象', width: 120, render: (_: unknown, row: ReviewTaskListItemResponse) => targetTypeText(row.targetType) };
  const statusColumn = { key: 'status', title: activeTab === 'processed' ? '处理结果' : '状态', width: 100, render: (_: unknown, row: ReviewTaskListItemResponse) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> };
  const actionColumn = {
    key: 'actions', title: '操作', width: activeTab === 'pending' ? 130 : 80, fixed: 'right' as const,
    render: (_: unknown, row: ReviewTaskListItemResponse) => (
      <Space size="small">
        <Button type="link" onClick={() => void openDetail(row.id)}>详情</Button>
        {activeTab === 'pending' && isPending(row) ? (
          <Button type="link" loading={processingKeys.includes(rowKey(row))} onClick={() => openDecision(row)}>审核</Button>
        ) : null}
      </Space>
    )
  };

  const columns = activeTab === 'pending' ? [
    commonTitleColumn,
    targetColumn,
    { key: 'branch', title: '目标支派', width: 140, render: (_: unknown, row: ReviewTaskListItemResponse) => row.branchName || '全宗族' },
    { key: 'risk', title: '风险/状态', width: 120, render: (_: unknown, row: ReviewTaskListItemResponse) => <Space size={4}><Tag>未评估</Tag><Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag></Space> },
    { key: 'submitter', title: '提交人', width: 120, render: (_: unknown, row: ReviewTaskListItemResponse) => row.submitterName || '-' },
    { key: 'submitTime', title: '提交时间', width: 175, render: (_: unknown, row: ReviewTaskListItemResponse) => formatDateTime(row.submitTime) },
    { key: 'waiting', title: '等待时长', width: 130, render: (_: unknown, row: ReviewTaskListItemResponse) => waitingDuration(row.submitTime) },
    actionColumn
  ] : activeTab === 'submitted' ? [
    commonTitleColumn,
    targetColumn,
    statusColumn,
    { key: 'reviewer', title: '当前审核人', width: 130, render: (_: unknown, row: ReviewTaskListItemResponse) => row.reviewerName || '待分配' },
    { key: 'submitTime', title: '提交时间', width: 175, render: (_: unknown, row: ReviewTaskListItemResponse) => formatDateTime(row.submitTime) },
    { key: 'progress', title: '最近进展', width: 240, ellipsis: true, render: (_: unknown, row: ReviewTaskListItemResponse) => row.reviewComment || row.diffSummary || statusText(row.status) },
    actionColumn
  ] : [
    commonTitleColumn,
    targetColumn,
    statusColumn,
    { key: 'submitter', title: '提交人', width: 120, render: (_: unknown, row: ReviewTaskListItemResponse) => row.submitterName || '-' },
    { key: 'processedAt', title: '处理时间', width: 175, render: (_: unknown, row: ReviewTaskListItemResponse) => formatDateTime(row.processedAt) },
    { key: 'duration', title: '流程耗时', width: 135, render: (_: unknown, row: ReviewTaskListItemResponse) => formatDuration(row.processingDurationSeconds) },
    actionColumn
  ];

  const currentDetail = detail?.task;
  const historyItems = [...(detail?.history || [])].reverse().map(item => ({
    color: isPending(item) ? 'blue' : statusColor(item.status) === 'success' ? 'green' : 'red',
    children: (
      <div>
        <Space wrap>
          <Typography.Text strong>{reviewRoundText(item)} · {statusText(item.status)}</Typography.Text>
          <Tag color={statusColor(item.status)}>{statusText(item.status)}</Tag>
          {item.processingDurationSeconds !== null && item.processingDurationSeconds !== undefined ? <Tag>耗时 {formatDuration(item.processingDurationSeconds)}</Tag> : null}
        </Space>
        <div><Typography.Text type="secondary">提交：{formatDateTime(item.submitTime)} · {item.submitterName || '-'}</Typography.Text></div>
        {item.processedAt ? <div><Typography.Text type="secondary">处理：{formatDateTime(item.processedAt)} · {item.reviewerName || '-'}</Typography.Text></div> : null}
        <div>{item.reviewComment || item.diffSummary || '暂无审核意见'}</div>
      </div>
    )
  }));

  function renderMobileMeta(row: ReviewTaskListItemResponse) {
    if (activeTab === 'pending') return `提交人：${row.submitterName || '-'} · ${formatDateTime(row.submitTime)} · 等待 ${waitingDuration(row.submitTime)}`;
    if (activeTab === 'submitted') return `审核人：${row.reviewerName || '待分配'} · ${row.reviewComment || row.diffSummary || statusText(row.status)}`;
    return `提交人：${row.submitterName || '-'} · ${formatDateTime(row.processedAt)} · 耗时 ${formatDuration(row.processingDurationSeconds)}`;
  }

  function renderResultContent() {
    if (!workspace.clanId) {
      return <Result status="info" title="请先选择宗族" subTitle="审核任务按宗族隔离，选择宗族后才能查看对应审核队列。" />;
    }
    if (listFailure) {
      return <Result status={listFailure.forbidden ? '403' : 'error'} title={listFailure.forbidden ? '无权访问审核队列' : '审核任务加载失败'} subTitle={listFailure.message} extra={listFailure.forbidden ? undefined : <Button type="primary" onClick={() => void loadTasks()}>重新加载</Button>} />;
    }
    if (!hasLoaded && loading) {
      return <div style={{ minHeight: 240, display: 'grid', placeItems: 'center' }}><Spin size="large" tip="正在加载审核任务" /></div>;
    }
    if (hasLoaded && tasks.length === 0) {
      const filtered = hasFilters(appliedFilters);
      return <Empty description={filtered ? '当前筛选条件下暂无审核任务' : '当前队列暂无审核任务'}>{filtered ? <Button type="primary" onClick={resetFilters}>清除筛选</Button> : null}</Empty>;
    }
    return (
      <>
        {mobile ? (
          <List
            dataSource={tasks}
            renderItem={row => (
              <List.Item style={{ paddingInline: 0 }}>
                <Card size="small" style={{ width: '100%' }}>
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                      <Button type="link" style={{ padding: 0, height: 'auto', fontWeight: 600, textAlign: 'left' }} onClick={() => void openDetail(row.id)}>{row.title}</Button>
                      <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag>
                    </Space>
                    <Typography.Text type="secondary">{targetTypeText(row.targetType)} · {row.branchName || '全宗族'}</Typography.Text>
                    <Typography.Text>{row.diffSummary || renderMobileMeta(row)}</Typography.Text>
                    <Typography.Text type="secondary">{renderMobileMeta(row)}</Typography.Text>
                    <Space wrap>
                      {activeTab === 'pending' ? (
                        <Button
                          aria-pressed={selectedRowKeys.includes(rowKey(row))}
                          onClick={() => setSelectedRowKeys(previous => previous.includes(rowKey(row)) ? previous.filter(key => key !== rowKey(row)) : [...previous, rowKey(row)])}
                          style={{ minHeight: 44 }}
                        >{selectedRowKeys.includes(rowKey(row)) ? '取消选择' : '选择'}</Button>
                      ) : null}
                      <Button style={{ minHeight: 44 }} onClick={() => void openDetail(row.id)}>查看详情</Button>
                      {activeTab === 'pending' && isPending(row) ? <Button type="primary" style={{ minHeight: 44 }} onClick={() => openDecision(row)}>审核</Button> : null}
                    </Space>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Table<ReviewTaskListItemResponse>
            size="middle"
            loading={hasLoaded && loading}
            rowKey={rowKey}
            dataSource={tasks}
            rowSelection={activeTab === 'pending' ? { selectedRowKeys, onChange: keys => setSelectedRowKeys(keys), preserveSelectedRowKeys: false } : undefined}
            pagination={false}
            columns={columns}
            scroll={{ x: 'max-content' }}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Pagination
            current={pageNo}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            showTotal={value => `共 ${value} 条`}
            onChange={(nextPage, nextPageSize) => {
              setSelectedRowKeys([]);
              setPageNo(nextPageSize === pageSize ? nextPage : 1);
              setPageSize(nextPageSize);
            }}
          />
        </div>
      </>
    );
  }

  return (
    <div className="review-center-page">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="审核中心">
          <Space direction="vertical" size={12} style={{ width: '100%' }}><Form form={form} layout="vertical" initialValues={filtersForTab(initialState.filters, initialState.activeTab)}>
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={6}><Form.Item name="targetType" label="审核对象"><Select allowClear placeholder="全部对象" options={targetTypeOptions} /></Form.Item></Col>
              {activeTab !== 'pending' ? <Col xs={24} sm={12} lg={6}><Form.Item name="status" label={activeTab === 'processed' ? '审核结果' : '审核进展'}><Select allowClear placeholder={currentFilterCopy.statusPlaceholder} options={currentStatusOptions} /></Form.Item></Col> : null}
              <Col xs={24} sm={12} lg={6}><Form.Item name="branchId" label="目标支派"><Select allowClear showSearch optionFilterProp="label" placeholder="全部支派" options={branches.map(branch => ({ value: String(branch.id), label: branch.branchName || '未命名支派' }))} /></Form.Item></Col>
              {activeTab !== 'processed' ? <Col xs={24} sm={12} lg={6}><Form.Item name="submittedRange" label={currentFilterCopy.submittedLabel}><DatePicker.RangePicker style={{ width: '100%' }} /></Form.Item></Col> : null}
              {activeTab === 'processed' ? <Col xs={24} sm={12} lg={6}><Form.Item name="processedRange" label="处理时间"><DatePicker.RangePicker style={{ width: '100%' }} /></Form.Item></Col> : null}
            </Row>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Space><Button onClick={resetFilters}>重置</Button><Button type="primary" loading={loading} onClick={() => void applyFilters()}>查询</Button></Space></div>
          </Form></Space>
        </Card>

        <Card>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
              <Tabs activeKey={activeTab} onChange={switchTab} items={[
                { key: 'pending', label: activeTab === 'pending' && hasLoaded ? `待我审核（${total}）` : '待我审核' },
                { key: 'submitted', label: activeTab === 'submitted' && hasLoaded ? `我提交的（${total}）` : '我提交的' },
                { key: 'processed', label: activeTab === 'processed' && hasLoaded ? `已处理（${total}）` : '已处理' }
              ]} />
              <Space wrap>
                {workspace.clanId && !listFailure?.forbidden ? <Button loading={loading} onClick={() => void loadTasks()}>刷新</Button> : null}
              </Space>
            </Space>
            {staleFailure ? <Alert type="warning" showIcon message="刷新失败，当前展示的是上次成功数据" description={staleFailure} action={<Button size="small" onClick={() => void loadTasks()}>重试</Button>} /> : null}
            {activeTab === 'pending' && selectedTasks.length > 0 ? (
              <Alert
                type="info"
                showIcon
                message={`已选择 ${selectedTasks.length} 条（仅当前页）`}
                action={<Space wrap><Button type="link" onClick={() => setSelectedRowKeys([])}>取消选择</Button><Button danger disabled={batchLoading} onClick={() => openBatchDecision('reject')}>批量驳回</Button><Button type="primary" disabled={batchLoading} onClick={() => openBatchDecision('approve')}>批量通过</Button></Space>}
              />
            ) : null}
            {renderResultContent()}
          </Space>
        </Card>
      </Space>

      <Drawer
        title={currentDetail ? `${currentDetail.title} · ${targetTypeText(currentDetail.targetType)}` : '审核详情'}
        width={mobile ? '100vw' : 680}
        open={Boolean(detail) || detailLoading}
        loading={detailLoading}
        onClose={() => { setDetail(null); setReviewDiff(null); setDetailNotice(undefined); workspace.setReviewTaskId(''); }}
        extra={currentDetail ? <Space><TrackingLinkButton clanId={workspace.clanId} targetType={currentDetail.targetType} targetId={currentDetail.targetId} reviewTaskId={currentDetail.id} />{isPending(currentDetail) && activeTab === 'pending' ? <Button type="primary" style={{ minHeight: mobile ? 44 : undefined }} onClick={() => openDecision(currentDetail)}>审核</Button> : null}</Space> : null}
      >
        {currentDetail ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {detailNotice ? <Alert type="warning" showIcon message={detailNotice} /> : null}
            <div><Typography.Title level={5}>审核摘要</Typography.Title><Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="审核事项">{currentDetail.title}</Descriptions.Item>
              <Descriptions.Item label="审核对象">{targetTypeText(currentDetail.targetType)}</Descriptions.Item>
              <Descriptions.Item label="目标支派">{currentDetail.branchName || '全宗族'}</Descriptions.Item>
              <Descriptions.Item label="审核状态"><Tag color={statusColor(currentDetail.status)}>{statusText(currentDetail.status)}</Tag></Descriptions.Item>
              <Descriptions.Item label="提交人">{currentDetail.submitterName || '-'}</Descriptions.Item>
              <Descriptions.Item label="审核人">{currentDetail.reviewerName || '-'}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{formatDateTime(currentDetail.submitTime)}</Descriptions.Item>
              <Descriptions.Item label="处理时间">{formatDateTime(currentDetail.processedAt)}</Descriptions.Item>
              <Descriptions.Item label="变更摘要">{currentDetail.diffSummary || '暂无摘要'}</Descriptions.Item>
            </Descriptions></div>
            <div><Typography.Title level={5}>字段变更</Typography.Title>{reviewDiff?.fields?.length ? <Table size="small" pagination={false} rowKey={row => `${row.fieldName}-${row.changeType}`} dataSource={reviewDiff.fields} columns={[{ title: '字段', dataIndex: 'fieldName', width: 140 }, { title: '变更前', dataIndex: 'beforeValue', render: value => value || '-' }, { title: '变更后', dataIndex: 'afterValue', render: value => value || '-' }]} scroll={{ x: 520 }} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前详情接口未返回字段级变更" />}</div>
            <div><Typography.Title level={5}>来源与证据</Typography.Title>{currentDetail.targetSummary?.fileName ? <Alert type="info" showIcon message={`关联材料：${currentDetail.targetSummary.fileName}`} description="可通过右上角追踪入口查看关联对象、来源绑定和完整证据链。" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前审核任务未返回可展示的来源或附件证据" />}</div>
            <div><Typography.Title level={5}>风险与冲突</Typography.Title><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前审核详情未返回风险或冲突项；最终校验以服务端提交结果为准" /></div>
            <div><Typography.Title level={5}>影响范围</Typography.Title>{currentDetail.targetSummary?.draftCount !== undefined || currentDetail.targetSummary?.excludedCount !== undefined ? <Descriptions column={1} size="small" bordered><Descriptions.Item label="目标支派">{currentDetail.branchName || '全宗族'}</Descriptions.Item><Descriptions.Item label="涉及草稿">{currentDetail.targetSummary?.draftCount ?? 0} 条</Descriptions.Item><Descriptions.Item label="排除记录">{currentDetail.targetSummary?.excludedCount ?? 0} 条</Descriptions.Item></Descriptions> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前审核详情未返回可量化的影响范围" />}</div>
            <div><Typography.Title level={5}>历史审核轮次</Typography.Title><Timeline items={historyItems} /></div>
          </Space>
        ) : null}
      </Drawer>

      <Modal title="审核决策" open={Boolean(decisionTask)} confirmLoading={decisionLoading} okText="确认提交" cancelButtonProps={{ disabled: decisionLoading }} closable={!decisionLoading} maskClosable={!decisionLoading} onOk={() => void submitDecision()} onCancel={() => { if (!decisionLoading) { setDecisionTask(null); decisionForm.resetFields(); } }} destroyOnHidden>
        {decisionTask ? <Space direction="vertical" size={16} style={{ width: '100%' }}><Alert type="info" showIcon message={decisionTask.title} description={`${targetTypeText(decisionTask.targetType)} · ${decisionTask.branchName || '全宗族'}`} /><Form form={decisionForm} layout="vertical"><Form.Item name="decisionType" label="审核结论" rules={[{ required: true, message: '请选择审核结论' }]}><Select options={[{ value: 'approve', label: '通过' }, { value: 'reject', label: '驳回' }]} /></Form.Item><Form.Item noStyle shouldUpdate={(previous, current) => previous.decisionType !== current.decisionType}>{({ getFieldValue }) => { const type = getFieldValue('decisionType') as DecisionType; return <Form.Item name="comment" label={type === 'reject' ? '驳回原因' : '审核意见'} rules={type === 'reject' ? [{ required: true, whitespace: true, message: '请填写驳回原因' }, { max: 500, message: '最多输入 500 个字符' }] : [{ max: 500, message: '最多输入 500 个字符' }]}><Input.TextArea rows={4} maxLength={500} showCount placeholder={type === 'reject' ? '说明需要补充或修正的内容' : '填写审核意见（可选）'} /></Form.Item>; }}</Form.Item></Form></Space> : null}
      </Modal>

      <Modal title={`${batchDecision?.retry ? '重试' : '批量'}${batchDecision?.type === 'reject' ? '驳回' : '通过'}审核`} open={Boolean(batchDecision)} confirmLoading={batchLoading} okText={batchDecision?.type === 'reject' ? '确认驳回' : '确认通过'} okButtonProps={{ danger: batchDecision?.type === 'reject' }} cancelButtonProps={{ disabled: batchLoading }} closable={!batchLoading} maskClosable={!batchLoading} onCancel={() => { if (!batchLoading) { setBatchDecision(null); batchForm.resetFields(); } }} onOk={() => void submitBatchDecision()} destroyOnHidden>
        {batchDecision ? <Space direction="vertical" size={16} style={{ width: '100%' }}><Alert type={batchDecision.type === 'reject' ? 'warning' : 'info'} showIcon message={`本次操作仅影响当前页选中的 ${batchDecision.tasks.length} 条任务`} description={batchDecision.type === 'reject' ? '驳回后任务将退回提交人处理，请填写明确、可执行的驳回原因。' : '通过后相关变更将按服务端审核流程生效，请确认已完成必要核验。'} /><Descriptions size="small" column={1} bordered><Descriptions.Item label="选中数量">{batchDecision.tasks.length} 条</Descriptions.Item><Descriptions.Item label="对象类型"><Space wrap>{batchTypeSummary.map(item => <Tag key={item.label}>{item.label} {item.count}</Tag>)}</Space></Descriptions.Item></Descriptions><Form form={batchForm} layout="vertical"><Form.Item name="comment" label={batchDecision.type === 'reject' ? '驳回原因' : '审核意见'} rules={batchDecision.type === 'reject' ? [{ required: true, whitespace: true, message: '请填写驳回原因' }, { max: 500, message: '最多输入 500 个字符' }] : [{ max: 500, message: '最多输入 500 个字符' }]}><Input.TextArea rows={4} maxLength={500} showCount placeholder={batchDecision.type === 'reject' ? '说明需要补充或修正的内容' : '填写统一审核意见（可选）'} /></Form.Item></Form></Space> : null}
      </Modal>

      <Modal title="批量审核结果" open={Boolean(batchResult)} width={720} destroyOnHidden footer={batchResult?.failures.length ? <Space><Button onClick={() => setBatchResult(null)}>关闭</Button><Button type="primary" onClick={retryBatchFailures}>仅重试失败项</Button></Space> : null} onCancel={() => setBatchResult(null)}>
        {batchResult ? <Space direction="vertical" size={16} style={{ width: '100%' }}><Result status="warning" title={`成功 ${batchResult.successCount} 条，失败 ${batchResult.failures.length} 条`} subTitle={`本次共处理 ${batchResult.total} 条任务；当前筛选和分页保持不变。`} /><List bordered header={<Typography.Text strong>失败任务</Typography.Text>} dataSource={batchResult.failures} renderItem={item => <List.Item><List.Item.Meta title={<Space>{item.task.title}{item.conflict ? <Tag color="warning">状态冲突</Tag> : null}</Space>} description={`${targetTypeText(item.task.targetType)} · ${item.reason}`} /></List.Item>} /></Space> : null}
      </Modal>
    </div>
  );
}
