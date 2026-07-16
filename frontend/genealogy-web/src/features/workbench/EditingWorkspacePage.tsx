import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Grid,
  Input,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
  message
} from 'antd';
import { ApiRequestError, apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/utils/records';
import {
  EMPTY_FILTERS,
  filterLabels,
  filtersForKpi,
  readWorkbenchUrlState,
  writeWorkbenchUrlState
} from './editingWorkspaceModel';
import type { WorkbenchFilters, WorkbenchKpiKey, WorkbenchUrlState } from './editingWorkspaceModel';

type WorkbenchRisk = 'high' | 'medium' | 'low';
type WorkbenchStatus = 'pending' | 'processing' | 'ready' | 'blocked';
type WorkbenchTaskType = 'review_follow_up' | 'missing_source' | 'generation_mismatch' | 'relationship_check' | 'import_follow_up';
type WorkbenchNavigateKey = 'reviewCenter' | 'personArchive' | 'sourceLibrary' | 'treeProduct' | 'mvp1Wizard';

type Props = { onNavigate?: (view: WorkbenchNavigateKey) => void };
type ClanLike = { id?: number | string; clanName?: string; name?: string; surname?: string };
type WorkbenchSummary = { pendingTaskCount?: number; highRiskCount?: number; missingSourceCount?: number; generationIssueCount?: number };
type WorkbenchTask = {
  key: string;
  type: WorkbenchTaskType;
  typeText: string;
  objectName: string;
  branchName: string;
  risk: WorkbenchRisk;
  status: WorkbenchStatus;
  statusText: string;
  suggestion: string;
  problemDescription?: string;
  involvedObject?: string;
  riskReason?: string;
  reviewBlocked?: boolean;
  relatedEntryType?: string;
  relatedEntryId?: string;
  relatedEntryText?: string;
  statusDescription?: string;
  updatedAt?: string;
};
type WorkbenchTaskPage = { records?: WorkbenchTask[]; total?: number; pageNo?: number; pageSize?: number; totalPages?: number };
type WorkbenchHistoryItem = {
  id?: string | number;
  operatorName?: string;
  actionText?: string;
  comment?: string;
  resultText?: string;
  createdAt?: string;
};

type WorkbenchActionResponse = { task?: WorkbenchTask; message?: string };

const PAGE_SIZE = 10;
const EMPTY_TASK_PAGE: WorkbenchTaskPage = { records: [], pageNo: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 };

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.name || clan.surname || '未命名宗族';
}
function riskColor(value: WorkbenchRisk) {
  if (value === 'high') return 'error';
  if (value === 'medium') return 'warning';
  return 'default';
}
function riskText(value: WorkbenchRisk) {
  if (value === 'high') return '高风险';
  if (value === 'medium') return '中风险';
  return '低风险';
}
function statusColor(value: WorkbenchStatus) {
  if (value === 'ready') return 'success';
  if (value === 'processing') return 'processing';
  if (value === 'blocked') return 'error';
  return 'default';
}
function unwrapData<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) return ((payload as any).data ?? fallback) as T;
  return (payload ?? fallback) as T;
}
function relatedViewOf(type?: string): WorkbenchNavigateKey | undefined {
  if (type === 'reviewCenter') return 'reviewCenter';
  if (type === 'personArchive') return 'personArchive';
  if (type === 'sourceLibrary') return 'sourceLibrary';
  if (type === 'treeProduct') return 'treeProduct';
  if (type === 'mvp1Wizard') return 'mvp1Wizard';
  return undefined;
}
function display(value: unknown, fallback = '待维护') {
  const text = String(value ?? '').trim();
  return text || fallback;
}
function formatDateTime(value?: string) {
  if (!value) return '待维护';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}
function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
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

export function EditingWorkspacePage({ onNavigate }: Props) {
  const workspace = useWorkspace();
  const screens = Grid.useBreakpoint();
  const initialUrlState = useMemo(() => readWorkbenchUrlState(window.location.search), []);
  const requestVersionRef = useRef(0);
  const desiredTaskIdRef = useRef(initialUrlState.taskId);
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [summary, setSummary] = useState<WorkbenchSummary>({});
  const [taskPage, setTaskPage] = useState<WorkbenchTaskPage>({ ...EMPTY_TASK_PAGE, pageNo: initialUrlState.page });
  const [selectedTask, setSelectedTask] = useState<WorkbenchTask | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [taskError, setTaskError] = useState('');
  const [taskType, setTaskType] = useState(initialUrlState.taskType);
  const [risk, setRisk] = useState(initialUrlState.risk);
  const [status, setStatus] = useState(initialUrlState.status);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [history, setHistory] = useState<WorkbenchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const activeClan = clans.find(item => String(item.id || '') === workspace.clanId) || clans[0];
  const tasks = useMemo(() => toRecordList<WorkbenchTask>(taskPage.records || []), [taskPage.records]);
  const relatedView = relatedViewOf(selectedTask?.relatedEntryType);
  const selectedTaskLocated = selectedTask ? isTaskLocated(selectedTask) : false;
  const currentFilters = { taskType, risk, status };
  const activeFilterLabels = filterLabels(currentFilters);

  function replaceUrl(patch: Partial<WorkbenchUrlState>) {
    const next = writeWorkbenchUrlState(window.location.href, patch);
    window.history.replaceState(window.history.state, '', next);
  }

  function isTaskLocated(task: WorkbenchTask) {
    const id = task.relatedEntryId || '';
    if (task.relatedEntryType === 'reviewCenter') return Boolean(id && workspace.reviewTaskId === id);
    if (task.relatedEntryType === 'personArchive') return Boolean(id && workspace.personId === id);
    if (task.relatedEntryType === 'treeProduct') return Boolean(id && workspace.personId === id);
    if (task.relatedEntryType === 'sourceLibrary') {
      if (id) return workspace.sourceId === id;
      return workspace.sourceFocusReason === task.type || Boolean(workspace.sourceId);
    }
    return false;
  }

  function openTask(task: WorkbenchTask) {
    desiredTaskIdRef.current = task.key;
    setSelectedTask(task);
    replaceUrl({ taskId: task.key });
  }

  function closeTask() {
    desiredTaskIdRef.current = '';
    setSelectedTask(null);
    setHistory([]);
    setHistoryError('');
    replaceUrl({ taskId: '' });
  }

  function restoreTaskFromPage(nextTaskPage: WorkbenchTaskPage) {
    const taskId = desiredTaskIdRef.current;
    if (!taskId) return;
    const task = toRecordList<WorkbenchTask>(nextTaskPage.records || []).find(item => item.key === taskId);
    if (task) {
      setSelectedTask(task);
      return;
    }
    desiredTaskIdRef.current = '';
    setSelectedTask(null);
    replaceUrl({ taskId: '' });
    message.info('原任务已处理完成、已移出当前筛选范围，或任务标识已失效。');
  }

  async function loadClans() {
    try {
      const clanRows = toRecordList<ClanLike>(unwrapData(await apiClient.get('/clans'), []));
      setClans(clanRows);
      const urlClanExists = clanRows.some(item => String(item.id || '') === initialUrlState.clanId);
      const workspaceClanExists = clanRows.some(item => String(item.id || '') === workspace.clanId);
      const nextClanId = urlClanExists
        ? initialUrlState.clanId
        : workspaceClanExists
          ? workspace.clanId
          : String(clanRows[0]?.id || '');
      if (nextClanId && nextClanId !== workspace.clanId) workspace.setClanId(nextClanId);
      replaceUrl({ clanId: nextClanId });
      return nextClanId;
    } catch (error) {
      message.error(errorMessage(error, '加载宗族列表失败'));
      return '';
    }
  }

  function buildTaskQuery(clanId: string, pageNo: number, filters: WorkbenchFilters) {
    const query = new URLSearchParams({ clanId, pageNo: String(pageNo), pageSize: String(PAGE_SIZE) });
    if (filters.taskType) query.set('type', filters.taskType);
    if (filters.risk) query.set('risk', filters.risk);
    if (filters.status) query.set('status', filters.status);
    return query;
  }

  async function loadWorkbench(sourceClanId = workspace.clanId, nextPage = 1, filters: WorkbenchFilters = currentFilters) {
    const version = ++requestVersionRef.current;
    const nextClanId = sourceClanId || await loadClans();
    if (!nextClanId) {
      setSummary({});
      setTaskPage(EMPTY_TASK_PAGE);
      return undefined;
    }
    setSummaryLoading(true);
    setTaskLoading(true);
    setSummaryError('');
    setTaskError('');
    const query = buildTaskQuery(nextClanId, nextPage, filters);
    const [summaryResult, taskResult] = await Promise.allSettled([
      apiClient.get(`/workbench/summary?clanId=${nextClanId}`),
      apiClient.get(`/workbench/tasks?${query.toString()}`)
    ]);
    if (version !== requestVersionRef.current) return undefined;
    let nextTaskPage: WorkbenchTaskPage | undefined;
    if (summaryResult.status === 'fulfilled') {
      setSummary(unwrapData<WorkbenchSummary>(summaryResult.value, {}));
      setLastUpdatedAt(new Date());
    } else setSummaryError(errorMessage(summaryResult.reason, '加载工作台摘要失败'));
    if (taskResult.status === 'fulfilled') {
      nextTaskPage = unwrapData<WorkbenchTaskPage>(taskResult.value, { ...EMPTY_TASK_PAGE, pageNo: nextPage });
      setTaskPage(nextTaskPage);
      setLastUpdatedAt(new Date());
      restoreTaskFromPage(nextTaskPage);
    } else setTaskError(errorMessage(taskResult.reason, '加载修谱任务失败'));
    setSummaryLoading(false);
    setTaskLoading(false);
    return nextTaskPage;
  }

  async function loadHistory(taskKey: string) {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const payload = await apiClient.get(`/workbench/tasks/${encodeURIComponent(taskKey)}/history`);
      setHistory(toRecordList<WorkbenchHistoryItem>(unwrapData(payload, [])));
    } catch (error) {
      setHistory([]);
      setHistoryError(errorMessage(error, '加载处理记录失败'));
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    void loadClans().then(clanId => loadWorkbench(clanId, initialUrlState.page, currentFilters));
  }, []);

  useEffect(() => {
    if (selectedTask?.key) void loadHistory(selectedTask.key);
  }, [selectedTask?.key]);

  function applyState(nextClanId: string, pageNo: number, filters: WorkbenchFilters, taskId = '') {
    setTaskType(filters.taskType);
    setRisk(filters.risk);
    setStatus(filters.status);
    desiredTaskIdRef.current = taskId;
    if (!taskId) setSelectedTask(null);
    replaceUrl({
      clanId: nextClanId,
      taskType: filters.taskType,
      risk: filters.risk,
      status: filters.status,
      page: pageNo,
      taskId
    });
    void loadWorkbench(nextClanId, pageNo, filters);
  }

  function changeClan(nextClanId: string) {
    workspace.setClanId(nextClanId);
    setTaskPage(EMPTY_TASK_PAGE);
    applyState(nextClanId, 1, EMPTY_FILTERS);
    message.success(`已切换至${clanLabel(clans.find(item => String(item.id || '') === nextClanId) || {})}`);
  }

  function searchWorkbench() {
    applyState(workspace.clanId || String(activeClan?.id || ''), 1, currentFilters);
  }

  function resetFilters() {
    applyState(workspace.clanId || String(activeClan?.id || ''), 1, EMPTY_FILTERS);
  }

  function clearFilter(key: keyof WorkbenchFilters) {
    const next = { ...currentFilters, [key]: '' };
    applyState(workspace.clanId || String(activeClan?.id || ''), 1, next);
  }

  function applyKpiFilter(key: WorkbenchKpiKey) {
    applyState(workspace.clanId || String(activeClan?.id || ''), 1, filtersForKpi(key));
  }

  function changePage(page: number) {
    replaceUrl({ page, taskId: '' });
    desiredTaskIdRef.current = '';
    setSelectedTask(null);
    void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), page, currentFilters);
  }

  async function refreshTaskStatus() {
    const task = selectedTask;
    const nextPage = taskPage.pageNo || 1;
    const nextTaskPage = await loadWorkbench(workspace.clanId || String(activeClan?.id || ''), nextPage, currentFilters);
    if (!task || !nextTaskPage) return;
    const nextTask = toRecordList<WorkbenchTask>(nextTaskPage.records || []).find(item => item.key === task.key);
    if (nextTask) {
      openTask(nextTask);
      message.success('任务状态已刷新');
    }
  }

  function applyRelatedContext(task: WorkbenchTask) {
    const id = task.relatedEntryId || '';
    if (task.relatedEntryType === 'reviewCenter') workspace.patch({ reviewTaskId: id, personId: '', sourceId: '', sourceFocusReason: '' });
    else if (task.relatedEntryType === 'personArchive') workspace.patch({ personId: id, reviewTaskId: '', sourceId: '', sourceFocusReason: '' });
    else if (task.relatedEntryType === 'treeProduct') workspace.patch({ personId: id, reviewTaskId: '', sourceId: '', sourceFocusReason: '' });
    else if (task.relatedEntryType === 'sourceLibrary') workspace.patch({ sourceId: id, sourceFocusReason: task.type, reviewTaskId: '', personId: '' });
  }

  function goRelatedEntry() {
    if (!selectedTask || !relatedView || !onNavigate) return;
    applyRelatedContext(selectedTask);
    replaceUrl({ taskId: selectedTask.key });
    onNavigate(relatedView);
  }

  async function submitTaskAction() {
    const task = selectedTask;
    if (!task) return;
    setActionLoading(true);
    try {
      const payload = await apiClient.post(`/workbench/tasks/${encodeURIComponent(task.key)}/actions`, {
        action: actionCode(task),
        comment: actionComment.trim(),
        expectedUpdatedAt: task.updatedAt || null
      });
      const result = unwrapData<WorkbenchActionResponse>(payload, {});
      message.success(result.message || '任务处理完成');
      setActionModalOpen(false);
      setActionComment('');
      const nextTaskPage = await loadWorkbench(workspace.clanId || String(activeClan?.id || ''), taskPage.pageNo || 1, currentFilters);
      if (!nextTaskPage) return;
      const nextTasks = toRecordList<WorkbenchTask>(nextTaskPage.records || []);
      const nextTask = nextTasks.find(item => item.key !== task.key) || result.task;
      if (nextTask) openTask(nextTask);
      else closeTask();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        message.warning('任务已被其他成员处理或状态已变化，已为你刷新最新状态。');
        await refreshTaskStatus();
      } else {
        message.error(errorMessage(error, '任务处理失败，请保留当前现场后重试'));
      }
    } finally {
      setActionLoading(false);
    }
  }

  const summaryCards: Array<{
    key: WorkbenchKpiKey;
    label: string;
    value?: number;
    tag: string;
    color?: string;
  }> = [
    { key: 'pending', label: '待处理问题', value: summary.pendingTaskCount, tag: '筛选待处理任务' },
    { key: 'high', label: '高风险任务', value: summary.highRiskCount, tag: summary.highRiskCount ? '需优先处理' : '暂无高风险', color: summary.highRiskCount ? 'error' : 'success' },
    { key: 'source', label: '资料缺失', value: summary.missingSourceCount, tag: summary.missingSourceCount ? '待补来源' : '来源正常', color: summary.missingSourceCount ? 'warning' : 'success' },
    { key: 'generation', label: '代次/字辈问题', value: summary.generationIssueCount, tag: summary.generationIssueCount ? '待校验' : '已校验', color: summary.generationIssueCount ? 'processing' : 'success' }
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} lg={14}>
            <Space direction="vertical" size={4}>
              <Typography.Title level={3} style={{ margin: 0 }}>修谱工作台</Typography.Title>
              <Typography.Text type="secondary">集中处理资料缺失、字辈异常、关系复核和审核前阻塞问题。</Typography.Text>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <Row gutter={[12, 12]} align="bottom">
              <Col xs={24} sm={16}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Typography.Text type="secondary">当前宗族</Typography.Text>
                  <Select showSearch optionFilterProp="label" style={{ width: '100%' }} value={workspace.clanId || String(activeClan?.id || '')} onChange={changeClan} options={clans.map(clan => ({ value: String(clan.id || ''), label: clanLabel(clan) }))} placeholder="请选择宗族" />
                </Space>
              </Col>
              <Col xs={24} sm={8}><Button block loading={summaryLoading || taskLoading} onClick={() => void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), taskPage.pageNo || 1, currentFilters)}>刷新</Button></Col>
            </Row>
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>最近更新时间：{lastUpdatedAt ? lastUpdatedAt.toLocaleString('zh-CN', { hour12: false }) : '尚未更新'}</Typography.Text>
          </Col>
        </Row>
      </Card>

      <Card title="筛选条件">
        <Row gutter={[16, 12]}>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Typography.Text type="secondary">问题类型</Typography.Text>
              <Select style={{ width: '100%' }} value={taskType} onChange={setTaskType} options={[
                { value: '', label: '全部问题' }, { value: 'review_follow_up', label: '审核跟进' }, { value: 'missing_source', label: '来源证据缺失' }, { value: 'generation_mismatch', label: '字辈/代次待补' }, { value: 'relationship_check', label: '关系复核建议' }, { value: 'import_follow_up', label: '导入异常' }
              ]} />
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Typography.Text type="secondary">风险等级</Typography.Text>
              <Select style={{ width: '100%' }} value={risk} onChange={setRisk} options={[{ value: '', label: '全部风险' }, { value: 'high', label: '高风险' }, { value: 'medium', label: '中风险' }, { value: 'low', label: '低风险' }]} />
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Typography.Text type="secondary">任务状态</Typography.Text>
              <Select style={{ width: '100%' }} value={status} onChange={setStatus} options={[{ value: '', label: '全部状态' }, { value: 'pending', label: '待处理' }, { value: 'processing', label: '处理中' }, { value: 'ready', label: '待确认' }, { value: 'blocked', label: '已阻塞' }]} />
            </Space>
          </Col>
        </Row>
        {activeFilterLabels.length ? <Space wrap style={{ marginTop: 16 }}>
          <Typography.Text type="secondary">当前筛选：</Typography.Text>
          {activeFilterLabels.map(item => <Tag key={item.key} closable onClose={event => { event.preventDefault(); clearFilter(item.key); }}>{item.label}</Tag>)}
          <Button type="link" size="small" onClick={resetFilters}>清除全部</Button>
        </Space> : null}
        <Row justify="end" style={{ marginTop: 16 }}><Space><Button onClick={resetFilters}>重置</Button><Button type="primary" loading={taskLoading} onClick={searchWorkbench}>查询</Button></Space></Row>
      </Card>

      {summaryError ? <Alert type="error" showIcon message="工作台摘要加载失败" description={summaryError} action={<Button size="small" onClick={() => void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), taskPage.pageNo || 1, currentFilters)}>重试</Button>} /> : null}
      <Row gutter={[12, 12]}>
        {summaryCards.map(item => {
          const activeFilters = filtersForKpi(item.key);
          const active = activeFilters.taskType === taskType && activeFilters.risk === risk && activeFilters.status === status;
          return <Col xs={24} md={12} xl={6} key={item.key}>
            <Card
              hoverable={!summaryLoading && !summaryError && Boolean(workspace.clanId || activeClan?.id)}
              role="button"
              tabIndex={0}
              aria-label={`${item.label}，${item.value ?? '尚未加载'}，点击筛选任务`}
              onClick={() => !summaryLoading && !summaryError && applyKpiFilter(item.key)}
              onKeyDown={event => {
                if ((event.key === 'Enter' || event.key === ' ') && !summaryLoading && !summaryError) {
                  event.preventDefault();
                  applyKpiFilter(item.key);
                }
              }}
              style={{ cursor: summaryLoading || summaryError ? 'default' : 'pointer', borderColor: active ? '#1677ff' : undefined }}
            >
              <Typography.Text type="secondary">{item.label}</Typography.Text>
              {summaryLoading ? <Skeleton.Input active size="small" style={{ display: 'block', margin: '12px 0' }} /> : <Typography.Title level={3}>{workspace.clanId || activeClan?.id ? item.value ?? '-' : '-'}</Typography.Title>}
              <Tag color={item.color}>{item.tag}</Tag>
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>{active ? '当前已应用' : '点击查看明细'}</Typography.Text>
            </Card>
          </Col>;
        })}
      </Row>

      <Card title="修谱问题任务池">
        {taskError ? <Alert type="error" showIcon message="任务列表加载失败" description={taskError} action={<Button size="small" onClick={() => void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), taskPage.pageNo || 1, currentFilters)}>重试</Button>} style={{ marginBottom: 16 }} /> : null}
        <Table<WorkbenchTask>
          size="middle" loading={taskLoading} rowKey="key" dataSource={tasks}
          pagination={{ current: taskPage.pageNo || 1, pageSize: taskPage.pageSize || PAGE_SIZE, total: taskPage.total || 0, showSizeChanger: false, onChange: changePage }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={activeFilterLabels.length ? '当前筛选条件下暂无修谱问题' : '暂无修谱问题'}>{activeFilterLabels.length ? <Button onClick={resetFilters}>清除筛选</Button> : null}</Empty> }}
          onRow={row => ({ onClick: () => openTask(row), style: { cursor: 'pointer', background: selectedTask?.key === row.key ? '#f0f7ff' : undefined } })}
          columns={[
            { key: 'type', title: '问题事项', width: 150, render: (_value, row) => row.typeText },
            { key: 'objectName', title: '涉及对象', render: (_value, row) => display(row.objectName) },
            { key: 'branchName', title: '所属范围', width: 150, ellipsis: true, render: (_value, row) => display(row.branchName) },
            { key: 'risk', title: '风险', width: 100, render: (_value, row) => <Tag color={riskColor(row.risk)}>{riskText(row.risk)}</Tag> },
            { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.status)}>{display(row.statusText, '状态未知')}</Tag> },
            { key: 'blocked', title: '审核影响', width: 120, render: (_value, row) => <Tag color={row.reviewBlocked ? 'error' : 'success'}>{row.reviewBlocked ? '阻塞审核' : '不阻塞'}</Tag> },
            { key: 'updatedAt', title: '更新时间', width: 170, render: (_value, row) => formatDateTime(row.updatedAt) },
            { key: 'detail', title: '操作', width: 80, fixed: 'right', render: (_value, row) => <Button type="link" onClick={event => { event.stopPropagation(); openTask(row); }}>详情</Button> }
          ]}
          scroll={{ x: 980 }}
        />
      </Card>

      <Drawer
        title={selectedTask ? <Space direction="vertical" size={6}><Space wrap><Typography.Text strong>{selectedTask.typeText}</Typography.Text><Typography.Text type="secondary">{display(selectedTask.objectName)}</Typography.Text></Space><Space wrap size={4}><Tag color={riskColor(selectedTask.risk)}>{riskText(selectedTask.risk)}</Tag><Tag color={statusColor(selectedTask.status)}>{display(selectedTask.statusText, '状态未知')}</Tag><Tag color={selectedTask.reviewBlocked ? 'error' : 'success'}>{selectedTask.reviewBlocked ? '阻塞审核' : '不阻塞审核'}</Tag>{selectedTaskLocated ? <Tag color="success">已定位</Tag> : null}</Space></Space> : '修谱任务详情'}
        width={screens.md ? 720 : '100%'} open={Boolean(selectedTask)} onClose={closeTask}
        extra={selectedTask ? <Space wrap><Button loading={taskLoading} onClick={() => void refreshTaskStatus()}>刷新状态</Button><Button disabled={!relatedView || !onNavigate} onClick={goRelatedEntry}>{selectedTask.relatedEntryText || '前往相关页面'}</Button><Button type="primary" onClick={() => setActionModalOpen(true)}>{actionLabel(selectedTask)}</Button></Space> : null}
      >
        {selectedTask ? <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert type={selectedTask.reviewBlocked ? 'warning' : 'info'} showIcon message="问题描述" description={display(selectedTask.problemDescription, selectedTask.suggestion)} />
          <Card size="small" title="影响与处理建议"><Descriptions column={1} size="small">
            <Descriptions.Item label="涉及对象">{display(selectedTask.involvedObject || selectedTask.objectName)}</Descriptions.Item>
            <Descriptions.Item label="所属范围">{display(selectedTask.branchName)}</Descriptions.Item>
            <Descriptions.Item label="风险原因">{display(selectedTask.riskReason)}</Descriptions.Item>
            <Descriptions.Item label="建议处理">{display(selectedTask.suggestion)}</Descriptions.Item>
            <Descriptions.Item label="状态说明">{display(selectedTask.statusDescription)}</Descriptions.Item>
            <Descriptions.Item label="最近更新">{formatDateTime(selectedTask.updatedAt)}</Descriptions.Item>
          </Descriptions></Card>
          <Card size="small" title="处理记录" extra={<Button type="link" size="small" loading={historyLoading} onClick={() => void loadHistory(selectedTask.key)}>刷新</Button>}>
            {historyError ? <Alert type="warning" showIcon message="处理记录加载失败" description={historyError} action={<Button size="small" onClick={() => void loadHistory(selectedTask.key)}>重试</Button>} /> : null}
            {!historyError && historyLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : null}
            {!historyError && !historyLoading && history.length ? <Timeline items={history.map(item => ({
              key: String(item.id || `${item.createdAt}-${item.actionText}`),
              children: <Space direction="vertical" size={2}>
                <Typography.Text>{display(item.operatorName, '系统')} · {display(item.actionText, '更新任务')}</Typography.Text>
                {item.comment ? <Typography.Text>{item.comment}</Typography.Text> : null}
                <Typography.Text type="secondary">{formatDateTime(item.createdAt)}{item.resultText ? ` · ${item.resultText}` : ''}</Typography.Text>
              </Space>
            }))} /> : null}
            {!historyError && !historyLoading && !history.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无处理记录" /> : null}
          </Card>
        </Space> : null}
      </Drawer>

      <Modal
        title={selectedTask ? actionLabel(selectedTask) : '完成任务处理'}
        open={actionModalOpen}
        onCancel={() => { if (!actionLoading) setActionModalOpen(false); }}
        onOk={() => void submitTaskAction()}
        okText="确认完成"
        cancelText="取消"
        confirmLoading={actionLoading}
        destroyOnHidden
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert type="warning" showIcon message={`将处理任务：${display(selectedTask?.typeText)} / ${display(selectedTask?.objectName)}`} description="确认后将更新任务状态并刷新任务池；若任务已被他人处理，系统会提示冲突并加载最新状态。" />
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Typography.Text>处理说明（可选）</Typography.Text>
            <Input.TextArea value={actionComment} onChange={event => setActionComment(event.target.value)} maxLength={500} showCount rows={4} placeholder="补充处理依据、核查结果或需要后续关注的事项" />
          </Space>
        </Space>
      </Modal>
    </Space>
  );
}
