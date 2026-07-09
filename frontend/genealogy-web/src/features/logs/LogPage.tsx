import { useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Empty, Form, Input, Select, Space, Table, Tag, Timeline } from 'antd';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { logService, toQueryString } from '../../shared/services/logService';
import { toRecordList } from '../../shared/utils/records';

type OperationLog = {
  id?: number | string;
  clanId?: number | string;
  actorId?: number | string;
  actorName?: string;
  operatorName?: string;
  actionType?: string;
  targetType?: string;
  targetId?: number | string;
  targetName?: string;
  targetSummary?: string;
  summary?: string;
  detail?: string;
  requestId?: string;
  clientIp?: string;
  createdAt?: string;
};

type ReviewTask = {
  id?: number | string;
  title?: string;
  targetType?: string;
  targetId?: number | string;
  targetName?: string;
  status?: string;
  submitterId?: number | string;
  submitterName?: string;
  reviewerId?: number | string;
  reviewerName?: string;
  createdAt?: string;
  reviewedAt?: string;
  comment?: string;
};

type ReviewDiff = {
  reviewTaskId?: number | string;
  revisionId?: number | string;
  clanId?: number | string;
  targetType?: string;
  targetId?: number | string;
  targetName?: string;
  changeType?: string;
  diffSummary?: string;
  beforeData?: string;
  afterData?: string;
  fields?: { fieldName?: string; beforeValue?: string; afterValue?: string; changeType?: string }[];
};

type TimelineItem = {
  key: string;
  time?: string;
  title: string;
  desc: string;
  actor?: string | number;
  status: 'done' | 'pending' | 'warn' | 'info';
  source: 'log' | 'review' | 'diff' | 'system';
};

const technicalIdentifierPattern = /(对象\s*ID|人物#\d+|支派#\d+|来源#\d+|fromPersonId|toPersonId|targetId|personId|branchId|sourceId)/i;
const rawIdLikePattern = /^\d+$/;

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function businessDisplay(value: unknown, fallback = '业务信息待维护') {
  const text = String(value ?? '').trim();
  if (!text || rawIdLikePattern.test(text) || technicalIdentifierPattern.test(text)) return fallback;
  return text;
}

function rows(data: unknown): OperationLog[] {
  return toRecordList<OperationLog>(data);
}

function statusText(value?: string) {
  const dict: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已驳回', draft: '草稿', official: '正式', archived: '已归档' };
  return dict[value || ''] || value || '-';
}

function statusColor(value?: string) {
  const status = String(value || '').toLowerCase();
  if (['approved', 'official'].includes(status)) return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'pending') return 'processing';
  return 'default';
}

function actionText(value?: string) {
  const dict: Record<string, string> = {
    person_create: '创建人物', person_update: '更新人物', person_delete: '删除人物',
    relationship_create: '创建关系', relationship_update: '更新关系', relationship_delete: '删除关系',
    source_create: '创建来源', source_update: '更新来源', source_binding_create: '绑定来源',
    review_submit: '提交审核', review_approve: '审核通过', review_reject: '审核驳回',
    person_csv_import: '人物导入', relationship_csv_import: '关系导入'
  };
  return dict[value || ''] || value || '-';
}

function targetTypeText(type?: string) {
  const dict: Record<string, string> = { person: '人物', persons: '人物', relationship: '亲属关系', relationships: '亲属关系', source: '来源资料', sources: '来源资料', branch: '支派', branches: '支派', clan: '宗族', review_task: '审核任务' };
  return dict[type || ''] || type || '对象';
}

function targetText(type?: string, summary?: string, name?: string) {
  const label = targetTypeText(type);
  const businessText = businessDisplay(name || summary, '业务摘要待维护');
  return `${label}：${businessText}`;
}

function targetTextFromLog(log: OperationLog) {
  return targetText(log.targetType, log.targetSummary || log.summary || log.detail, log.targetName);
}

function reviewTaskTitle(task: ReviewTask) {
  return businessDisplay(task.title || task.targetName, targetText(task.targetType, task.comment || task.title, task.targetName));
}

function actorText(_value?: string | number, name?: string) {
  return businessDisplay(name, '操作者待维护');
}

function changeText(value?: string) {
  const dict: Record<string, string> = { added: '新增', removed: '删除', modified: '修改' };
  return dict[value || ''] || value || '-';
}

function fieldText(value?: string) {
  const dict: Record<string, string> = {
    name: '姓名', personName: '姓名', genealogyName: '谱名', courtesyName: '字号', aliasName: '别名', gender: '性别',
    generationNo: '代次', generationWord: '字辈', branchId: '所属支派', sourceId: '来源资料', targetId: '业务对象', targetType: '对象类型',
    fromPersonId: '起点人物', toPersonId: '关联人物', dataStatus: '档案状态', verificationStatus: '审核状态', privacyLevel: '隐私级别',
    birthDate: '出生日期', deathDate: '逝世日期', isLiving: '在世状态', birthPlace: '出生地', residencePlace: '居住地', biography: '人物传记'
  };
  return dict[value || ''] || businessDisplay(value, '字段待维护');
}

function businessValueText(value?: string) {
  return businessDisplay(value, '待维护');
}

function severityOf(log: OperationLog): TimelineItem['status'] {
  const text = `${log.actionType || ''} ${log.summary || ''} ${log.detail || ''}`.toLowerCase();
  if (text.includes('reject') || text.includes('驳回') || text.includes('失败') || text.includes('error')) return 'warn';
  if (text.includes('pending') || text.includes('待审核') || text.includes('提交审核')) return 'pending';
  return 'done';
}

function buildTimeline(logs: OperationLog[], reviewTask: ReviewTask | null, diff: ReviewDiff | null): TimelineItem[] {
  const items: TimelineItem[] = [];
  if (reviewTask?.id) {
    items.push({ key: `review-${reviewTask.id}`, time: reviewTask.createdAt, title: `审核任务：${statusText(reviewTask.status)}`, desc: `${reviewTaskTitle(reviewTask)}，提交人：${actorText(reviewTask.submitterId, reviewTask.submitterName)}`, actor: reviewTask.submitterName, status: reviewTask.status === 'rejected' ? 'warn' : reviewTask.status === 'pending' ? 'pending' : 'done', source: 'review' });
    if (reviewTask.reviewedAt || reviewTask.reviewerName || reviewTask.comment) {
      items.push({ key: `review-result-${reviewTask.id}`, time: reviewTask.reviewedAt, title: reviewTask.status === 'rejected' ? '审核驳回' : reviewTask.status === 'approved' ? '审核通过' : '审核处理中', desc: businessDisplay(reviewTask.comment, '暂无审核意见'), actor: reviewTask.reviewerName, status: reviewTask.status === 'rejected' ? 'warn' : reviewTask.status === 'pending' ? 'pending' : 'done', source: 'review' });
    }
  }
  if (diff?.reviewTaskId || diff?.revisionId) {
    items.push({ key: `diff-${diff.reviewTaskId || diff.revisionId}`, title: `字段级变更：${changeText(diff.changeType)}`, desc: `${businessDisplay(diff.diffSummary, '暂无变更摘要')}，字段差异 ${diff.fields?.length || 0} 项`, status: 'info', source: 'diff' });
  }
  logs.forEach(log => items.push({ key: `log-${log.id || `${log.actionType}-${log.createdAt}`}`, time: log.createdAt, title: actionText(log.actionType), desc: `${businessDisplay(log.summary, '暂无摘要')}｜${targetTextFromLog(log)}`, actor: log.actorName || log.operatorName, status: severityOf(log), source: 'log' }));
  return items.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')) || a.key.localeCompare(b.key));
}

function sourceText(source: TimelineItem['source']) {
  const dict: Record<TimelineItem['source'], string> = { log: '操作日志', review: '审核任务', diff: '字段变更', system: '系统' };
  return dict[source];
}

function timelineColor(status: TimelineItem['status']) {
  if (status === 'done') return 'green';
  if (status === 'warn') return 'red';
  if (status === 'pending') return 'blue';
  return 'gray';
}

export function LogPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [filters, setFilters] = useState({ clanId: workspace.clanId, actionType: '', targetType: '', keyword: '', startTime: '', endTime: '', pageSize: '20' });
  const [traceForm, setTraceForm] = useState({ clanId: workspace.clanId, targetType: '', targetId: '', targetSummary: '', reviewTaskId: '' });
  const [data, setData] = useState<unknown>();
  const [traceLogs, setTraceLogs] = useState<OperationLog[]>([]);
  const [reviewTask, setReviewTask] = useState<ReviewTask | null>(null);
  const [reviewDiff, setReviewDiff] = useState<ReviewDiff | null>(null);
  const [result, setResult] = useState<unknown>();
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof filters, value: string) { setFilters(prev => ({ ...prev, [key]: value })); }
  function query(source = filters) { return toQueryString(source); }
  async function list() { const q = query({ ...filters, clanId: filters.clanId || workspace.clanId }); const res: any = await logService.listOperations(q); setData(res); notify({ message: `日志查询完成，共 ${res?.total ?? res?.records?.length ?? 0} 条` }); }
  async function stats() { const q = query({ ...filters, clanId: filters.clanId || workspace.clanId }); const res: any = await logService.getOperationStats(q); setResult({ message: `日志总数：${res?.totalCount ?? 0}` }); notify({ message: '日志统计完成' }); }
  async function exportCsv() { const q = query({ ...filters, clanId: filters.clanId || workspace.clanId }); const blob = await logService.exportOperations(q); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'operation-logs.csv'; link.click(); URL.revokeObjectURL(link.href); setResult({ message: '日志导出完成' }); notify({ message: '日志导出完成' }); }

  async function loadTrace() {
    const clanId = traceForm.clanId || workspace.clanId;
    if (!clanId) { notify({ message: '请先选择宗族' }, true); return; }
    if (!traceForm.targetType && !traceForm.targetId && !traceForm.reviewTaskId) { notify({ message: '请先从日志列表选择一条业务记录' }, true); return; }
    if (loading) return;
    setLoading(true);
    try {
      let nextDiff: ReviewDiff | null = null;
      let nextReviewTask: ReviewTask | null = null;
      if (traceForm.reviewTaskId) {
        nextDiff = await logService.getReviewTaskDiff(traceForm.reviewTaskId).catch(() => null) as ReviewDiff | null;
        const pendingTasks = toRecordList<ReviewTask>(await logService.listPendingReviewTasks(clanId).catch(() => []));
        nextReviewTask = pendingTasks.find(task => String(task.id) === String(traceForm.reviewTaskId)) || { id: traceForm.reviewTaskId, targetType: nextDiff?.targetType, targetId: nextDiff?.targetId, targetName: nextDiff?.targetName, status: nextDiff ? 'pending' : undefined, title: nextDiff?.diffSummary };
      }
      const targetType = traceForm.targetType || nextDiff?.targetType || nextReviewTask?.targetType || '';
      const targetId = traceForm.targetId || String(nextDiff?.targetId || nextReviewTask?.targetId || '');
      const queryParts = new URLSearchParams();
      queryParts.set('clanId', clanId);
      queryParts.set('pageSize', '100');
      if (targetType) queryParts.set('targetType', targetType);
      if (targetId) queryParts.set('targetId', targetId);
      const objectLogs = rows(await logService.listOperations(queryParts.toString()).catch(() => []));
      const taskLogs = traceForm.reviewTaskId ? rows(await logService.listOperations(`clanId=${clanId}&targetType=review_task&targetId=${traceForm.reviewTaskId}&pageSize=100`).catch(() => [])) : [];
      const merged = [...objectLogs, ...taskLogs].filter((log, index, arr) => arr.findIndex(item => String(item.id) === String(log.id)) === index);
      setTraceLogs(merged);
      setReviewTask(nextReviewTask);
      setReviewDiff(nextDiff);
      setResult({ message: `追踪完成：日志 ${merged.length} 条，字段差异 ${nextDiff?.fields?.length || 0} 项` });
      notify({ message: '追踪链路已生成' });
    } catch (error) {
      notify({ message: (error as Error).message || '追踪链路查询失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  function applyTraceFromLog(row: OperationLog) {
    const summary = targetTextFromLog(row);
    setTraceForm(prev => ({ ...prev, clanId: String(row.clanId || prev.clanId || workspace.clanId), targetType: String(row.targetType || ''), targetId: String(row.targetId || ''), targetSummary: summary, reviewTaskId: row.targetType === 'review_task' ? String(row.targetId || '') : prev.reviewTaskId }));
    setResult({ message: `已选择追踪对象：${summary}` });
  }

  const timeline = useMemo(() => buildTimeline(traceLogs, reviewTask, reviewDiff), [traceLogs, reviewTask, reviewDiff]);
  const logRows = rows(data);
  const actionTypes = useMemo(() => { const map = new Map<string, number>(); traceLogs.forEach(log => map.set(display(log.actionType, 'unknown'), (map.get(display(log.actionType, 'unknown')) || 0) + 1)); return Array.from(map.entries()).sort((a, b) => b[1] - a[1]); }, [traceLogs]);

  return (
    <div className="audit-trace-page">
      <Card title="操作日志与审核流完整追踪"><Descriptions size="small" bordered column={4}><Descriptions.Item label="当前日志">{logRows.length || '-'}</Descriptions.Item><Descriptions.Item label="追踪日志">{traceLogs.length || '-'}</Descriptions.Item><Descriptions.Item label="字段差异">{reviewDiff?.fields?.length || '-'}</Descriptions.Item><Descriptions.Item label="审核状态"><Tag color={statusColor(reviewTask?.status)}>{statusText(reviewTask?.status)}</Tag></Descriptions.Item></Descriptions></Card>
      <div className="page-grid two audit-query-grid"><Card title="日志审计查询"><Form layout="vertical"><Form.Item label="当前宗族"><Input value={workspace.clanId ? '已选择当前宗族' : '未选择宗族'} disabled readOnly /></Form.Item><Form.Item label="动作类型"><Input value={filters.actionType} onChange={e => set('actionType', e.target.value)} placeholder="例如：创建人物 / 更新人物" /></Form.Item><Form.Item label="对象类型"><Select value={filters.targetType} onChange={value => set('targetType', value)} options={[{ value: '', label: '全部' }, { value: 'person', label: '人物' }, { value: 'relationship', label: '亲属关系' }, { value: 'source', label: '来源资料' }, { value: 'branch', label: '支派' }, { value: 'clan', label: '宗族' }, { value: 'review_task', label: '审核任务' }]} /></Form.Item><Form.Item label="关键词"><Input value={filters.keyword} onChange={e => set('keyword', e.target.value)} placeholder="姓名、来源名、支派名或摘要" /></Form.Item><Form.Item label="开始时间"><Input value={filters.startTime} onChange={e => set('startTime', e.target.value)} placeholder="2026-06-01T00:00:00" /></Form.Item><Form.Item label="结束时间"><Input value={filters.endTime} onChange={e => set('endTime', e.target.value)} placeholder="2026-06-30T23:59:59" /></Form.Item><Form.Item label="每页数量"><Input value={filters.pageSize} onChange={e => set('pageSize', e.target.value)} /></Form.Item></Form><Space wrap><Button type="primary" onClick={() => void list()}>查询</Button><Button onClick={() => void stats()}>统计</Button><Button onClick={() => void exportCsv()}>导出 CSV</Button></Space>{result ? <Alert type="success" showIcon message={display((result as any).message || result)} style={{ marginTop: 12 }} /> : null}</Card><Card title="审核流追踪"><Descriptions size="small" bordered column={1}><Descriptions.Item label="追踪对象">{traceForm.targetSummary || '请先在日志列表中选择一条记录'}</Descriptions.Item><Descriptions.Item label="对象类型">{targetTypeText(traceForm.targetType)}</Descriptions.Item></Descriptions><Space style={{ marginTop: 12 }}><Button type="primary" disabled={loading || !traceForm.targetId} loading={loading} onClick={() => void loadTrace()}>{loading ? '追踪中...' : '生成追踪链路'}</Button></Space><Alert type="info" showIcon message="点击下方日志的“追踪”按钮带入对象；界面只展示业务摘要，不展示技术标识。" style={{ marginTop: 12 }} /></Card></div>
      <div className="page-grid two audit-query-grid"><Card title="操作与审核时间线">{timeline.length ? <Timeline items={timeline.map(item => ({ color: timelineColor(item.status), children: <div><Space><Tag>{sourceText(item.source)}</Tag><strong>{item.title}</strong></Space><p>{item.desc}</p><span>{display(item.time, '时间未记录')} · 操作者 {actorText(item.actor)}</span></div> }))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无追踪数据，请先从日志列表选择业务记录后生成追踪链路。" />}</Card><Card title="追踪摘要"><Descriptions size="small" bordered column={1}><Descriptions.Item label="对象">{traceForm.targetSummary || targetText(reviewDiff?.targetType, reviewDiff?.diffSummary, reviewDiff?.targetName)}</Descriptions.Item><Descriptions.Item label="审核任务">{reviewTask ? statusText(reviewTask.status) : '-'}</Descriptions.Item><Descriptions.Item label="审核状态"><Tag color={statusColor(reviewTask?.status)}>{statusText(reviewTask?.status)}</Tag></Descriptions.Item><Descriptions.Item label="变更记录">{businessDisplay(reviewDiff?.diffSummary, reviewDiff ? '字段变更已记录' : '-')}</Descriptions.Item></Descriptions><Space wrap style={{ marginTop: 12 }}>{actionTypes.length ? actionTypes.map(([name, count]) => <Tag key={name}>{actionText(name)} × {count}</Tag>) : <Tag>暂无动作分布</Tag>}</Space>{reviewDiff ? <Table size="small" bordered style={{ marginTop: 12 }} rowKey={(row: any, index) => `${fieldText(row.fieldName)}-${index}`} dataSource={reviewDiff.fields || []} pagination={false} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无字段差异" /> }} columns={[{ key: 'fieldName', title: '字段', render: (_value, row: any) => fieldText(row.fieldName) }, { key: 'beforeValue', title: '变更前', render: (_value, row: any) => businessValueText(row.beforeValue) }, { key: 'afterValue', title: '变更后', render: (_value, row: any) => businessValueText(row.afterValue) }, { key: 'changeType', title: '类型', render: (_value, row: any) => changeText(row.changeType) }]} /> : null}</Card></div>
      <Card title="审计日志列表"><Table<OperationLog> size="small" bordered rowKey={(row, index) => String(row.id || index)} dataSource={logRows} pagination={false} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无审计日志" /> }} columns={[{ key: 'actionType', title: '动作', render: (_value, row) => actionText(row.actionType) }, { key: 'targetSummary', title: '业务对象', render: (_value, row) => targetTextFromLog(row) }, { key: 'actorName', title: '操作者', render: (_value, row) => actorText(row.actorId, row.actorName || row.operatorName) }, { key: 'summary', title: '摘要', render: (_value, row) => businessDisplay(row.summary, '暂无摘要') }, { key: 'createdAt', title: '时间', dataIndex: 'createdAt' }, { key: 'trace', title: '追踪', width: 90, render: (_value, row) => <Button size="small" type="link" onClick={() => applyTraceFromLog(row)}>追踪</Button> }]} /></Card>
    </div>
  );
}
