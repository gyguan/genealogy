import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Drawer, Empty, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
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

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.name || clan.surname || '未命名宗族';
}

function riskColor(value: WorkbenchRisk) {
  if (value === 'high') return 'error';
  if (value === 'medium') return 'warning';
  return 'default';
}

function riskText(value: WorkbenchRisk) {
  if (value === 'high') return '高';
  if (value === 'medium') return '中';
  return '低';
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

export function EditingWorkspacePage({ onNavigate }: Props) {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [summary, setSummary] = useState<WorkbenchSummary>({});
  const [taskPage, setTaskPage] = useState<WorkbenchTaskPage>({ records: [], pageNo: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
  const [selectedTask, setSelectedTask] = useState<WorkbenchTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState('');
  const [risk, setRisk] = useState('');

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

  function taskExistsInCurrentPage(task: WorkbenchTask) {
    return tasks.some(item => item.key === task.key);
  }

  async function loadClans() {
    const clanRows = toRecordList<ClanLike>(unwrapData(await apiClient.get('/clans').catch(() => []), []));
    setClans(clanRows);
    const nextClanId = workspace.clanId || String(clanRows[0]?.id || '');
    if (nextClanId && !workspace.clanId) workspace.setClanId(nextClanId);
    return nextClanId;
  }

  async function loadWorkbench(sourceClanId = workspace.clanId, nextPage = 1) {
    setLoading(true);
    try {
      const nextClanId = sourceClanId || await loadClans();
      if (!nextClanId) {
        setSummary({});
        setTaskPage({ records: [], pageNo: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
        return;
      }
      const query = new URLSearchParams({ clanId: nextClanId, pageNo: String(nextPage), pageSize: String(PAGE_SIZE) });
      if (taskType) query.set('type', taskType);
      if (risk) query.set('risk', risk);
      const [summaryPayload, taskPayload] = await Promise.all([
        apiClient.get(`/workbench/summary?clanId=${nextClanId}`),
        apiClient.get(`/workbench/tasks?${query.toString()}`)
      ]);
      const nextSummary = unwrapData<WorkbenchSummary>(summaryPayload, {});
      const nextTaskPage = unwrapData<WorkbenchTaskPage>(taskPayload, { records: [], pageNo: nextPage, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
      setSummary(nextSummary);
      setTaskPage(nextTaskPage);
      return nextTaskPage;
    } catch (error) {
      message.error((error as Error).message || '加载修谱工作台失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadClans().then(clanId => loadWorkbench(clanId)); }, []);

  function changeClan(nextClanId: string) {
    workspace.setClanId(nextClanId);
    setTaskType('');
    setRisk('');
    setSelectedTask(null);
    void loadWorkbench(nextClanId, 1);
  }

  function searchWorkbench() {
    setSelectedTask(null);
    void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), 1);
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
      message.success('任务状态已刷新，当前任务在最新任务池中已不存在');
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

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card loading={loading}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Typography.Text type="secondary">Workbench</Typography.Text>
          <Typography.Title level={3} style={{ margin: 0 }}>修谱工作台</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            聚合导入异常、审核退回、资料缺失、字辈/代次不一致和关系复核建议，帮助主编、支派负责人和采集员按任务处理修谱问题，而不是在多个页面之间反复查找。
          </Typography.Paragraph>
        </Space>
      </Card>

      <Card>
        <Space wrap align="end" style={{ width: '100%' }}>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">当前宗族</Typography.Text>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: 260 }}
              value={workspace.clanId || String(activeClan?.id || '')}
              onChange={changeClan}
              options={clans.map(clan => ({ value: String(clan.id || ''), label: clanLabel(clan) }))}
              placeholder="请选择宗族"
            />
          </Space>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">问题类型</Typography.Text>
            <Select
              style={{ width: 200 }}
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
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">风险等级</Typography.Text>
            <Select
              style={{ width: 160 }}
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
          <Button type="primary" loading={loading} onClick={searchWorkbench}>查询工作台</Button>
        </Space>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={12} xl={6}><Card><Typography.Text type="secondary">待处理问题</Typography.Text><Typography.Title level={3}>{summary.pendingTaskCount ?? 0}</Typography.Title><Tag>任务池</Tag></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Typography.Text type="secondary">高风险阻塞</Typography.Text><Typography.Title level={3}>{summary.highRiskCount ?? 0}</Typography.Title><Tag color={summary.highRiskCount ? 'error' : 'success'}>{summary.highRiskCount ? '需优先处理' : '暂无阻塞'}</Tag></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Typography.Text type="secondary">资料缺失</Typography.Text><Typography.Title level={3}>{summary.missingSourceCount ?? 0}</Typography.Title><Tag color={summary.missingSourceCount ? 'warning' : 'success'}>{summary.missingSourceCount ? '待补来源' : '来源正常'}</Tag></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Typography.Text type="secondary">代次/字辈问题</Typography.Text><Typography.Title level={3}>{summary.generationIssueCount ?? 0}</Typography.Title><Tag color={summary.generationIssueCount ? 'processing' : 'success'}>{summary.generationIssueCount ? '待校验' : '已校验'}</Tag></Card></Col>
      </Row>

      <Alert
        type="info"
        showIcon
        message="工作台定位"
        description="当前页面只负责发现和组织修谱问题。审批通过/驳回仍进入审核中心；人物、来源、关系的具体维护仍进入对应业务页面。"
      />

      <Card title="修谱问题任务池" loading={loading}>
        <Table<WorkbenchTask>
          size="small"
          bordered
          rowKey="key"
          dataSource={tasks}
          pagination={{
            current: taskPage.pageNo || 1,
            pageSize: taskPage.pageSize || PAGE_SIZE,
            total: taskPage.total || 0,
            showSizeChanger: false,
            onChange: page => void loadWorkbench(workspace.clanId || String(activeClan?.id || ''), page)
          }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无修谱问题。可以先从导入管理、人物档案或来源资料库补充数据。" /> }}
          onRow={row => ({ onClick: () => setSelectedTask(row), style: { cursor: 'pointer' }, title: '点击查看任务详情' })}
          columns={[
            { key: 'type', title: '问题类型', width: 140, render: (_value, row) => row.typeText },
            { key: 'objectName', title: '对象名称', render: (_value, row) => row.objectName },
            { key: 'branchName', title: '所属范围', width: 160, render: (_value, row) => row.branchName },
            { key: 'risk', title: '风险', width: 90, render: (_value, row) => <Tag color={riskColor(row.risk)}>{riskText(row.risk)}</Tag> },
            { key: 'status', title: '状态', width: 120, render: (_value, row) => <Tag color={statusColor(row.status)}>{row.statusText}</Tag> },
            { key: 'suggestion', title: '建议动作', render: (_value, row) => row.suggestion },
            {
              key: 'detail',
              title: '操作',
              width: 90,
              render: (_value, row) => <Button size="small" type="link" onClick={event => { event.stopPropagation(); setSelectedTask(row); }}>详情</Button>
            }
          ]}
        />
      </Card>

      <Drawer
        title="修谱任务详情"
        width={640}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        extra={<Button onClick={() => setSelectedTask(null)}>关闭</Button>}
      >
        {selectedTask ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={riskColor(selectedTask.risk)}>风险：{riskText(selectedTask.risk)}</Tag>
              <Tag color={statusColor(selectedTask.status)}>{selectedTask.statusText}</Tag>
              <Tag color={selectedTask.reviewBlocked ? 'error' : 'success'}>{selectedTask.reviewBlocked ? '阻塞提交审核' : '不阻塞提交审核'}</Tag>
              <Tag color={selectedTaskLocated ? 'success' : 'warning'}>{selectedTaskLocated ? '已定位目标页面' : '未定位到目标页面'}</Tag>
            </Space>
            <Alert
              type={selectedTask.reviewBlocked ? 'warning' : 'info'}
              showIcon
              message={selectedTask.typeText}
              description={display(selectedTask.problemDescription, selectedTask.suggestion)}
            />
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="涉及对象">{display(selectedTask.involvedObject || selectedTask.objectName)}</Descriptions.Item>
              <Descriptions.Item label="所属范围">{display(selectedTask.branchName)}</Descriptions.Item>
              <Descriptions.Item label="风险原因">{display(selectedTask.riskReason)}</Descriptions.Item>
              <Descriptions.Item label="建议处理">{display(selectedTask.suggestion)}</Descriptions.Item>
              <Descriptions.Item label="定位状态">{selectedTaskLocated ? '已定位到目标页面，可返回目标页面继续处理。' : '尚未定位到目标页面，请先点击相关入口。'}</Descriptions.Item>
              <Descriptions.Item label="任务刷新">{taskExistsInCurrentPage(selectedTask) ? '当前任务仍在任务池中。' : '当前任务不在本页任务池中，刷新后可能已完成或被筛选条件隐藏。'}</Descriptions.Item>
              <Descriptions.Item label="相关入口">{display(selectedTask.relatedEntryText, '暂无相关入口')}</Descriptions.Item>
            </Descriptions>
            <Alert
              type="success"
              showIcon
              message="交付体验"
              description="当前抽屉仅解释问题、显示定位状态并支持刷新任务池，不提供认领、处理、忽略、提交审核或审批动作。"
            />
            <Space>
              <Button type="primary" disabled={!relatedView || !onNavigate} onClick={goRelatedEntry}>{selectedTask.relatedEntryText || '前往相关页面'}</Button>
              <Button loading={loading} onClick={() => void refreshTaskStatus()}>刷新任务状态</Button>
              <Button onClick={() => setSelectedTask(null)}>返回任务池</Button>
            </Space>
          </Space>
        ) : null}
      </Drawer>
    </Space>
  );
}
