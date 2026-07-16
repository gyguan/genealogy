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
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/utils/records';

type WorkbenchRisk = 'high' | 'medium' | 'low';
type WorkbenchStatus = 'pending' | 'processing' | 'ready' | 'blocked';
type WorkbenchTaskType = 'review_follow_up' | 'missing_source' | 'generation_mismatch' | 'relationship_check' | 'import_follow_up';
type WorkbenchNavigateKey = 'reviewCenter' | 'personArchive' | 'sourceLibrary' | 'treeProduct' | 'mvp1Wizard';

type Props = {
  onNavigate?: (view: WorkbenchNavigateKey) => void;
};

type ClanLike = {
  id?: number | string;
  clanName?: string;
  name?: string;
  surname?: string;
};

type WorkbenchSummary = {
  pendingTaskCount?: number;
  highRiskCount?: number;
  missingSourceCount?: number;
  generationIssueCount?: number;
};

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

type WorkbenchTaskPage = {
  records?: WorkbenchTask[];
  total?: number;
  pageNo?: number;
  pageSize?: number;
  totalPages?: number;
};

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

export function EditingWorkspacePage({ onNavigate }: Props) {
  const workspace = useWorkspace();
  const screens = Grid.useBreakpoint();
  const requestVersionRef = useRef(0);
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [summary, setSummary] = useState<WorkbenchSummary>({});
  const [taskPage, setTaskPage] = useState<WorkbenchTaskPage>(EMPTY_TASK_PAGE);
  const [selectedTask, setSelectedTask] = useState<WorkbenchTask | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [taskError, setTaskError] = useState('');
  const [taskType, setTaskType] = useState('');
  const [risk, setRisk] = useState('');
  const [status, setStatus] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const activeClan = clans.find(item => String(item.id || '') === workspace.clanId) || clans[0];
  const tasks = useMemo(() => toRecordList<WorkbenchTask>(taskPage.records || []), [taskPage.records]);
  const relatedView = relatedViewOf(selectedTask?.relatedEntryType);
  const selectedTaskLocated = selectedTask ? isTaskLocated(selectedTask) : false;

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

  async function loadClans() {
    try {
      const clanRows = toRecordList<ClanLike>(unwrapData(await apiClient.get('/clans'), []));
      setClans(clanRows);
      const nextClanId = workspace.clanId || String(clanRows[0]?.id || '');
      if (nextClanId && !workspace.clanId) workspace.setClanId(nextClanId);
      return nextClanId;
    } catch (error) {
      message.error(errorMessage(error, '加载宗族列表失败'));
      return '';
    }
  }

  function buildTaskQuery(clanId: string, pageNo: number) {
    const query = new URLSearchParams({ clanId, pageNo: String(pageNo), pageSize: String(PAGE_SIZE) });
    if (taskType) query.set('type', taskType);
    if (risk) query.set('risk', risk);
    if (status) query.set('status', status);
    return query;
  }

  async function loadWorkbench(sourceClanId = workspace.clanId, nextPage = 1) {
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

    const query = buildTaskQuery(nextClanId, nextPage);
    const [summaryResult, taskResult] = await Promise.allSettled([
      apiClient.get(`/workbench/summary?clanId=${nextClanId}`),
      apiClient.get(`/workbench/tasks?${query.toString()}`)
    ]);

    if (version !== requestVersionRef.current) return undefined;

    let nextTaskPage: WorkbenchTaskPage | undefined;
    if (summaryResult.status === 'fulfilled') {
      setSummary(unwrapData<WorkbenchSummary>(summaryResult.value, {}));
      setLastUpdatedAt(new Date());
    } else {
      setSummaryError(errorMessage(summaryResult.reason, '加载工作台摘要失败'));
    }

    if (taskResult.status === 'fulfilled') {
      nextTaskPage = unwrapData<WorkbenchTaskPage>(taskResult.value, { ...EMPTY_TASK_PAGE, pageNo: nextPage });
      setTaskPage(nextTaskPage);
      setLastUpdatedAt(new Date());
    } else {
      setTaskError(errorMessage(taskResult.reason, '加载修谱任务失败'));
    }

    setSummaryLoading(false);
    setTaskLoading(false);
    return nextTaskPage;
  }

  useEffect(() => {
    void loadClans().then(clanId => loadWorkbench(clanId));
  }, []);

  function changeClan(nextClanId: string) {
    workspace.setClanId(nextClanId);
    setTaskType('');
    setRisk('');
    setStatus('');
    setSelectedTask(null);
    setTaskPage(EMPTY_TASK_PAGE);
    message.success(`已切换至${clanLabel(clans.find(item => String(item.id || '') === nextClanId) || {})}`);
    void loadWorkbench(nextClanId, 1);
  }

  function searchWorkbench() {
    setSelectedTask(null);
    void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), 1);
  }

  function resetFilters() {
    setTaskType('');
    setRisk('');
    setStatus('');
    setSelectedTask(null);
    setTaskPage(prev => ({ ...prev, pageNo: 1 }));
    window.setTimeout(() => void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), 1), 0);
  }

  async function refreshTaskStatus() {
    const task = selectedTask;
    const nextPage = taskPage.pageNo || 1;
    const nextTaskPage = await loadWorkbench(workspace.clanId || String(activeClan?.id || ''), nextPage);
    if (!task || !nextTaskPage) return;
    const nextTask = toRecordList<WorkbenchTask>(nextTaskPage.records || []).find(item => item.key === task.key);
    if (nextTask) {
      setSelectedTask(nextTask);
      message.success('任务状态已刷新');
    } else {
      setSelectedTask(null);
      message.info('该任务已处理完成，或不再符合当前筛选条件。');
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
    setSelectedTask(null);
    onNavigate(relatedView);
  }

  const summaryCards = [
    { key: 'pending', label: '待处理问题', value: summary.pendingTaskCount, tag: '任务池', color: undefined },
    { key: 'high', label: '高风险任务', value: summary.highRiskCount, tag: summary.highRiskCount ? '需优先处理' : '暂无高风险', color: summary.highRiskCount ? 'error' : 'success' },
    { key: 'source', label: '资料缺失', value: summary.missingSourceCount, tag: summary.missingSourceCount ? '待补来源' : '来源正常', color: summary.missingSourceCount ? 'warning' : 'success' },
    { key: 'generation', label: '代次/字辈问题', value: summary.generationIssueCount, tag: summary.generationIssueCount ? '待校验' : '已校验', color: summary.generationIssueCount ? 'processing' : 'success' }
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Typography.Title level={3} style={{ margin: 0 }}>修谱工作台</Typography.Title>
              <Typography.Text type="secondary">集中处理资料缺失、字辈异常、关系复核和审核前阻塞问题。</Typography.Text>
            </Space>
          </Col>
          <Col xs={24} lg="420px">
            <Row gutter={[12, 12]} align="bottom">
              <Col xs={24} sm={16}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Typography.Text type="secondary">当前宗族</Typography.Text>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    style={{ width: '100%' }}
                    value={workspace.clanId || String(activeClan?.id || '')}
                    onChange={changeClan}
                    options={clans.map(clan => ({ value: String(clan.id || ''), label: clanLabel(clan) }))}
                    placeholder="请选择宗族"
                  />
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Button block loading={summaryLoading || taskLoading} onClick={() => void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), taskPage.pageNo || 1)}>刷新</Button>
              </Col>
            </Row>
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              最近更新时间：{lastUpdatedAt ? lastUpdatedAt.toLocaleString('zh-CN', { hour12: false }) : '尚未更新'}
            </Typography.Text>
          </Col>
        </Row>
      </Card>

      <Card title="筛选条件">
        <Row gutter={[16, 12]}>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Typography.Text type="secondary">问题类型</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={taskType}
                onChange={setTaskType}
                options={[
                  { value: '', label: '全部问题' },
                  { value: 'review_follow_up', label: '审核跟进' },
                  { value: 'missing_source', label: '来源证据缺失' },
                  { value: 'generation_mismatch', label: '字辈/代次待补' },
                  { value: 'relationship_check', label: '关系复核建议' },
                  { value: 'import_follow_up', label: '导入异常' }
                ]}
              />
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Typography.Text type="secondary">风险等级</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={risk}
                onChange={setRisk}
                options={[
                  { value: '', label: '全部风险' },
                  { value: 'high', label: '高风险' },
                  { value: 'medium', label: '中风险' },
                  { value: 'low', label: '低风险' }
                ]}
              />
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Typography.Text type="secondary">任务状态</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={status}
                onChange={setStatus}
                options={[
                  { value: '', label: '全部状态' },
                  { value: 'pending', label: '待处理' },
                  { value: 'processing', label: '处理中' },
                  { value: 'ready', label: '待确认' },
                  { value: 'blocked', label: '已阻塞' }
                ]}
              />
            </Space>
          </Col>
        </Row>
        <Row justify="end" style={{ marginTop: 16 }}>
          <Space>
            <Button onClick={resetFilters}>重置</Button>
            <Button type="primary" loading={taskLoading} onClick={searchWorkbench}>查询</Button>
          </Space>
        </Row>
      </Card>

      {summaryError ? (
        <Alert type="error" showIcon message="工作台摘要加载失败" description={summaryError} action={<Button size="small" onClick={() => void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), taskPage.pageNo || 1)}>重试</Button>} />
      ) : null}

      <Row gutter={[12, 12]}>
        {summaryCards.map(item => (
          <Col xs={24} md={12} xl={6} key={item.key}>
            <Card>
              <Typography.Text type="secondary">{item.label}</Typography.Text>
              {summaryLoading ? <Skeleton.Input active size="small" style={{ display: 'block', margin: '12px 0' }} /> : <Typography.Title level={3}>{item.value ?? '-'}</Typography.Title>}
              <Tag color={item.color}>{item.tag}</Tag>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="修谱问题任务池">
        {taskError ? (
          <Alert
            type="error"
            showIcon
            message="任务列表加载失败"
            description={taskError}
            action={<Button size="small" onClick={() => void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), taskPage.pageNo || 1)}>重试</Button>}
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Table<WorkbenchTask>
          size="middle"
          loading={taskLoading}
          rowKey="key"
          dataSource={tasks}
          pagination={{
            current: taskPage.pageNo || 1,
            pageSize: taskPage.pageSize || PAGE_SIZE,
            total: taskPage.total || 0,
            showSizeChanger: false,
            onChange: page => void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), page)
          }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无修谱问题" /> }}
          onRow={row => ({ onClick: () => setSelectedTask(row), style: { cursor: 'pointer' } })}
          columns={[
            { key: 'type', title: '问题事项', width: 150, render: (_value, row) => row.typeText },
            { key: 'objectName', title: '涉及对象', render: (_value, row) => display(row.objectName) },
            { key: 'branchName', title: '所属范围', width: 150, ellipsis: true, render: (_value, row) => display(row.branchName) },
            { key: 'risk', title: '风险', width: 100, render: (_value, row) => <Tag color={riskColor(row.risk)}>{riskText(row.risk)}</Tag> },
            { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.status)}>{display(row.statusText, '状态未知')}</Tag> },
            { key: 'blocked', title: '审核影响', width: 120, render: (_value, row) => <Tag color={row.reviewBlocked ? 'error' : 'success'}>{row.reviewBlocked ? '阻塞审核' : '不阻塞'}</Tag> },
            { key: 'updatedAt', title: '更新时间', width: 170, render: (_value, row) => formatDateTime(row.updatedAt) },
            {
              key: 'detail',
              title: '操作',
              width: 80,
              fixed: 'right',
              render: (_value, row) => <Button type="link" onClick={event => { event.stopPropagation(); setSelectedTask(row); }}>详情</Button>
            }
          ]}
          scroll={{ x: 980 }}
        />
      </Card>

      <Drawer
        title={selectedTask ? (
          <Space direction="vertical" size={6}>
            <Space wrap>
              <Typography.Text strong>{selectedTask.typeText}</Typography.Text>
              <Typography.Text type="secondary">{display(selectedTask.objectName)}</Typography.Text>
            </Space>
            <Space wrap size={4}>
              <Tag color={riskColor(selectedTask.risk)}>{riskText(selectedTask.risk)}</Tag>
              <Tag color={statusColor(selectedTask.status)}>{display(selectedTask.statusText, '状态未知')}</Tag>
              <Tag color={selectedTask.reviewBlocked ? 'error' : 'success'}>{selectedTask.reviewBlocked ? '阻塞审核' : '不阻塞审核'}</Tag>
              {selectedTaskLocated ? <Tag color="success">已定位</Tag> : null}
            </Space>
          </Space>
        ) : '修谱任务详情'}
        width={screens.md ? 720 : '100%'}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        extra={selectedTask ? (
          <Space>
            <Button loading={taskLoading} onClick={() => void refreshTaskStatus()}>刷新状态</Button>
            <Button type="primary" disabled={!relatedView || !onNavigate} onClick={goRelatedEntry}>{selectedTask.relatedEntryText || '前往相关页面'}</Button>
          </Space>
        ) : null}
      >
        {selectedTask ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              type={selectedTask.reviewBlocked ? 'warning' : 'info'}
              showIcon
              message="问题描述"
              description={display(selectedTask.problemDescription, selectedTask.suggestion)}
            />
            <Card size="small" title="影响与处理建议">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="涉及对象">{display(selectedTask.involvedObject || selectedTask.objectName)}</Descriptions.Item>
                <Descriptions.Item label="所属范围">{display(selectedTask.branchName)}</Descriptions.Item>
                <Descriptions.Item label="风险原因">{display(selectedTask.riskReason)}</Descriptions.Item>
                <Descriptions.Item label="建议处理">{display(selectedTask.suggestion)}</Descriptions.Item>
                <Descriptions.Item label="状态说明">{display(selectedTask.statusDescription)}</Descriptions.Item>
                <Descriptions.Item label="最近更新">{formatDateTime(selectedTask.updatedAt)}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </Space>
  );
}
