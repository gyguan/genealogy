import { useEffect, useMemo, useState } from 'react';
import type { Key, ReactNode } from 'react';
import {
  AuditOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ExportOutlined,
  FileSearchOutlined, PlusOutlined, ReloadOutlined, SafetyCertificateOutlined,
  SettingOutlined, TeamOutlined
} from '@ant-design/icons';
import {
  Button, Card, Col, Descriptions, Drawer, Dropdown, Form, Grid, Input, Modal,
  Pagination, Progress, Row, Select, Skeleton, Space, Statistic, Table, Tag, Typography
} from 'antd';
import type { MenuProps } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { EmptyState, PageFeedback } from '../../shared/ui/Feedback';
import { feedback } from '../../shared/ui/OperationFeedback';
import { toRecordList } from '../../shared/utils/records';
import './editing-workspace-prototype.css';

type ViewKey = 'reviewCenter' | 'personArchive' | 'sourceLibrary' | 'treeProduct' | 'mvp1Wizard';
type Props = { onNavigate?: (view: ViewKey) => void };
type Task = {
  key: string; taskName?: string; bookName?: string; creatorName?: string; createdAt?: string;
  type: string; typeText: string; objectName: string; branchName: string;
  risk: 'high' | 'medium' | 'low'; status: 'pending' | 'processing' | 'ready' | 'blocked';
  statusText: string; suggestion: string; problemDescription?: string; involvedObject?: string;
  riskReason?: string; reviewBlocked?: boolean; relatedEntryType?: ViewKey; relatedEntryId?: string;
  relatedEntryText?: string; statusDescription?: string; updatedAt?: string;
};
type TaskPage = { records?: Task[]; total?: number; pageNo?: number; pageSize?: number; totalPages?: number };
type Clan = { id?: string | number; clanName?: string; name?: string; surname?: string };
type QualityRule = { code: string; name: string; outcome: string; blockLevel: string; affectedSubjectCount: number; message?: string; affectedSubjectIds: string[] };
type QualityResult = {
  checkId: string; status: string; scopeType: string; mode: string; reviewBlocked: boolean;
  summary?: { subjectCount: number; issueCount: number; blockingIssueCount: number; warningIssueCount: number };
  rules: QualityRule[]; completedAt?: string; failureMessage?: string;
};
type Filters = { keyword: string; status: string[]; type: string[]; risk: string[] };

const PAGE_SIZE = 10;
const EMPTY_FILTERS: Filters = { keyword: '', status: [], type: [], risk: [] };
const statusOptions = [
  { value: 'pending', label: '待处理' }, { value: 'processing', label: '处理中' },
  { value: 'ready', label: '待确认' }, { value: 'blocked', label: '已阻塞' }
];
const typeOptions = [
  { value: 'review_follow_up', label: '审核跟进' }, { value: 'missing_source', label: '来源证据缺失' },
  { value: 'generation_mismatch', label: '字辈/代次待补' }, { value: 'relationship_check', label: '关系复核' },
  { value: 'import_follow_up', label: '导入异常' }
];
const riskOptions = [{ value: 'high', label: '高' }, { value: 'medium', label: '中' }, { value: 'low', label: '低' }];

function unwrap<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) return ((payload as { data?: T }).data ?? fallback);
  return (payload ?? fallback) as T;
}
function clanName(clan?: Clan) { return clan?.clanName || clan?.name || clan?.surname || '未命名宗族'; }
function taskTitle(task: Task) { return task.taskName || `${task.typeText}：${task.objectName}`; }
function riskColor(risk: Task['risk']) { return risk === 'high' ? 'error' : risk === 'medium' ? 'warning' : 'success'; }
function statusColor(status: Task['status']) { return status === 'blocked' ? 'error' : status === 'processing' ? 'processing' : status === 'ready' ? 'success' : 'default'; }
function formatTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}
function queryString(clanId: string, page: number, filters: Filters) {
  const params = new URLSearchParams({ clanId, pageNo: String(page), pageSize: String(PAGE_SIZE) });
  if (filters.keyword.trim()) params.set('keyword', filters.keyword.trim());
  filters.status.forEach(value => params.append('status', value));
  filters.type.forEach(value => params.append('type', value));
  filters.risk.forEach(value => params.append('risk', value));
  return params;
}
function cardTitle(title: ReactNode, actions?: ReactNode) {
  return <div className="workbench-card-title"><span>{title}</span>{actions ? <div className="workbench-card-actions">{actions}</div> : null}</div>;
}

export function EditingWorkspacePrototypePage({ onNavigate }: Props) {
  const workspace = useWorkspace();
  const screens = Grid.useBreakpoint();
  const [clans, setClans] = useState<Clan[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [taskPage, setTaskPage] = useState<TaskPage>({ records: [], total: 0, pageNo: 1, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [quality, setQuality] = useState<QualityResult | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityError, setQualityError] = useState('');
  const [qualityScope, setQualityScope] = useState<'QUERY' | 'DRAFT_IDS' | 'WORKBENCH_SESSION'>('QUERY');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const activeClan = clans.find(item => String(item.id || '') === workspace.clanId) || clans[0];
  const currentClanId = workspace.clanId || String(activeClan?.id || '');
  const tasks = useMemo(() => toRecordList<Task>(taskPage.records || []), [taskPage.records]);
  const selectedTasks = useMemo(() => tasks.filter(task => selectedKeys.includes(task.key)), [tasks, selectedKeys]);
  const total = Number(taskPage.total || 0);
  const metrics = useMemo(() => {
    const processing = tasks.filter(task => task.status === 'processing').length;
    const ready = tasks.filter(task => task.status === 'ready').length;
    const blocked = tasks.filter(task => task.status === 'blocked' || task.reviewBlocked).length;
    const completed = Math.max(0, tasks.length - processing - blocked);
    return { processing, ready, blocked, completion: tasks.length ? Math.round(completed / tasks.length * 100) : 0 };
  }, [tasks]);
  const priorityTasks = useMemo(() => tasks.filter(task => task.status === 'blocked' || task.risk === 'high').slice(0, 5), [tasks]);

  async function loadClans() {
    try {
      const rows = toRecordList<Clan>(unwrap(await apiClient.get('/clans'), []));
      setClans(rows);
      const next = workspace.clanId || String(rows[0]?.id || '');
      if (next && next !== workspace.clanId) workspace.setClanId(next);
    } catch (cause) { feedback.error(cause instanceof Error ? cause.message : '宗族列表加载失败'); }
  }
  async function loadTasks(nextPage = page, nextFilters = appliedFilters) {
    if (!currentClanId) return;
    setLoading(true); setError('');
    try {
      const result = unwrap<TaskPage>(await apiClient.get(`/workbench/tasks?${queryString(currentClanId, nextPage, nextFilters)}`), { records: [], total: 0 });
      setTaskPage(result); setPage(nextPage);
      if (currentTask) setCurrentTask(toRecordList<Task>(result.records || []).find(item => item.key === currentTask.key) || null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '任务加载失败，请稍后重试'); }
    finally { setLoading(false); }
  }
  async function loadLatestQuality() {
    if (!currentClanId) return;
    try { setQuality(await apiClient.get<QualityResult | null>(`/workbench/quality-checks/latest?clanId=${encodeURIComponent(currentClanId)}`)); }
    catch { setQuality(null); }
  }
  useEffect(() => { void loadClans(); }, []);
  useEffect(() => { if (currentClanId) { void loadTasks(1, appliedFilters); void loadLatestQuality(); } }, [currentClanId]);

  function submitSearch() { setAppliedFilters(filters); setSelectedKeys([]); void loadTasks(1, filters); }
  function resetSearch() { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setSelectedKeys([]); void loadTasks(1, EMPTY_FILTERS); }
  function navigate(view: ViewKey, task?: Task) {
    if (task?.relatedEntryId) {
      if (view === 'personArchive' || view === 'treeProduct') workspace.patch({ personId: task.relatedEntryId });
      if (view === 'reviewCenter') workspace.patch({ reviewTaskId: task.relatedEntryId });
      if (view === 'sourceLibrary') workspace.patch({ sourceId: task.relatedEntryId, sourceFocusReason: task.type });
    }
    onNavigate?.(view);
  }
  async function runQuality(gate = false) {
    if (!currentClanId || qualityLoading) return;
    if (qualityScope === 'DRAFT_IDS' && !selectedKeys.length) { setQualityError('请先从当前任务列表选择需要检查的草稿。'); return; }
    setQualityLoading(true); setQualityError('');
    try {
      const endpoint = gate ? '/workbench/quality-checks/submission-gate' : '/workbench/quality-checks';
      const result = await apiClient.post<QualityResult>(`${endpoint}?clanId=${encodeURIComponent(currentClanId)}`, {
        scopeType: qualityScope, mode: gate ? 'REVIEW_GATE' : 'FULL',
        subjectIds: qualityScope === 'DRAFT_IDS' ? selectedKeys.map(String) : [],
        query: Object.fromEntries(queryString(currentClanId, page, appliedFilters)), ruleCodes: []
      });
      setQuality(result);
      feedback[result.reviewBlocked ? 'warning' : 'success'](result.reviewBlocked ? '检查完成，存在阻断问题' : '质量检查已完成');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '质量检查失败';
      setQualityError(message); feedback.error(message);
    } finally { setQualityLoading(false); }
  }
  async function bulkCheck() {
    if (!selectedTasks.length || bulkLoading) return;
    setBulkLoading(true);
    const results = await Promise.allSettled(selectedTasks.map(task => apiClient.post(`/workbench/tasks/${encodeURIComponent(task.key)}/actions`, {
      action: 'mark_checked', comment: '批量标记已核查', expectedUpdatedAt: task.updatedAt || null
    })));
    const failed = results.filter(result => result.status === 'rejected').length;
    feedback[failed ? 'warning' : 'success'](`批量核查完成：成功 ${results.length - failed} 项，失败 ${failed} 项`);
    setSelectedKeys([]); setBulkLoading(false); void loadTasks(page, appliedFilters);
  }
  function exportCsv() {
    const lines = [['任务名称', '任务类型', '状态', '优先级', '涉及对象'], ...tasks.map(task => [taskTitle(task), task.typeText, task.statusText, task.risk, task.objectName])];
    const blob = new Blob([`\uFEFF${lines.map(row => row.map(value => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'workbench-tasks.csv'; link.click(); URL.revokeObjectURL(link.href);
  }

  const qualityMenu: MenuProps = {
    items: [
      { key: 'QUERY', label: '当前查询范围' },
      { key: 'DRAFT_IDS', label: `已选草稿（${selectedKeys.length}）` },
      { key: 'WORKBENCH_SESSION', label: '整个修谱会话' }
    ],
    onClick: info => setQualityScope(info.key as typeof qualityScope)
  };
  const columns = [
    { title: '任务名称', dataIndex: 'taskName', key: 'taskName', width: 230, render: (_: unknown, task: Task) => <Button type="link" className="workbench-task-link" onClick={() => setCurrentTask(task)}>{taskTitle(task)}</Button> },
    { title: '任务类型', dataIndex: 'typeText', key: 'typeText', width: 150 },
    { title: '涉及对象', dataIndex: 'objectName', key: 'objectName', width: 170, ellipsis: true },
    { title: '所属范围', dataIndex: 'branchName', key: 'branchName', width: 140, ellipsis: true },
    { title: '风险', dataIndex: 'risk', key: 'risk', width: 86, render: (value: Task['risk']) => <Tag color={riskColor(value)}>{value === 'high' ? '高' : value === 'medium' ? '中' : '低'}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 110, render: (value: Task['status'], task: Task) => <Tag color={statusColor(value)}>{task.statusText}</Tag> },
    { title: '建议动作', dataIndex: 'suggestion', key: 'suggestion', width: 240, ellipsis: true },
    { title: '操作', key: 'actions', width: 150, fixed: 'right' as const, render: (_: unknown, task: Task) => <Space size={2}><Button type="link" onClick={() => setCurrentTask(task)}>查看</Button><Button type="link" disabled={!task.relatedEntryType || !onNavigate} onClick={() => task.relatedEntryType && navigate(task.relatedEntryType, task)}>处理</Button></Space> }
  ];

  const qualityActions = <Space wrap>
    <Dropdown menu={qualityMenu}><Button>{qualityScope === 'QUERY' ? '当前查询范围' : qualityScope === 'DRAFT_IDS' ? `已选草稿（${selectedKeys.length}）` : '整个修谱会话'}</Button></Dropdown>
    <Button loading={qualityLoading} onClick={() => void runQuality(false)}>执行检查</Button>
    <Button type="primary" loading={qualityLoading} onClick={() => void runQuality(true)}>提交审核检查</Button>
  </Space>;
  const taskActions = <Space wrap>
    <Button icon={<ExportOutlined />} disabled={!tasks.length} onClick={exportCsv}>导出</Button>
    <Button icon={<SettingOutlined />} onClick={() => setTemplateOpen(true)}>任务模板</Button>
    <Button type="primary" disabled={!selectedKeys.length} loading={bulkLoading} onClick={() => void bulkCheck()}>批量核查</Button>
  </Space>;

  return <div className="workbench-prototype-page">
    <Card className="workbench-query-card" title={cardTitle('修谱工作台', <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('mvp1Wizard')}>新建修谱</Button>)}>
      <Form layout="vertical" onFinish={submitSearch}>
        <Row gutter={[16, 0]} align="bottom">
          <Col xs={24} md={6}><Form.Item label="宗族"><Select value={currentClanId || undefined} onChange={value => workspace.setClanId(value)} options={clans.map(clan => ({ value: String(clan.id || ''), label: clanName(clan) }))} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="谱书"><Select disabled value={currentClanId || undefined} options={currentClanId ? [{ value: currentClanId, label: `${clanName(activeClan)}族谱` }] : []} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="关键词"><Input value={filters.keyword} onChange={event => setFilters(previous => ({ ...previous, keyword: event.target.value }))} placeholder="任务、人物、关系或来源" allowClear /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="任务状态"><Select mode="multiple" value={filters.status} onChange={value => setFilters(previous => ({ ...previous, status: value }))} options={statusOptions} maxTagCount="responsive" allowClear /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="任务类型"><Select mode="multiple" value={filters.type} onChange={value => setFilters(previous => ({ ...previous, type: value }))} options={typeOptions} maxTagCount="responsive" allowClear /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="风险等级"><Select mode="multiple" value={filters.risk} onChange={value => setFilters(previous => ({ ...previous, risk: value }))} options={riskOptions} maxTagCount="responsive" allowClear /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item><Space wrap><Button onClick={resetSearch}>重置</Button><Button type="primary" htmlType="submit" loading={loading}>查询</Button></Space></Form.Item></Col>
        </Row>
      </Form>
    </Card>

    <section className="workbench-overview-section" aria-label="工作台总览">
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}><Card><Statistic title="任务总数" value={total} prefix={<AuditOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="处理中" value={metrics.processing} prefix={<ReloadOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="待确认" value={metrics.ready} prefix={<CheckCircleOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="阻塞问题" value={metrics.blocked} prefix={<ExclamationCircleOutlined />} valueStyle={metrics.blocked ? { color: '#cf1322' } : undefined} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card title={cardTitle('当前任务', <Typography.Text type="secondary">当前页完成率 {metrics.completion}%</Typography.Text>)}>
            <Progress percent={metrics.completion} showInfo={false} />
            <div className="workbench-priority-list">
              {priorityTasks.length ? priorityTasks.map(task => <button key={task.key} type="button" onClick={() => setCurrentTask(task)}>
                <span><Tag color={task.status === 'blocked' ? 'error' : riskColor(task.risk)}>{task.status === 'blocked' ? '阻塞' : '高风险'}</Tag><strong>{taskTitle(task)}</strong><small>{task.objectName} · {task.branchName}</small></span><span>查看详情 ›</span>
              </button>) : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="当前查询范围暂无高风险或阻塞任务" />}
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card title={cardTitle('快捷入口', <Typography.Text type="secondary">保持当前宗族上下文</Typography.Text>)}>
            <div className="workbench-entry-grid">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('mvp1Wizard')}>新建修谱</Button>
              <Button icon={<TeamOutlined />} onClick={() => navigate('personArchive')}>人物档案</Button>
              <Button icon={<FileSearchOutlined />} onClick={() => navigate('sourceLibrary')}>来源资料</Button>
              <Button icon={<SafetyCertificateOutlined />} onClick={() => navigate('treeProduct')}>世系图谱</Button>
            </div>
          </Card>
        </Col>
      </Row>
    </section>

    <Card className="workbench-quality-card" title={cardTitle('数据质量检查', qualityActions)}>
      {qualityError ? <PageFeedback tone="error" title="质量检查失败" description={qualityError} /> : null}
      {!quality && !qualityLoading ? <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="尚未执行质量检查，建议在提交审核前完成检查" /> : null}
      {qualityLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : null}
      {quality ? <>
        <div className="workbench-quality-summary">
          <Statistic title="检查对象" value={quality.summary?.subjectCount || 0} />
          <Statistic title="发现问题" value={quality.summary?.issueCount || 0} />
          <Statistic title="警告" value={quality.summary?.warningIssueCount || 0} />
          <Statistic title="阻断" value={quality.summary?.blockingIssueCount || 0} valueStyle={quality.reviewBlocked ? { color: '#cf1322' } : undefined} />
        </div>
        <PageFeedback tone={quality.reviewBlocked ? 'error' : 'success'} title={quality.reviewBlocked ? '存在阻断问题，暂不能提交审核' : '质量检查完成，可以继续处理'} description={`最近检查：${formatTime(quality.completedAt)}`} />
        <div className="workbench-quality-rule-list">
          {quality.rules.filter(rule => rule.affectedSubjectCount > 0).map(rule => <button type="button" key={rule.code} onClick={() => { const id = rule.affectedSubjectIds[0]; const task = tasks.find(item => item.key === id); if (task) setCurrentTask(task); }}>
            <span><strong>{rule.name}</strong><small>{rule.message || '发现数据质量问题'}</small></span><span><Tag color={rule.blockLevel === 'BLOCKING' ? 'error' : 'warning'}>{rule.blockLevel === 'BLOCKING' ? '阻断' : '警告'}</Tag>{rule.affectedSubjectCount} 项</span>
          </button>)}
        </div>
      </> : null}
    </Card>

    <Card className="workbench-task-card" title={cardTitle(`修谱任务（共 ${total} 条）`, taskActions)}>
      {error ? <PageFeedback tone="error" title="任务列表加载失败" description={error} action={<Button onClick={() => void loadTasks(page, appliedFilters)}>重试</Button>} /> : null}
      {screens.md ? <Table<Task> rowKey="key" size="middle" loading={loading} dataSource={tasks} columns={columns} pagination={false} rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }} scroll={{ x: 1250 }} onRow={task => ({ onClick: () => setCurrentTask(task), style: { cursor: 'pointer' } })} /> : <div className="workbench-mobile-list">{loading ? <Skeleton active /> : tasks.map(task => <Card key={task.key} size="small" onClick={() => setCurrentTask(task)}><Space direction="vertical" size={6}><Typography.Text strong>{taskTitle(task)}</Typography.Text><Space><Tag color={riskColor(task.risk)}>{task.risk === 'high' ? '高' : task.risk === 'medium' ? '中' : '低'}</Tag><Tag color={statusColor(task.status)}>{task.statusText}</Tag></Space><Typography.Text type="secondary">{task.objectName} · {task.branchName}</Typography.Text></Space></Card>)}</div>}
      <div className="workbench-pagination"><Pagination current={page} pageSize={PAGE_SIZE} total={total} showSizeChanger={false} showTotal={value => `共 ${value} 条`} onChange={value => void loadTasks(value, appliedFilters)} /></div>
    </Card>

    <Drawer className="workbench-task-detail-drawer" width={720} open={Boolean(currentTask)} onClose={() => setCurrentTask(null)} title={currentTask ? taskTitle(currentTask) : '任务详情'} extra={currentTask ? <Button type="primary" disabled={!currentTask.relatedEntryType || !onNavigate} onClick={() => currentTask.relatedEntryType && navigate(currentTask.relatedEntryType, currentTask)}>前往处理</Button> : null}>
      {currentTask ? <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Descriptions title="任务摘要" column={1} bordered size="small" items={[
          { key: 'type', label: '任务类型', children: currentTask.typeText }, { key: 'status', label: '状态', children: <Tag color={statusColor(currentTask.status)}>{currentTask.statusText}</Tag> },
          { key: 'risk', label: '风险等级', children: <Tag color={riskColor(currentTask.risk)}>{currentTask.risk === 'high' ? '高' : currentTask.risk === 'medium' ? '中' : '低'}</Tag> },
          { key: 'object', label: '涉及对象', children: currentTask.objectName }, { key: 'branch', label: '所属范围', children: currentTask.branchName }
        ]} />
        <Card size="small" title="问题与建议"><Typography.Paragraph>{currentTask.problemDescription || currentTask.statusDescription || '请结合任务信息完成核查。'}</Typography.Paragraph><Typography.Text strong>建议动作</Typography.Text><Typography.Paragraph>{currentTask.suggestion}</Typography.Paragraph></Card>
        <Card size="small" title="风险与影响"><Typography.Paragraph>{currentTask.riskReason || '该问题可能影响谱系准确性、证据完整性或审核准入。'}</Typography.Paragraph></Card>
      </Space> : null}
    </Drawer>

    <Modal open={templateOpen} title="任务模板" footer={<Button onClick={() => setTemplateOpen(false)}>关闭</Button>} onCancel={() => setTemplateOpen(false)}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {typeOptions.map(item => <Card key={item.value} size="small"><Typography.Text strong>{item.label}</Typography.Text><br /><Typography.Text type="secondary">由系统规则自动识别并生成，支持在工作台统一处理。</Typography.Text></Card>)}
      </Space>
    </Modal>
  </div>;
}
