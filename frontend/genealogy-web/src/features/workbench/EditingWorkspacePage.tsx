import {
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import type { Key } from 'react';
import dayjs from 'dayjs';
import { ExportOutlined,
  PlusOutlined,
  SettingOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Grid,
  Input,
  Modal,
  Pagination,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Timeline,
  Typography
} from 'antd';
import type { MenuProps } from 'antd';
import { ApiRequestError, apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/utils/records';
import {
  EMPTY_FILTERS, filterLabels, readWorkbenchUrlState,
  summarizeBulkResults, workbenchEmptyState, workbenchTotalText, writeWorkbenchUrlState
} from './editingWorkspaceModel';
import type { WorkbenchFilters, WorkbenchUrlState } from './editingWorkspaceModel';
import { QueryResultCard } from '../../shared/ui/QueryResultCards';

import { feedback } from '../../shared/ui/OperationFeedback';

import { PageFeedback } from '../../shared/ui/Feedback';

type WorkbenchRisk = 'high' | 'medium' | 'low';
type WorkbenchStatus = 'pending' | 'processing' | 'ready' | 'blocked';
type WorkbenchTaskType = 'review_follow_up' | 'missing_source' | 'generation_mismatch' | 'relationship_check' | 'import_follow_up';
type WorkbenchNavigateKey = 'reviewCenter' | 'personArchive' | 'sourceLibrary' | 'treeProduct' | 'mvp1Wizard';
type Props = { onNavigate?: (view: WorkbenchNavigateKey) => void;  };
type ClanLike = { id?: number | string; clanName?: string; name?: string; surname?: string };
type WorkbenchTask = {
  key: string; taskName?: string; bookName?: string; creatorName?: string; createdAt?: string;
  type: WorkbenchTaskType; typeText: string; objectName: string; branchName: string;
  risk: WorkbenchRisk; status: WorkbenchStatus; statusText: string; suggestion: string;
  problemDescription?: string; involvedObject?: string; riskReason?: string; reviewBlocked?: boolean;
  relatedEntryType?: string; relatedEntryId?: string; relatedEntryText?: string;
  statusDescription?: string; updatedAt?: string;
};
type WorkbenchTaskPage = { records?: WorkbenchTask[]; total?: number; pageNo?: number; pageSize?: number; totalPages?: number };
type WorkbenchHistoryItem = { id?: string | number; operatorName?: string; actionText?: string; comment?: string; resultText?: string; createdAt?: string };
type WorkbenchActionResponse = { task?: WorkbenchTask; message?: string };
type BulkFailure = { key: string; objectName: string; reason: string };
type MultiFilterKey = 'taskTypes' | 'risks' | 'statuses';

const PAGE_SIZE = 10;
const EXPORT_PAGE_SIZE = 200;
const ALL_VALUE = '__all__';
const EMPTY_TASK_PAGE: WorkbenchTaskPage = { records: [], pageNo: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 };
const taskTypeOptions = [
  { value: 'review_follow_up', label: '审核跟进' },
  { value: 'missing_source', label: '来源证据缺失' },
  { value: 'generation_mismatch', label: '字辈/代次待补' },
  { value: 'relationship_check', label: '关系复核建议' },
  { value: 'import_follow_up', label: '导入异常' }
];
const statusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'ready', label: '待确认' },
  { value: 'blocked', label: '已阻塞' }
];
const riskOptions = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
];
const creatorOptions = [
  { value: '', label: '全部创建人' },
  { value: 'system_rule', label: '系统规则' },
  { value: 'review_flow', label: '审核流程' }
];
const templateRows = [
  { key: 'generation_mismatch', name: '字辈与代次补全', type: '字辈/代次待补', priority: '中', trigger: '人物缺少字辈或代次时自动生成' },
  { key: 'missing_source', name: '来源证据补充', type: '来源证据缺失', priority: '高', trigger: '已有入谱人物但未维护来源资料时自动生成' },
  { key: 'relationship_check', name: '人物关系复核', type: '关系复核建议', priority: '低', trigger: '宗族内存在多个人物档案时提供复核建议' },
  { key: 'review_follow_up', name: '审核任务跟进', type: '审核跟进', priority: '中', trigger: '审核任务进入待处理流程时自动生成' }
];

function clanLabel(clan?: ClanLike) { return clan?.clanName || clan?.name || clan?.surname || '未命名宗族'; }
function bookLabel(clan?: ClanLike) { const name = clanLabel(clan); return name.endsWith('族谱') ? name : `${name}族谱`; }
function riskColor(value: WorkbenchRisk) { return value === 'high' ? 'error' : value === 'medium' ? 'warning' : 'success'; }
function riskText(value: WorkbenchRisk) { return value === 'high' ? '高' : value === 'medium' ? '中' : '低'; }
function statusColor(value: WorkbenchStatus) { return value === 'ready' ? 'success' : value === 'processing' ? 'processing' : value === 'blocked' ? 'error' : 'default'; }
function unwrapData<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) return ((payload as any).data ?? fallback) as T;
  return (payload ?? fallback) as T;
}
function relatedViewOf(type?: string): WorkbenchNavigateKey | undefined {
  if (type === 'reviewCenter' || type === 'personArchive' || type === 'sourceLibrary' || type === 'treeProduct' || type === 'mvp1Wizard') return type;
  return undefined;
}
function display(value: unknown, fallback = '待维护') { const text = String(value ?? '').trim(); return text || fallback; }
function taskTitle(task?: WorkbenchTask | null) { return task ? display(task.taskName, `${task.typeText}：${display(task.objectName)}`) : '修谱任务'; }
function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}
function errorMessage(error: unknown, fallback: string) { return error instanceof Error && error.message ? error.message : fallback; }
function actionLabel(task?: WorkbenchTask | null) {
  if (!task) return '完成处理';
  if (task.type === 'missing_source') return '确认来源已补充';
  if (task.type === 'generation_mismatch') return '确认代次已校验';
  if (task.type === 'relationship_check') return '确认关系已复核';
  if (task.type === 'review_follow_up') return '确认审核意见已处理';
  return '确认导入异常已处理';
}
function actionCode(task: WorkbenchTask) {
  if (task.type === 'missing_source') return 'confirm_source_completed';
  if (task.type === 'generation_mismatch') return 'confirm_generation_checked';
  if (task.type === 'relationship_check') return 'confirm_relationship_checked';
  if (task.type === 'review_follow_up') return 'confirm_review_followed_up';
  return 'confirm_import_followed_up';
}
function optionsWithAll(options: Array<{ value: string; label: string }>) { return [{ value: ALL_VALUE, label: '全选 / 取消全选' }, ...options]; }
function csvCell(value: unknown) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
function downloadCsv(rows: WorkbenchTask[]) {
  const headers = ['任务名称', '谱书名称', '任务类型', '任务状态', '优先级', '创建人', '创建时间'];
  const lines = rows.map(task => [
    taskTitle(task), display(task.bookName, '-'), display(task.typeText, '-'), display(task.statusText, '-'),
    riskText(task.risk), display(task.creatorName, '-'), formatDateTime(task.createdAt)
  ].map(csvCell).join(','));
  const blob = new Blob([`\uFEFF${[headers.map(csvCell).join(','), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'workbench-tasks.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function EditingWorkspacePage({ onNavigate }: Props) {
  const workspace = useWorkspace();
  const screens = Grid.useBreakpoint();
  const initialUrlState = useMemo(() => readWorkbenchUrlState(window.location.search), []);
  const initialFilters = useMemo<WorkbenchFilters>(() => ({
    taskName: initialUrlState.taskName,
    keyword: initialUrlState.keyword,
    taskTypes: initialUrlState.taskTypes,
    risks: initialUrlState.risks,
    statuses: initialUrlState.statuses,
    creator: initialUrlState.creator,
    createdFrom: initialUrlState.createdFrom,
    createdTo: initialUrlState.createdTo
  }), [initialUrlState]);
  const requestVersionRef = useRef(0);
  const desiredTaskIdRef = useRef(initialUrlState.taskId);
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [filters, setFilters] = useState<WorkbenchFilters>(initialFilters);
  const [advancedOpen, setAdvancedOpen] = useState(() => Boolean(
    initialFilters.taskTypes.length || initialFilters.risks.length || initialFilters.statuses.length
    || initialFilters.creator || initialFilters.createdFrom || initialFilters.createdTo
  ));
  const [taskPage, setTaskPage] = useState<WorkbenchTaskPage>({ ...EMPTY_TASK_PAGE, pageNo: initialUrlState.page });
  const [selectedTask, setSelectedTask] = useState<WorkbenchTask | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [history, setHistory] = useState<WorkbenchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkFailures, setBulkFailures] = useState<BulkFailure[]>([]);

  const activeClan = clans.find(item => String(item.id || '') === workspace.clanId) || clans[0];
  const tasks = useMemo(() => toRecordList<WorkbenchTask>(taskPage.records || []), [taskPage.records]);
  const selectedTasks = useMemo(() => tasks.filter(task => selectedKeys.includes(task.key)), [tasks, selectedKeys]);
  const relatedView = relatedViewOf(selectedTask?.relatedEntryType);
  const currentClanId = workspace.clanId || String(activeClan?.id || '');
  const total = Number(taskPage.total || 0);

  function patchFilter<K extends keyof WorkbenchFilters>(key: K, value: WorkbenchFilters[K]) {
    setFilters(previous => ({ ...previous, [key]: value }));
  }
  function patchMulti(key: MultiFilterKey, values: string[], allValues: string[]) {
    if (values.includes(ALL_VALUE)) {
      patchFilter(key, (filters[key].length === allValues.length ? [] : allValues) as WorkbenchFilters[typeof key]);
      return;
    }
    patchFilter(key, values as WorkbenchFilters[typeof key]);
  }
  function replaceUrl(patch: Partial<WorkbenchUrlState>) {
    window.history.replaceState(window.history.state, '', writeWorkbenchUrlState(window.location.href, patch));
  }
  function syncQueryUrl(clanId: string, page: number, nextFilters: WorkbenchFilters, taskId = '') {
    replaceUrl({ clanId, ...nextFilters, page, taskId });
  }
  function openTask(task: WorkbenchTask) { desiredTaskIdRef.current = task.key; setSelectedTask(task); replaceUrl({ taskId: task.key }); }
  function closeTask() { desiredTaskIdRef.current = ''; setSelectedTask(null); setHistory([]); setHistoryError(''); replaceUrl({ taskId: '' }); }
  function restoreTaskFromPage(nextTaskPage: WorkbenchTaskPage) {
    const taskId = desiredTaskIdRef.current;
    if (!taskId) return;
    const task = toRecordList<WorkbenchTask>(nextTaskPage.records || []).find(item => item.key === taskId);
    if (task) setSelectedTask(task);
    else {
      desiredTaskIdRef.current = '';
      setSelectedTask(null);
      replaceUrl({ taskId: '' });
      feedback.info('原任务已处理完成、已移出当前筛选范围，或任务标识已失效。');
    }
  }
  async function loadClans() {
    try {
      const clanRows = toRecordList<ClanLike>(unwrapData(await apiClient.get('/clans'), []));
      setClans(clanRows);
      const urlClanExists = clanRows.some(item => String(item.id || '') === initialUrlState.clanId);
      const workspaceClanExists = clanRows.some(item => String(item.id || '') === workspace.clanId);
      const nextClanId = urlClanExists ? initialUrlState.clanId : workspaceClanExists ? workspace.clanId : String(clanRows[0]?.id || '');
      if (nextClanId && nextClanId !== workspace.clanId) workspace.setClanId(nextClanId);
      replaceUrl({ clanId: nextClanId });
      return nextClanId;
    } catch (error) {
      feedback.error(errorMessage(error, '加载宗族列表失败'));
      return '';
    }
  }
  function buildTaskQuery(clanId: string, pageNo: number, nextFilters: WorkbenchFilters, pageSize = PAGE_SIZE) {
    const query = new URLSearchParams({ clanId, pageNo: String(pageNo), pageSize: String(pageSize) });
    if (nextFilters.taskName.trim()) query.set('taskName', nextFilters.taskName.trim());
    if (nextFilters.keyword.trim()) query.set('keyword', nextFilters.keyword.trim());
    nextFilters.taskTypes.forEach(value => query.append('type', value));
    nextFilters.statuses.forEach(value => query.append('status', value));
    nextFilters.risks.forEach(value => query.append('risk', value));
    if (nextFilters.creator) query.set('creator', nextFilters.creator);
    if (nextFilters.createdFrom) query.set('createdFrom', nextFilters.createdFrom);
    if (nextFilters.createdTo) query.set('createdTo', nextFilters.createdTo);
    return query;
  }
  async function loadWorkbench(sourceClanId = currentClanId, nextPage = 1, nextFilters: WorkbenchFilters = filters) {
    const version = ++requestVersionRef.current;
    const nextClanId = sourceClanId || await loadClans();
    if (!nextClanId) { setTaskPage(EMPTY_TASK_PAGE); setSelectedKeys([]); return undefined; }
    setTaskLoading(true);
    setTaskError('');
    try {
      const taskResult = await apiClient.get(`/workbench/tasks?${buildTaskQuery(nextClanId, nextPage, nextFilters).toString()}`);
      if (version !== requestVersionRef.current) return undefined;
      const nextTaskPage = unwrapData<WorkbenchTaskPage>(taskResult, { ...EMPTY_TASK_PAGE, pageNo: nextPage });
      setTaskPage(nextTaskPage);
      setSelectedKeys([]);
      restoreTaskFromPage(nextTaskPage);
      return nextTaskPage;
    } catch (error) {
      if (version === requestVersionRef.current) setTaskError(errorMessage(error, '加载修谱任务失败'));
      return undefined;
    } finally {
      if (version === requestVersionRef.current) setTaskLoading(false);
    }
  }
  async function loadHistory(taskKey: string) {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      setHistory(toRecordList<WorkbenchHistoryItem>(unwrapData(await apiClient.get(`/workbench/tasks/${encodeURIComponent(taskKey)}/history`), [])));
    } catch (error) {
      setHistory([]);
      setHistoryError(errorMessage(error, '加载处理记录失败'));
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => { void loadClans().then(clanId => loadWorkbench(clanId, initialUrlState.page, initialFilters)); }, []);
  useEffect(() => { if (selectedTask?.key) void loadHistory(selectedTask.key); }, [selectedTask?.key]);

  function applyState(nextClanId: string, pageNo: number, nextFilters: WorkbenchFilters, taskId = '') {
    setFilters(nextFilters);
    setSelectedKeys([]);
    desiredTaskIdRef.current = taskId;
    if (!taskId) setSelectedTask(null);
    syncQueryUrl(nextClanId, pageNo, nextFilters, taskId);
    void loadWorkbench(nextClanId, pageNo, nextFilters);
  }
  function changeClan(nextClanId: string) {
    workspace.setClanId(nextClanId);
    setTaskPage(EMPTY_TASK_PAGE);
    setAdvancedOpen(false);
    applyState(nextClanId, 1, { ...EMPTY_FILTERS });
  }
  function searchWorkbench() {
    applyState(currentClanId, 1, { ...filters, taskName: filters.taskName.trim(), keyword: filters.keyword.trim() });
  }
  function resetFilters() {
    setAdvancedOpen(false);
    applyState(currentClanId, 1, { ...EMPTY_FILTERS });
  }
  function changePage(page: number) {
    syncQueryUrl(currentClanId, page, filters, '');
    desiredTaskIdRef.current = '';
    setSelectedTask(null);
    setSelectedKeys([]);
    void loadWorkbench(currentClanId, page, filters);
  }
  function startNewTask() {
    if (currentClanId && onNavigate) onNavigate('mvp1Wizard');
  }
  async function exportTasks() {
    if (!currentClanId || exporting || total === 0) return;
    setExporting(true);
    try {
      const payload = await apiClient.get(`/workbench/tasks?${buildTaskQuery(currentClanId, 1, filters, EXPORT_PAGE_SIZE).toString()}`);
      const page = unwrapData<WorkbenchTaskPage>(payload, EMPTY_TASK_PAGE);
      const rows = toRecordList<WorkbenchTask>(page.records || []);
      downloadCsv(rows);
      feedback.from({ message: `已导出当前查询条件下的 ${rows.length} 条修谱任务。` });
    } catch (error) {
      const text = errorMessage(error, '导出任务失败，请稍后重试。');
      feedback.from({ message: text }, true);
    } finally {
      setExporting(false);
    }
  }
  async function refreshTaskStatus() {
    const task = selectedTask;
    const nextTaskPage = await loadWorkbench(currentClanId, taskPage.pageNo || 1, filters);
    if (!task || !nextTaskPage) return;
    const nextTask = toRecordList<WorkbenchTask>(nextTaskPage.records || []).find(item => item.key === task.key);
    if (nextTask) { openTask(nextTask); feedback.success('任务状态已刷新'); }
  }
  function applyRelatedContext(task: WorkbenchTask) {
    const id = task.relatedEntryId || '';
    if (task.relatedEntryType === 'reviewCenter') workspace.patch({ reviewTaskId: id, personId: '', sourceId: '', sourceFocusReason: '' });
    else if (task.relatedEntryType === 'personArchive' || task.relatedEntryType === 'treeProduct') workspace.patch({ personId: id, reviewTaskId: '', sourceId: '', sourceFocusReason: '' });
    else if (task.relatedEntryType === 'sourceLibrary') workspace.patch({ sourceId: id, sourceFocusReason: task.type, reviewTaskId: '', personId: '' });
  }
  function goRelatedEntry(task = selectedTask) {
    if (!task || !onNavigate) return;
    const view = relatedViewOf(task.relatedEntryType);
    if (!view) { openTask(task); return; }
    applyRelatedContext(task);
    replaceUrl({ taskId: task.key });
    onNavigate(view);
  }
  async function submitTaskAction() {
    const task = selectedTask;
    if (!task) return;
    setActionLoading(true);
    try {
      const result = unwrapData<WorkbenchActionResponse>(await apiClient.post(`/workbench/tasks/${encodeURIComponent(task.key)}/actions`, {
        action: actionCode(task), comment: actionComment.trim(), expectedUpdatedAt: task.updatedAt || null
      }), {});
      feedback.success(result.message || '任务处理完成');
      setActionModalOpen(false);
      setActionComment('');
      const nextTaskPage = await loadWorkbench(currentClanId, taskPage.pageNo || 1, filters);
      if (!nextTaskPage) return;
      const nextTask = toRecordList<WorkbenchTask>(nextTaskPage.records || []).find(item => item.key !== task.key) || result.task;
      if (nextTask) openTask(nextTask);
      else closeTask();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        feedback.warning('任务已被其他成员处理或状态已变化，已为你刷新最新状态。');
        await refreshTaskStatus();
      } else feedback.error(errorMessage(error, '任务处理失败，请保留当前现场后重试'));
    } finally {
      setActionLoading(false);
    }
  }
  async function submitBulkCheck() {
    if (!selectedTasks.length || bulkLoading) return;
    setBulkLoading(true);
    setBulkFailures([]);
    const results = await Promise.allSettled(selectedTasks.map(task => apiClient.post(`/workbench/tasks/${encodeURIComponent(task.key)}/actions`, {
      action: 'mark_checked', comment: '批量标记已核查', expectedUpdatedAt: task.updatedAt || null
    })));
    const resultSummary = summarizeBulkResults(results);
    setBulkFailures(results.flatMap((result, index) => result.status === 'rejected'
      ? [{ key: selectedTasks[index].key, objectName: taskTitle(selectedTasks[index]), reason: errorMessage(result.reason, '处理失败') }]
      : []));
    feedback[resultSummary.failed ? 'warning' : 'success'](`批量处理完成：成功 ${resultSummary.succeeded} 项，失败 ${resultSummary.failed} 项`);
    setBulkModalOpen(false);
    setSelectedKeys([]);
    await loadWorkbench(currentClanId, taskPage.pageNo || 1, filters);
    setBulkLoading(false);
  }
  async function copyTaskKey(task: WorkbenchTask) {
    try { await navigator.clipboard.writeText(task.key); feedback.success('任务编号已复制'); }
    catch { feedback.info(`任务编号：${task.key}`); }
  }
  function moreMenu(task: WorkbenchTask): MenuProps {
    return {
      items: [{ key: 'handle', label: actionLabel(task) }, { key: 'copy', label: '复制任务编号' }],
      onClick: info => {
        info.domEvent.stopPropagation();
        if (info.key === 'handle') { openTask(task); setActionModalOpen(true); }
        else void copyTaskKey(task);
      }
    };
  }

  const hasFilters = filterLabels(filters).length > 0;
  const emptyState = workbenchEmptyState({ hasClan: Boolean(currentClanId), loading: taskLoading, error: Boolean(taskError), hasFilters, count: tasks.length });
  const emptyNode = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyState.description}>
    {emptyState.action === 'clear' ? <Button onClick={resetFilters}>清除筛选</Button>
      : emptyState.action === 'retry' ? <Button onClick={() => void loadWorkbench(currentClanId, taskPage.pageNo || 1, filters)}>重试</Button> : null}
  </Empty>;
  const resultActions = <Space wrap>
    <Button type="primary" icon={<PlusOutlined />} disabled={!currentClanId || !onNavigate} onClick={startNewTask}>新建任务</Button>
    <Button icon={<ExportOutlined />} loading={exporting} disabled={!currentClanId || total === 0 || taskLoading} onClick={() => void exportTasks()}>导出任务</Button>
    <Button icon={<SettingOutlined />} onClick={() => setTemplateModalOpen(true)}>任务模板管理</Button>
  </Space>;

  return <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    <Card title="修谱工作台">
      <Form layout="vertical" onFinish={searchWorkbench}>
        <Row gutter={[16, 0]} align="bottom">
          <Col xs={24} sm={12} xl={6}><Form.Item label="宗族"><Select showSearch optionFilterProp="label" value={currentClanId} onChange={changeClan} options={clans.map(clan => ({ value: String(clan.id || ''), label: clanLabel(clan) }))} placeholder="请选择宗族" /></Form.Item></Col>
          <Col xs={24} sm={12} xl={6}><Form.Item label="谱书"><Select value={currentClanId || undefined} disabled={!currentClanId} options={currentClanId ? [{ value: currentClanId, label: bookLabel(activeClan) }] : []} placeholder="请选择谱书" /></Form.Item></Col>
          <Col xs={24} sm={12} xl={6}><Form.Item label="任务名称"><Input value={filters.taskName} onChange={event => patchFilter('taskName', event.target.value)} placeholder="请输入任务名称" allowClear /></Form.Item></Col>
          <Col xs={24} sm={12} xl={6}><Form.Item label="关键词"><Input value={filters.keyword} onChange={event => patchFilter('keyword', event.target.value)} placeholder="任务描述、涉及对象或所属范围" allowClear /></Form.Item></Col>
        </Row>
        <Collapse
          ghost
          activeKey={advancedOpen ? ['advanced'] : []}
          items={[{
            key: 'advanced',
            showArrow: false,
            collapsible: 'disabled',
            label: null,
            styles: { header: { display: 'none' }, body: { padding: 0 } },
            children: <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} xl={4}><Form.Item label="任务状态"><Select mode="multiple" maxTagCount="responsive" value={filters.statuses} onChange={values => patchMulti('statuses', values, statusOptions.map(item => item.value))} options={optionsWithAll(statusOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="任务类型"><Select mode="multiple" showSearch optionFilterProp="label" maxTagCount="responsive" value={filters.taskTypes} onChange={values => patchMulti('taskTypes', values, taskTypeOptions.map(item => item.value))} options={optionsWithAll(taskTypeOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="优先级"><Select mode="multiple" maxTagCount="responsive" value={filters.risks} onChange={values => patchMulti('risks', values, riskOptions.map(item => item.value))} options={optionsWithAll(riskOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="创建人"><Select showSearch optionFilterProp="label" value={filters.creator} onChange={value => patchFilter('creator', value)} options={creatorOptions} placeholder="请输入或选择" /></Form.Item></Col>
              <Col xs={24} xl={8}><Form.Item label="创建时间"><DatePicker.RangePicker style={{ width: '100%' }} value={filters.createdFrom || filters.createdTo ? [filters.createdFrom ? dayjs(filters.createdFrom) : null, filters.createdTo ? dayjs(filters.createdTo) : null] : null} onChange={values => setFilters(previous => ({ ...previous, createdFrom: values?.[0]?.format('YYYY-MM-DD') || '', createdTo: values?.[1]?.format('YYYY-MM-DD') || '' }))} /></Form.Item></Col>
            </Row>
          }]}
        />
        <Row justify={screens.xl ? 'end' : 'start'} style={{ marginTop: 8 }}>
          <Space wrap>
            <Button type="link" onClick={() => setAdvancedOpen(previous => !previous)}>{advancedOpen ? '收起筛选' : '更多筛选'}</Button>
            <Button onClick={resetFilters}>重置</Button>
            <Button type="primary" htmlType="submit" loading={taskLoading} disabled={!currentClanId}>查询</Button>
          </Space>
        </Row>
      </Form>
    </Card>

    <QueryResultCard className="workbench-result-card" extra={resultActions} total={total}>
      
      {selectedKeys.length ? <PageFeedback tone="info" title={`已选择 ${selectedKeys.length} 项`} description="选择范围仅限当前页；批量操作完成后保留当前筛选和分页。" action={<Space wrap><Button onClick={() => setSelectedKeys([])}>取消选择</Button><Button type="primary" loading={bulkLoading} onClick={() => setBulkModalOpen(true)}>批量标记已核查</Button></Space>} style={{ marginBottom: 16 }} /> : null}
      {bulkFailures.length ? <PageFeedback tone="warning" closable onClose={() => setBulkFailures([])} title={`上次批量处理有 ${bulkFailures.length} 项失败`} description={<Space direction="vertical" size={2}>{bulkFailures.map(item => <Typography.Text key={item.key}>{item.objectName}：{item.reason}</Typography.Text>)}</Space>} style={{ marginBottom: 16 }} /> : null}
      {taskError ? <PageFeedback tone="error" title="任务列表加载失败" description={taskError} action={<Button size="small" onClick={() => void loadWorkbench(currentClanId, taskPage.pageNo || 1, filters)}>重试</Button>} style={{ marginBottom: 16 }} /> : null}
      {screens.md ? <Table<WorkbenchTask>
        size="middle"
        loading={taskLoading}
        rowKey="key"
        dataSource={tasks}
        rowSelection={{ selectedRowKeys: selectedKeys, preserveSelectedRowKeys: false, onChange: keys => setSelectedKeys(keys) }}
        pagination={{ current: taskPage.pageNo || 1, pageSize: PAGE_SIZE, total, showSizeChanger: false, showTotal: workbenchTotalText, onChange: changePage }}
        locale={{ emptyText: emptyNode }}
        onRow={row => ({ role: 'button', tabIndex: 0, 'aria-label': `打开任务：${taskTitle(row)}`, onClick: () => openTask(row), onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTask(row); } }, style: { cursor: 'pointer', background: selectedTask?.key === row.key ? '#f0f7ff' : undefined } })}
        columns={[
          { key: 'taskName', title: '任务名称', width: 220, render: (_value, row) => <Button type="link" style={{ padding: 0 }} onClick={event => { event.stopPropagation(); openTask(row); }}>{taskTitle(row)}</Button> },
          { key: 'bookName', title: '谱书名称', width: 180, ellipsis: true, render: (_value, row) => display(row.bookName, bookLabel(activeClan)) },
          { key: 'type', title: '任务类型', width: 150, render: (_value, row) => display(row.typeText, '-') },
          { key: 'status', title: '任务状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.status)}>{display(row.statusText, '状态未知')}</Tag> },
          { key: 'risk', title: '优先级', width: 90, render: (_value, row) => <Tag color={riskColor(row.risk)}>{riskText(row.risk)}</Tag> },
          { key: 'creator', title: '创建人', width: 120, render: (_value, row) => display(row.creatorName, '-') },
          { key: 'createdAt', title: '创建时间', width: 170, render: (_value, row) => formatDateTime(row.createdAt) },
          { key: 'actions', title: '操作', width: 180, fixed: 'right', render: (_value, row) => <Space size={4} onClick={event => event.stopPropagation()}><Button type="link" onClick={() => openTask(row)}>查看</Button><Button type="link" disabled={!relatedViewOf(row.relatedEntryType) || !onNavigate} onClick={() => goRelatedEntry(row)}>编辑</Button><Dropdown menu={moreMenu(row)} trigger={['click']}><Button type="link">更多</Button></Dropdown></Space> }
        ]}
        scroll={{ x: 1230 }}
      /> : <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {taskLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
        {!taskLoading && tasks.map(task => <Card key={task.key} role="button" tabIndex={0} aria-label={`打开任务：${taskTitle(task)}`} onClick={() => openTask(task)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTask(task); } }} style={{ borderColor: selectedTask?.key === task.key ? '#1677ff' : undefined }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Row justify="space-between" align="top" wrap={false}><Space direction="vertical" size={2}><Typography.Text strong>{taskTitle(task)}</Typography.Text><Typography.Text type="secondary">{display(task.bookName, bookLabel(activeClan))}</Typography.Text></Space><Checkbox checked={selectedKeys.includes(task.key)} aria-label={`选择任务：${taskTitle(task)}`} onClick={event => event.stopPropagation()} onChange={event => setSelectedKeys(keys => event.target.checked ? [...keys, task.key] : keys.filter(key => key !== task.key))} /></Row>
            <Space wrap><Tag>{display(task.typeText, '-')}</Tag><Tag color={statusColor(task.status)}>{display(task.statusText, '状态未知')}</Tag><Tag color={riskColor(task.risk)}>{riskText(task.risk)}</Tag></Space>
            <Typography.Text>创建人：{display(task.creatorName, '-')}</Typography.Text>
            <Typography.Text type="secondary">创建时间：{formatDateTime(task.createdAt)}</Typography.Text>
            <Space><Button onClick={event => { event.stopPropagation(); openTask(task); }}>查看</Button><Button disabled={!relatedViewOf(task.relatedEntryType) || !onNavigate} onClick={event => { event.stopPropagation(); goRelatedEntry(task); }}>编辑</Button><Dropdown menu={moreMenu(task)} trigger={['click']}><Button onClick={event => event.stopPropagation()}>更多</Button></Dropdown></Space>
          </Space>
        </Card>)}
        {!taskLoading && !tasks.length ? emptyNode : null}
        {!taskLoading && total > PAGE_SIZE ? <Row justify="center"><Pagination current={taskPage.pageNo || 1} pageSize={PAGE_SIZE} total={total} showSizeChanger={false} showTotal={workbenchTotalText} onChange={changePage} size="small" /></Row> : null}
      </Space>}
      
    </QueryResultCard>

    <Drawer title={selectedTask ? <Space direction="vertical" size={6}><Typography.Text strong>{taskTitle(selectedTask)}</Typography.Text><Space wrap size={4}><Tag>{display(selectedTask.typeText, '-')}</Tag><Tag color={riskColor(selectedTask.risk)}>{riskText(selectedTask.risk)}</Tag><Tag color={statusColor(selectedTask.status)}>{display(selectedTask.statusText, '状态未知')}</Tag></Space></Space> : '修谱任务详情'} width={screens.md ? 720 : '100%'} open={Boolean(selectedTask)} onClose={closeTask} extra={selectedTask ? <Space wrap><Button loading={taskLoading} onClick={() => void refreshTaskStatus()}>刷新状态</Button><Button disabled={!relatedView || !onNavigate} onClick={() => goRelatedEntry()}>{selectedTask.relatedEntryText || '前往相关页面'}</Button><Button type="primary" onClick={() => setActionModalOpen(true)}>{actionLabel(selectedTask)}</Button></Space> : null}>
      {selectedTask ? <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <PageFeedback tone={selectedTask.reviewBlocked ? 'warning' : 'info'} title="问题描述" description={display(selectedTask.problemDescription, selectedTask.suggestion)} />
        <Card size="small" title="任务信息"><Descriptions column={1} size="small"><Descriptions.Item label="谱书名称">{display(selectedTask.bookName, bookLabel(activeClan))}</Descriptions.Item><Descriptions.Item label="创建人">{display(selectedTask.creatorName, '-')}</Descriptions.Item><Descriptions.Item label="创建时间">{formatDateTime(selectedTask.createdAt)}</Descriptions.Item><Descriptions.Item label="涉及对象">{display(selectedTask.involvedObject || selectedTask.objectName)}</Descriptions.Item><Descriptions.Item label="所属范围">{display(selectedTask.branchName)}</Descriptions.Item><Descriptions.Item label="风险原因">{display(selectedTask.riskReason)}</Descriptions.Item><Descriptions.Item label="建议处理">{display(selectedTask.suggestion)}</Descriptions.Item><Descriptions.Item label="状态说明">{display(selectedTask.statusDescription)}</Descriptions.Item><Descriptions.Item label="最近更新">{formatDateTime(selectedTask.updatedAt)}</Descriptions.Item></Descriptions></Card>
        <Card size="small" title="处理记录" extra={<Button type="link" size="small" loading={historyLoading} onClick={() => void loadHistory(selectedTask.key)}>刷新</Button>}>
          {historyError ? <PageFeedback tone="warning" title="处理记录加载失败" description={historyError} action={<Button size="small" onClick={() => void loadHistory(selectedTask.key)}>重试</Button>} /> : null}
          {!historyError && historyLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : null}
          {!historyError && !historyLoading && history.length ? <Timeline items={history.map(item => ({ key: String(item.id || `${item.createdAt}-${item.actionText}`), children: <Space direction="vertical" size={2}><Typography.Text>{display(item.operatorName, '系统')} · {display(item.actionText, '更新任务')}</Typography.Text>{item.comment ? <Typography.Text>{item.comment}</Typography.Text> : null}<Typography.Text type="secondary">{formatDateTime(item.createdAt)}{item.resultText ? ` · ${item.resultText}` : ''}</Typography.Text></Space> }))} /> : null}
          {!historyError && !historyLoading && !history.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无处理记录" /> : null}
        </Card>
      </Space> : null}
    </Drawer>

    <Modal title={selectedTask ? actionLabel(selectedTask) : '完成任务处理'} open={actionModalOpen} onCancel={() => { if (!actionLoading) setActionModalOpen(false); }} onOk={() => void submitTaskAction()} okText="确认完成" cancelText="取消" confirmLoading={actionLoading} destroyOnHidden>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}><PageFeedback tone="warning" title={`将处理任务：${taskTitle(selectedTask)}`} description="确认后将更新任务状态并刷新查询结果；若任务已被他人处理，系统会提示冲突并加载最新状态。" /><Space direction="vertical" size={4} style={{ width: '100%' }}><Typography.Text>处理说明（可选）</Typography.Text><Input.TextArea value={actionComment} onChange={event => setActionComment(event.target.value)} maxLength={500} showCount rows={4} placeholder="补充处理依据、核查结果或后续关注事项" /></Space></Space>
    </Modal>
    <Modal title="批量标记已核查" open={bulkModalOpen} onCancel={() => { if (!bulkLoading) setBulkModalOpen(false); }} onOk={() => void submitBulkCheck()} okText="确认处理" cancelText="取消" confirmLoading={bulkLoading}>
      <PageFeedback tone="warning" title={`将处理当前页选中的 ${selectedTasks.length} 项任务`} description="系统会逐项提交并汇总成功和失败结果，不会因单项失败中断其他任务。" />
    </Modal>
    <Modal title="任务模板管理" open={templateModalOpen} onCancel={() => setTemplateModalOpen(false)} footer={<Button type="primary" onClick={() => setTemplateModalOpen(false)}>完成</Button>} width={820}>
      <Table size="small" rowKey="key" pagination={false} dataSource={templateRows} columns={[{ title: '模板名称', dataIndex: 'name', width: 160 }, { title: '任务类型', dataIndex: 'type', width: 150 }, { title: '默认优先级', dataIndex: 'priority', width: 110, render: value => <Tag>{value}</Tag> }, { title: '生成规则', dataIndex: 'trigger' }]} />
    </Modal>
  </Space>;
}
