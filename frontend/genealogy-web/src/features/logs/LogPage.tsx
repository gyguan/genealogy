import { useMemo, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable, toRecordList } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

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

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function rows(data: unknown): OperationLog[] {
  return toRecordList<OperationLog>(data);
}

function statusText(value?: string) {
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

function actionText(value?: string) {
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

function targetTypeText(type?: string) {
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

function targetText(type?: string, summary?: string, name?: string) {
  const label = targetTypeText(type);
  const businessText = display(name || summary, '未提供业务摘要');
  return `${label}：${businessText}`;
}

function targetTextFromLog(log: OperationLog) {
  return targetText(log.targetType, log.targetSummary || log.summary || log.detail, log.targetName);
}

function reviewTaskTitle(task: ReviewTask) {
  return display(task.title || task.targetName, targetText(task.targetType, task.comment || task.title, task.targetName));
}

function actorText(value?: string | number, name?: string) {
  return display(name || value, '系统/未知操作者');
}

function changeText(value?: string) {
  const dict: Record<string, string> = { added: '新增', removed: '删除', modified: '修改' };
  return dict[value || ''] || value || '-';
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
    items.push({
      key: `review-${reviewTask.id}`,
      time: reviewTask.createdAt,
      title: `审核任务：${statusText(reviewTask.status)}`,
      desc: `${reviewTaskTitle(reviewTask)}，提交人：${actorText(reviewTask.submitterId, reviewTask.submitterName)}`,
      actor: reviewTask.submitterName || reviewTask.submitterId,
      status: reviewTask.status === 'rejected' ? 'warn' : reviewTask.status === 'pending' ? 'pending' : 'done',
      source: 'review'
    });
    if (reviewTask.reviewedAt || reviewTask.reviewerId || reviewTask.comment) {
      items.push({
        key: `review-result-${reviewTask.id}`,
        time: reviewTask.reviewedAt,
        title: reviewTask.status === 'rejected' ? '审核驳回' : reviewTask.status === 'approved' ? '审核通过' : '审核处理中',
        desc: display(reviewTask.comment, '暂无审核意见'),
        actor: reviewTask.reviewerName || reviewTask.reviewerId,
        status: reviewTask.status === 'rejected' ? 'warn' : reviewTask.status === 'pending' ? 'pending' : 'done',
        source: 'review'
      });
    }
  }
  if (diff?.reviewTaskId || diff?.revisionId) {
    items.push({
      key: `diff-${diff.reviewTaskId || diff.revisionId}`,
      title: `字段级变更：${changeText(diff.changeType)}`,
      desc: `${display(diff.diffSummary, '暂无变更摘要')}，字段差异 ${diff.fields?.length || 0} 项`,
      status: 'info',
      source: 'diff'
    });
  }
  logs.forEach(log => items.push({
    key: `log-${log.id || `${log.actionType}-${log.createdAt}`}`,
    time: log.createdAt,
    title: actionText(log.actionType),
    desc: `${display(log.summary, '暂无摘要')}｜${targetTextFromLog(log)}`,
    actor: log.actorName || log.operatorName || log.actorId,
    status: severityOf(log),
    source: 'log'
  }));
  return items.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')) || a.key.localeCompare(b.key));
}

function sourceText(source: TimelineItem['source']) {
  const dict: Record<TimelineItem['source'], string> = { log: '操作日志', review: '审核任务', diff: '字段变更', system: '系统' };
  return dict[source];
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
  const [data, setData] = useState<unknown>();
  const [traceLogs, setTraceLogs] = useState<OperationLog[]>([]);
  const [reviewTask, setReviewTask] = useState<ReviewTask | null>(null);
  const [reviewDiff, setReviewDiff] = useState<ReviewDiff | null>(null);
  const [result, setResult] = useState<unknown>();
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
    const res: any = await apiClient.get(`/logs/operations${q ? `?${q}` : ''}`);
    setData(res);
    notify({ message: `日志查询完成，共 ${res?.total ?? res?.records?.length ?? 0} 条` });
  }

  async function stats() {
    const q = query({ ...filters, clanId: filters.clanId || workspace.clanId });
    const res: any = await apiClient.get(`/logs/operations/stats${q ? `?${q}` : ''}`);
    setResult({ message: `日志总数：${res?.totalCount ?? 0}` });
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
    if (!traceForm.targetType && !traceForm.targetId && !traceForm.reviewTaskId) { notify({ message: '请先从日志列表选择一条业务记录' }, true); return; }
    if (loading) return;
    setLoading(true);
    try {
      let nextDiff: ReviewDiff | null = null;
      let nextReviewTask: ReviewTask | null = null;
      if (traceForm.reviewTaskId) {
        nextDiff = await apiClient.get<ReviewDiff>(`/review-tasks/${traceForm.reviewTaskId}/diff`).catch(() => null);
        const pendingTasks = toRecordList<ReviewTask>(await apiClient.get(`/clans/${clanId}/review-tasks/pending`).catch(() => []));
        nextReviewTask = pendingTasks.find(task => String(task.id) === String(traceForm.reviewTaskId)) || {
          id: traceForm.reviewTaskId,
          targetType: nextDiff?.targetType,
          targetId: nextDiff?.targetId,
          targetName: nextDiff?.targetName,
          status: nextDiff ? 'pending' : undefined,
          title: nextDiff?.diffSummary
        };
      }
      const targetType = traceForm.targetType || nextDiff?.targetType || nextReviewTask?.targetType || '';
      const targetId = traceForm.targetId || String(nextDiff?.targetId || nextReviewTask?.targetId || '');
      const queryParts = new URLSearchParams();
      queryParts.set('clanId', clanId);
      queryParts.set('pageSize', '100');
      if (targetType) queryParts.set('targetType', targetType);
      if (targetId) queryParts.set('targetId', targetId);
      const objectLogs = rows(await apiClient.get(`/logs/operations?${queryParts}`).catch(() => []));
      const taskLogs = traceForm.reviewTaskId
        ? rows(await apiClient.get(`/logs/operations?clanId=${clanId}&targetType=review_task&targetId=${traceForm.reviewTaskId}&pageSize=100`).catch(() => []))
        : [];
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
    setTraceForm(prev => ({
      ...prev,
      clanId: String(row.clanId || prev.clanId || workspace.clanId),
      targetType: String(row.targetType || ''),
      targetId: String(row.targetId || ''),
      targetSummary: targetTextFromLog(row),
      reviewTaskId: row.targetType === 'review_task' ? String(row.targetId || '') : prev.reviewTaskId
    }));
    setResult({ message: `已选择追踪对象：${targetTextFromLog(row)}` });
  }

  const timeline = useMemo(() => buildTimeline(traceLogs, reviewTask, reviewDiff), [traceLogs, reviewTask, reviewDiff]);
  const logRows = rows(data);
  const actionTypes = useMemo(() => {
    const map = new Map<string, number>();
    traceLogs.forEach(log => map.set(display(log.actionType, 'unknown'), (map.get(display(log.actionType, 'unknown')) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [traceLogs]);

  return (
    <div className="audit-trace-page">
      <section className="audit-hero">
        <div>
          <span>Audit Trace</span>
          <h2>操作日志与审核流完整追踪</h2>
          <p>把对象操作、审核任务、字段级变更和处理结果串成一条时间线，方便定位“谁改了什么、为什么进入审核、最终如何处理”。</p>
        </div>
        <div className="audit-hero-metrics">
          <div><span>当前日志</span><strong>{logRows.length || '-'}</strong></div>
          <div><span>追踪日志</span><strong>{traceLogs.length || '-'}</strong></div>
          <div><span>字段差异</span><strong>{reviewDiff?.fields?.length || '-'}</strong></div>
          <div><span>审核任务</span><strong>{statusText(reviewTask?.status)}</strong></div>
        </div>
      </section>

      <div className="page-grid two audit-query-grid">
        <Panel title="日志审计查询" description="支持按当前宗族、动作、对象类型、关键词和时间范围查询。">
          <Field label="当前宗族"><input value={workspace.clanId ? '已选择当前宗族' : '未选择宗族'} disabled readOnly /></Field>
          <Field label="动作类型"><input value={filters.actionType} onChange={e => set('actionType', e.target.value)} placeholder="例如：创建人物 / 更新人物" /></Field>
          <Field label="对象类型"><select value={filters.targetType} onChange={e => set('targetType', e.target.value)}><option value="">全部</option><option value="person">人物</option><option value="relationship">亲属关系</option><option value="source">来源资料</option><option value="branch">支派</option><option value="clan">宗族</option><option value="review_task">审核任务</option></select></Field>
          <Field label="关键词"><input value={filters.keyword} onChange={e => set('keyword', e.target.value)} placeholder="姓名、来源名、支派名或摘要" /></Field>
          <Field label="开始时间"><input value={filters.startTime} onChange={e => set('startTime', e.target.value)} placeholder="2026-06-01T00:00:00" /></Field>
          <Field label="结束时间"><input value={filters.endTime} onChange={e => set('endTime', e.target.value)} placeholder="2026-06-30T23:59:59" /></Field>
          <Field label="每页数量"><input value={filters.pageSize} onChange={e => set('pageSize', e.target.value)} /></Field>
          <Actions><button onClick={list}>查询</button><button className="secondary" onClick={stats}>统计</button><button className="secondary" onClick={exportCsv}>导出CSV</button></Actions>
          <ResultNotice result={result} />
        </Panel>

        <Panel title="审核流追踪" description="从日志列表选择一条业务记录后，生成从操作到审核的追踪链路。">
          <Field label="追踪对象"><input value={traceForm.targetSummary || '请先在日志列表中选择一条记录'} disabled readOnly /></Field>
          <Field label="对象类型"><input value={targetTypeText(traceForm.targetType)} disabled readOnly /></Field>
          <Actions><button disabled={loading || !traceForm.targetId} onClick={loadTrace}>{loading ? '追踪中...' : '生成追踪链路'}</button></Actions>
          <div className="audit-trace-hint">点击下方日志的“追踪”按钮带入对象；界面只展示业务摘要，不展示技术标识。</div>
        </Panel>
      </div>

      <section className="audit-trace-layout">
        <Panel title="操作与审核时间线" description="按照时间顺序串联操作日志、审核任务和字段变更。">
          <div className="audit-timeline">
            {timeline.length ? timeline.map(item => (
              <article key={item.key} className={`audit-timeline-item audit-timeline-item--${item.status}`}>
                <span>{sourceText(item.source)}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                  <em>{display(item.time, '时间未记录')} · 操作者 {actorText(item.actor)}</em>
                </div>
              </article>
            )) : <div className="audit-empty">暂无追踪数据，请先从日志列表选择业务记录后生成追踪链路。</div>}
          </div>
        </Panel>

        <Panel title="追踪摘要" description="展示该对象相关动作分布、审核状态和字段差异。">
          <div className="audit-summary-grid">
            <div><span>对象</span><strong>{traceForm.targetSummary || targetText(reviewDiff?.targetType, reviewDiff?.diffSummary, reviewDiff?.targetName)}</strong></div>
            <div><span>审核任务</span><strong>{reviewTask ? statusText(reviewTask.status) : '-'}</strong></div>
            <div><span>审核状态</span><strong>{statusText(reviewTask?.status)}</strong></div>
            <div><span>变更记录</span><strong>{display(reviewDiff?.diffSummary, reviewDiff ? '字段变更已记录' : '-')}</strong></div>
          </div>
          <div className="audit-action-tags">
            {actionTypes.length ? actionTypes.map(([name, count]) => <span key={name}>{actionText(name)} × {count}</span>) : <span>暂无动作分布</span>}
          </div>
          {reviewDiff ? (
            <DataTable
              data={reviewDiff.fields || []}
              columns={[
                { key: 'fieldName', title: '字段' },
                { key: 'beforeValue', title: '变更前' },
                { key: 'afterValue', title: '变更后' },
                { key: 'changeType', title: '类型', render: row => changeText(row.changeType) }
              ]}
              empty="暂无字段差异"
            />
          ) : null}
        </Panel>
      </section>

      <Panel title="审计日志列表" description="点击一条日志可快速带入追踪条件。">
        <DataTable
          data={data}
          columns={[
            { key: 'actionType', title: '动作', render: row => actionText(row.actionType) },
            { key: 'targetSummary', title: '业务对象', render: row => targetTextFromLog(row) },
            { key: 'actorName', title: '操作者', render: row => actorText(row.actorId, row.actorName || row.operatorName) },
            { key: 'summary', title: '摘要' },
            { key: 'createdAt', title: '时间' },
            { key: 'trace', title: '追踪', render: row => <button onClick={() => applyTraceFromLog(row)}>追踪</button> }
          ]}
        />
      </Panel>
    </div>
  );
}