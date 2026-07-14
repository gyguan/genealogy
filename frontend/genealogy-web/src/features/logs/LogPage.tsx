import { useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Empty, Form, Input, Select, Space, Table, Tag, Timeline } from 'antd';
import { apiClient } from '../../shared/api/client';
import type {
  CheckTaskResponse,
  FieldDiff,
  OperationLogPage,
  OperationLogResponse,
  OperationLogStatsResponse,
  ReviewDiffResponse
} from '../../shared/api/generated/tracking-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';

type TimelineItem = {
  key: string;
  time?: string | null;
  title: string;
  desc: string;
  actor?: string | number | null;
  status: 'done' | 'pending' | 'warn' | 'info';
  source: 'log' | 'review' | 'diff' | 'system';
};

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function statusText(value?: string | null) {
  const dict: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回',
    draft: '草稿',
    official: '正式',
    archived: '已归档'
  };
  return dict[value || ''] || value || '-';
}

function statusColor(value?: string | null) {
  const status = String(value || '').toLowerCase();
  if (['approved', 'official'].includes(status)) return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'pending') return 'processing';
  return 'default';
}

function actionText(value?: string | null) {
  const dict: Record<string, string> = {
    person_create: '创建人物',
    person_update: '更新人物',
    person_delete: '删除人物',
    relationship_create: '创建关系',
    relationship_update: '更新关系',
    relationship_delete: '删除关系',
    source_create: '创建来源',
    source_update: '更新来源',
    source_binding_create: '绑定来源',
    review_submit: '提交审核',
    review_approve: '审核通过',
    review_reject: '审核驳回',
    person_csv_import: '人物导入',
    relationship_csv_import: '关系导入'
  };
  return dict[value || ''] || value || '-';
}

function targetTypeText(type?: string | null) {
  const dict: Record<string, string> = {
    person: '人物',
    persons: '人物',
    relationship: '亲属关系',
    relationships: '亲属关系',
    source: '来源资料',
    sources: '来源资料',
    branch: '支派',
    branches: '支派',
    clan: '宗族',
    review_task: '审核任务'
  };
  return dict[type || ''] || type || '对象';
}

function targetText(type?: string | null, summary?: string | null) {
  return `${targetTypeText(type)}：${display(summary, '未提供业务摘要')}`;
}

function targetTextFromLog(log: OperationLogResponse) {
  return targetText(log.targetType, log.summary || log.detail);
}

function reviewTaskTitle(task: CheckTaskResponse) {
  return display(task.title, targetText(task.targetType, task.diffSummary || task.reviewComment || task.title));
}

function actorText(value?: string | number | null) {
  return value === null || value === undefined || value === '' ? '系统/未知操作者' : '操作者已记录';
}

function changeText(value?: string | null) {
  const dict: Record<string, string> = { added: '新增', removed: '删除', modified: '修改' };
  return dict[value || ''] || value || '-';
}

function severityOf(log: OperationLogResponse): TimelineItem['status'] {
  const text = `${log.actionType || ''} ${log.summary || ''} ${log.detail || ''}`.toLowerCase();
  if (text.includes('reject') || text.includes('驳回') || text.includes('失败') || text.includes('error')) return 'warn';
  if (text.includes('pending') || text.includes('待审核') || text.includes('提交审核')) return 'pending';
  return 'done';
}

function buildTimeline(
  logs: OperationLogResponse[],
  reviewTask: CheckTaskResponse | null,
  diff: ReviewDiffResponse | null
): TimelineItem[] {
  const items: TimelineItem[] = [];
  if (reviewTask) {
    items.push({
      key: `review-${reviewTask.id}`,
      time: reviewTask.createdAt,
      title: `审核任务：${statusText(reviewTask.status)}`,
      desc: `${reviewTaskTitle(reviewTask)}，提交人：${actorText(reviewTask.submitterId)}`,
      actor: reviewTask.submitterId,
      status: reviewTask.status === 'rejected' ? 'warn' : reviewTask.status === 'pending' ? 'pending' : 'done',
      source: 'review'
    });
    if (reviewTask.reviewedAt || reviewTask.reviewerId || reviewTask.reviewComment) {
      items.push({
        key: `review-result-${reviewTask.id}`,
        time: reviewTask.reviewedAt,
        title: reviewTask.status === 'rejected' ? '审核驳回' : reviewTask.status === 'approved' ? '审核通过' : '审核处理中',
        desc: display(reviewTask.reviewComment, '暂无审核意见'),
        actor: reviewTask.reviewerId,
        status: reviewTask.status === 'rejected' ? 'warn' : reviewTask.status === 'pending' ? 'pending' : 'done',
        source: 'review'
      });
    }
  }
  if (diff) {
    items.push({
      key: `diff-${diff.reviewTaskId}`,
      title: `字段级变更：${changeText(diff.changeType)}`,
      desc: `${display(diff.diffSummary, '暂无变更摘要')}，字段差异 ${diff.fields.length} 项`,
      status: 'info',
      source: 'diff'
    });
  }
  logs.forEach(log => items.push({
    key: `log-${log.id}`,
    time: log.createdAt,
    title: actionText(log.actionType),
    desc: `${display(log.summary, '暂无摘要')}｜${targetTextFromLog(log)}`,
    actor: log.actorId,
    status: severityOf(log),
    source: 'log'
  }));
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
  const [filters, setFilters] = useState({
    clanId: workspace.clanId,
    actionType: '',
    targetType: '',
    keyword: '',
    startTime: '',
    endTime: '',
    pageSize: '20'
  });
  const [traceForm, setTraceForm] = useState({
    clanId: workspace.clanId,
    targetType: '',
    targetId: '',
    targetSummary: '',
    reviewTaskId: ''
  });
  const [data, setData] = useState<OperationLogPage | null>(null);
  const [traceLogs, setTraceLogs] = useState<OperationLogResponse[]>([]);
  const [reviewTask, setReviewTask] = useState<CheckTaskResponse | null>(null);
  const [reviewDiff, setReviewDiff] = useState<ReviewDiffResponse | null>(null);
  const [result, setResult] = useState<{ message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof filters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function query(source = filters) {
    const params = new URLSearchParams();
    Object.entries(source).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }

  async function list() {
    const q = query({ ...filters, clanId: filters.clanId || workspace.clanId });
    const res = await apiClient.get<OperationLogPage>(`/logs/operations${q ? `?${q}` : ''}`);
    setData(res);
    notify({ message: `日志查询完成，共 ${res.total} 条` });
  }

  async function stats() {
    const q = query({ ...filters, clanId: filters.clanId || workspace.clanId });
    const res = await apiClient.get<OperationLogStatsResponse>(`/logs/operations/stats${q ? `?${q}` : ''}`);
    setResult({ message: `日志总数：${res.totalCount}` });
    notify({ message: '日志统计完成' });
  }

  async function exportCsv() {
    const q = query({ ...filters, clanId: filters.clanId || workspace.clanId });
    const blob = await apiClient.download(`/logs/operations/export.csv${q ? `?${q}` : ''}`);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'operation-logs.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    setResult({ message: '日志导出完成' });
    notify({ message: '日志导出完成' });
  }

  async function loadTrace() {
    const clanId = traceForm.clanId || workspace.clanId;
    if (!clanId) { notify({ message: '请先选择宗族' }, true); return; }
    if (!traceForm.targetType && !traceForm.targetId && !traceForm.reviewTaskId) {
      notify({ message: '请先从日志列表选择一条业务记录' }, true);
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      let nextDiff: ReviewDiffResponse | null = null;
      let nextReviewTask: CheckTaskResponse | null = null;
      if (traceForm.reviewTaskId) {
        nextDiff = await apiClient.get<ReviewDiffResponse>(`/review-tasks/${traceForm.reviewTaskId}/diff`).catch(() => null);
        const pendingTasks = await apiClient.get<CheckTaskResponse[]>(`/clans/${clanId}/review-tasks/pending`).catch(() => []);
        nextReviewTask = pendingTasks.find(task => String(task.id) === String(traceForm.reviewTaskId)) || null;
      }
      const targetType = traceForm.targetType || nextDiff?.targetType || nextReviewTask?.targetType || '';
      const targetId = traceForm.targetId || String(nextDiff?.targetId || nextReviewTask?.targetId || '');
      const queryParts = new URLSearchParams({ clanId, pageSize: '100' });
      if (targetType) queryParts.set('targetType', targetType);
      if (targetId) queryParts.set('targetId', targetId);
      const objectPage = await apiClient.get<OperationLogPage>(`/logs/operations?${queryParts}`).catch(() => null);
      const taskPage = traceForm.reviewTaskId
        ? await apiClient.get<OperationLogPage>(`/logs/operations?clanId=${clanId}&targetType=review_task&targetId=${traceForm.reviewTaskId}&pageSize=100`).catch(() => null)
        : null;
      const merged = [...(objectPage?.records || []), ...(taskPage?.records || [])]
        .filter((log, index, rows) => rows.findIndex(item => item.id === log.id) === index);
      setTraceLogs(merged);
      setReviewTask(nextReviewTask);
      setReviewDiff(nextDiff);
      setResult({ message: `追踪完成：日志 ${merged.length} 条，字段差异 ${nextDiff?.fields.length || 0} 项` });
      notify({ message: '追踪链路已生成' });
    } catch (error) {
      notify({ message: (error as Error).message || '追踪链路查询失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  function applyTraceFromLog(row: OperationLogResponse) {
    setTraceForm(prev => ({
      ...prev,
      clanId: String(row.clanId || prev.clanId || workspace.clanId),
      targetType: row.targetType || '',
      targetId: row.targetId == null ? '' : String(row.targetId),
      targetSummary: targetTextFromLog(row),
      reviewTaskId: row.targetType === 'review_task' && row.targetId != null ? String(row.targetId) : prev.reviewTaskId
    }));
    setResult({ message: `已选择追踪对象：${targetTextFromLog(row)}` });
  }

  const timeline = useMemo(() => buildTimeline(traceLogs, reviewTask, reviewDiff), [traceLogs, reviewTask, reviewDiff]);
  const logRows = data?.records || [];
  const actionTypes = useMemo(() => {
    const map = new Map<string, number>();
    traceLogs.forEach(log => map.set(display(log.actionType, 'unknown'), (map.get(display(log.actionType, 'unknown')) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [traceLogs]);

  return (
    <div className="audit-trace-page">
      <Card title="操作日志与审核流完整追踪">
        <Descriptions size="small" bordered column={4}>
          <Descriptions.Item label="当前日志">{logRows.length || '-'}</Descriptions.Item>
          <Descriptions.Item label="追踪日志">{traceLogs.length || '-'}</Descriptions.Item>
          <Descriptions.Item label="字段差异">{reviewDiff?.fields.length || '-'}</Descriptions.Item>
          <Descriptions.Item label="审核状态"><Tag color={statusColor(reviewTask?.status)}>{statusText(reviewTask?.status)}</Tag></Descriptions.Item>
        </Descriptions>
      </Card>

      <div className="page-grid two audit-query-grid">
        <Card title="日志审计查询">
          <Form layout="vertical">
            <Form.Item label="当前宗族"><Input value={workspace.clanId ? '已选择当前宗族' : '未选择宗族'} disabled readOnly /></Form.Item>
            <Form.Item label="动作类型"><Input value={filters.actionType} onChange={e => set('actionType', e.target.value)} placeholder="例如：创建人物 / 更新人物" /></Form.Item>
            <Form.Item label="对象类型">
              <Select value={filters.targetType} onChange={value => set('targetType', value)} options={[{ value: '', label: '全部' }, { value: 'person', label: '人物' }, { value: 'relationship', label: '亲属关系' }, { value: 'source', label: '来源资料' }, { value: 'branch', label: '支派' }, { value: 'clan', label: '宗族' }, { value: 'review_task', label: '审核任务' }]} />
            </Form.Item>
            <Form.Item label="关键词"><Input value={filters.keyword} onChange={e => set('keyword', e.target.value)} placeholder="姓名、来源名、支派名或摘要" /></Form.Item>
            <Form.Item label="开始时间"><Input value={filters.startTime} onChange={e => set('startTime', e.target.value)} placeholder="2026-06-01T00:00:00" /></Form.Item>
            <Form.Item label="结束时间"><Input value={filters.endTime} onChange={e => set('endTime', e.target.value)} placeholder="2026-06-30T23:59:59" /></Form.Item>
            <Form.Item label="每页数量"><Input value={filters.pageSize} onChange={e => set('pageSize', e.target.value)} /></Form.Item>
          </Form>
          <Space wrap>
            <Button type="primary" onClick={() => void list()}>查询</Button>
            <Button onClick={() => void stats()}>统计</Button>
            <Button onClick={() => void exportCsv()}>导出 CSV</Button>
          </Space>
          {result ? <Alert type="success" showIcon message={result.message} style={{ marginTop: 12 }} /> : null}
        </Card>

        <Card title="审核流追踪">
          <Descriptions size="small" bordered column={1}>
            <Descriptions.Item label="追踪对象">{traceForm.targetSummary || '请先在日志列表中选择一条记录'}</Descriptions.Item>
            <Descriptions.Item label="对象类型">{targetTypeText(traceForm.targetType)}</Descriptions.Item>
          </Descriptions>
          <Space style={{ marginTop: 12 }}>
            <Button type="primary" disabled={loading || !traceForm.targetId} loading={loading} onClick={() => void loadTrace()}>{loading ? '追踪中...' : '生成追踪链路'}</Button>
          </Space>
          <Alert type="info" showIcon message="点击下方日志的“追踪”按钮带入对象；界面只展示业务摘要，不展示技术标识。" style={{ marginTop: 12 }} />
        </Card>
      </div>

      <div className="page-grid two audit-query-grid">
        <Card title="操作与审核时间线">
          {timeline.length ? (
            <Timeline items={timeline.map(item => ({
              color: timelineColor(item.status),
              children: <div><Space><Tag>{sourceText(item.source)}</Tag><strong>{item.title}</strong></Space><p>{item.desc}</p><span>{display(item.time, '时间未记录')} · 操作者 {actorText(item.actor)}</span></div>
            }))} />
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无追踪数据，请先从日志列表选择业务记录后生成追踪链路。" />}
        </Card>

        <Card title="追踪摘要">
          <Descriptions size="small" bordered column={1}>
            <Descriptions.Item label="对象">{traceForm.targetSummary || targetText(reviewDiff?.targetType, reviewDiff?.diffSummary)}</Descriptions.Item>
            <Descriptions.Item label="审核任务">{reviewTask ? statusText(reviewTask.status) : '-'}</Descriptions.Item>
            <Descriptions.Item label="审核状态"><Tag color={statusColor(reviewTask?.status)}>{statusText(reviewTask?.status)}</Tag></Descriptions.Item>
            <Descriptions.Item label="变更记录">{display(reviewDiff?.diffSummary, reviewDiff ? '字段变更已记录' : '-')}</Descriptions.Item>
          </Descriptions>
          <Space wrap style={{ marginTop: 12 }}>
            {actionTypes.length ? actionTypes.map(([name, count]) => <Tag key={name}>{actionText(name)} × {count}</Tag>) : <Tag>暂无动作分布</Tag>}
          </Space>
          {reviewDiff ? (
            <Table<FieldDiff>
              size="small"
              bordered
              style={{ marginTop: 12 }}
              rowKey={(row, index) => `${row.fieldName}-${index}`}
              dataSource={reviewDiff.fields}
              pagination={false}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无字段差异" /> }}
              columns={[
                { key: 'fieldName', title: '字段', dataIndex: 'fieldName' },
                { key: 'beforeValue', title: '变更前', dataIndex: 'beforeValue' },
                { key: 'afterValue', title: '变更后', dataIndex: 'afterValue' },
                { key: 'changeType', title: '类型', render: (_value, row) => changeText(row.changeType) }
              ]}
            />
          ) : null}
        </Card>
      </div>

      <Card title="审计日志列表">
        <Table<OperationLogResponse>
          size="small"
          bordered
          rowKey={row => String(row.id)}
          dataSource={logRows}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无审计日志" /> }}
          columns={[
            { key: 'actionType', title: '动作', render: (_value, row) => actionText(row.actionType) },
            { key: 'target', title: '业务对象', render: (_value, row) => targetTextFromLog(row) },
            { key: 'actor', title: '操作者', render: (_value, row) => actorText(row.actorId) },
            { key: 'summary', title: '摘要', dataIndex: 'summary' },
            { key: 'createdAt', title: '时间', dataIndex: 'createdAt' },
            { key: 'trace', title: '追踪', width: 90, render: (_value, row) => <Button size="small" type="link" onClick={() => applyTraceFromLog(row)}>追踪</Button> }
          ]}
        />
      </Card>
    </div>
  );
}
