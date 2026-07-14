import { useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Descriptions, Empty, Form, Input, Select, Space, Table, Tag, Timeline } from 'antd';
import { apiClient } from '../../shared/api/client';
import type {
  OperationLogPage,
  OperationLogResponse,
  OperationLogStatsResponse,
  TrackingObjectPage,
  TrackingObjectResponse,
  TrackingTraceDetailResponse,
  TrackingTraceRevisionResponse,
  TrackingTraceSourceBindingResponse,
  TrackingTraceTimelineEventResponse
} from '../../shared/api/generated/tracking-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { traceResetFromLog } from './logTraceModel.js';

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
    archived: '已归档',
    active: '有效',
    disabled: '停用',
    verified: '已核验',
    unverified: '待核验'
  };
  return dict[value || ''] || value || '-';
}

function statusColor(value?: string | null) {
  const status = String(value || '').toLowerCase();
  if (['approved', 'official', 'active', 'verified'].includes(status)) return 'success';
  if (['rejected', 'disabled', 'failed'].includes(status)) return 'error';
  if (['pending', 'draft', 'unverified'].includes(status)) return 'processing';
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
    review_task: '审核事项'
  };
  return dict[type || ''] || type || '对象';
}

function targetTextFromLog(log: OperationLogResponse) {
  const name = log.targetDisplayName || log.targetSummary || log.summary;
  const branch = log.targetBranchName ? `（${log.targetBranchName}）` : '';
  return `${targetTypeText(log.targetType)}：${display(name, '业务信息不可用')}${branch}`;
}

function traceSourceText(source: TrackingTraceTimelineEventResponse['sourceType']) {
  const dict: Record<TrackingTraceTimelineEventResponse['sourceType'], string> = {
    revision: '版本记录',
    review_task: '审核事项',
    source_binding: '来源绑定',
    operation_log: '操作日志'
  };
  return dict[source];
}

function traceEventColor(event: TrackingTraceTimelineEventResponse) {
  if (event.eventType === 'REVIEW_REJECTED' || event.eventType === 'OBJECT_DELETED') return 'red';
  if (event.eventType === 'REVIEW_APPROVED' || event.eventType === 'OBJECT_CREATED') return 'green';
  if (event.eventType === 'REVIEW_REQUESTED' || event.eventType === 'REVISION_SUBMITTED') return 'blue';
  return 'gray';
}

function trackingObjectSummary(row: TrackingObjectResponse) {
  const parts = [row.displayName, row.branchName, row.secondaryLabel].filter(Boolean);
  return `${targetTypeText(row.objectType)}：${parts.join(' · ')}`;
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
  const [objectFilters, setObjectFilters] = useState({
    objectType: 'person',
    keyword: '',
    status: '',
    changedFrom: '',
    changedTo: ''
  });
  const [traceForm, setTraceForm] = useState({
    clanId: workspace.clanId,
    targetType: '',
    targetId: '',
    targetSummary: '',
    reviewTaskId: ''
  });
  const [data, setData] = useState<OperationLogPage | null>(null);
  const [objectPage, setObjectPage] = useState<TrackingObjectPage | null>(null);
  const [objectLoading, setObjectLoading] = useState(false);
  const [objectError, setObjectError] = useState('');
  const [traceDetail, setTraceDetail] = useState<TrackingTraceDetailResponse | null>(null);
  const [result, setResult] = useState<{ message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const traceRequestVersion = useRef(0);

  function set(key: keyof typeof filters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function setObjectFilter(key: keyof typeof objectFilters, value: string) {
    setObjectFilters(prev => ({ ...prev, [key]: value }));
  }

  function query(source = filters) {
    const params = new URLSearchParams();
    Object.entries(source).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }

  function clearTraceResults() {
    setTraceDetail(null);
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

  async function searchObjects(pageNo = 1, pageSize = objectPage?.pageSize || 10) {
    const clanId = workspace.clanId;
    if (!clanId) {
      notify({ message: '请先选择宗族' }, true);
      return;
    }
    if (objectLoading) return;
    setObjectLoading(true);
    setObjectError('');
    try {
      const params = new URLSearchParams({
        clanId,
        objectType: objectFilters.objectType,
        pageNo: String(pageNo),
        pageSize: String(pageSize)
      });
      if (objectFilters.keyword.trim()) params.set('keyword', objectFilters.keyword.trim());
      if (workspace.branchId) params.set('branchId', workspace.branchId);
      if (objectFilters.status.trim()) params.set('status', objectFilters.status.trim());
      if (objectFilters.changedFrom.trim()) params.set('changedFrom', objectFilters.changedFrom.trim());
      if (objectFilters.changedTo.trim()) params.set('changedTo', objectFilters.changedTo.trim());
      const page = await apiClient.get<TrackingObjectPage>(`/tracking/objects?${params}`);
      setObjectPage(page);
      notify({ message: `找到 ${page.total} 个可见业务对象` });
    } catch (error) {
      const message = (error as Error).message || '业务对象搜索失败';
      setObjectError(message);
      setObjectPage(null);
      notify({ message }, true);
    } finally {
      setObjectLoading(false);
    }
  }

  async function loadTrace() {
    const clanId = traceForm.clanId || workspace.clanId;
    const targetType = traceForm.targetType || (traceForm.reviewTaskId ? 'review_task' : '');
    const targetId = traceForm.targetId || traceForm.reviewTaskId;
    if (!clanId) { notify({ message: '请先选择宗族' }, true); return; }
    if (!targetType || !targetId) {
      notify({ message: '请先选择一条可追踪的业务记录' }, true);
      return;
    }
    if (loading) return;

    const requestVersion = ++traceRequestVersion.current;
    setLoading(true);
    clearTraceResults();
    setResult(null);

    try {
      const params = new URLSearchParams({ clanId });
      const detail = await apiClient.get<TrackingTraceDetailResponse>(
        `/tracking/objects/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}/trace?${params}`
      );
      if (traceRequestVersion.current !== requestVersion) return;
      setTraceDetail(detail);
      const coverage = detail.traceCoverage;
      const message = coverage.level === 'complete'
        ? `追踪完成：时间线 ${detail.timeline.length} 条，版本 ${detail.revisions.length} 条，审核 ${detail.reviewTasks.length} 条`
        : `${coverage.level === 'minimal' ? '追踪信息有限' : '追踪信息不完整'}：${coverage.notes.join('；') || '部分历史记录不可用'}`;
      setResult({ message });
      notify({ message: coverage.level === 'complete' ? '追踪链路已生成' : '追踪链路已生成，存在覆盖说明' }, coverage.level !== 'complete');
    } catch (error) {
      if (traceRequestVersion.current !== requestVersion) return;
      clearTraceResults();
      setResult({ message: '追踪信息不完整：追踪请求执行失败' });
      notify({ message: (error as Error).message || '追踪链路查询失败' }, true);
    } finally {
      if (traceRequestVersion.current === requestVersion) setLoading(false);
    }
  }

  function resetTraceSelection(selection: typeof traceForm, message: string) {
    traceRequestVersion.current += 1;
    setLoading(false);
    setTraceForm(selection);
    clearTraceResults();
    setResult({ message });
  }

  function applyTraceFromLog(row: OperationLogResponse) {
    const reset = traceResetFromLog(row, workspace.clanId, targetTextFromLog(row));
    resetTraceSelection(reset.selection, `已选择追踪对象：${targetTextFromLog(row)}`);
  }

  function applyTraceFromObject(row: TrackingObjectResponse) {
    const summary = trackingObjectSummary(row);
    resetTraceSelection({
      clanId: workspace.clanId,
      targetType: row.objectType,
      targetId: String(row.objectId),
      targetSummary: summary,
      reviewTaskId: row.objectType === 'review_task' ? String(row.objectId) : ''
    }, `已选择追踪对象：${summary}`);
  }

  const traceLogs = traceDetail?.operationLogs || [];
  const timeline = traceDetail?.timeline || [];
  const traceCoverage = traceDetail?.traceCoverage || null;
  const latestReviewTask = traceDetail?.reviewTasks[0] || null;
  const logRows = data?.records || [];
  const objectRows = objectPage?.records || [];
  const actionTypes = useMemo(() => {
    const map = new Map<string, number>();
    traceLogs.forEach(log => map.set(display(log.actionType, 'unknown'), (map.get(display(log.actionType, 'unknown')) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [traceLogs]);
  const canTrace = Boolean(traceForm.targetType && traceForm.targetId);
  const resolvedTargetSummary = traceDetail
    ? trackingObjectSummary(traceDetail.objectSummary)
    : traceForm.targetSummary || '-';

  return (
    <div className="audit-trace-page">
      <Card title="操作日志与审核流完整追踪">
        <Descriptions size="small" bordered column={4}>
          <Descriptions.Item label="当前日志">{logRows.length || '-'}</Descriptions.Item>
          <Descriptions.Item label="追踪日志">{traceLogs.length || '-'}</Descriptions.Item>
          <Descriptions.Item label="当前状态"><Tag color={statusColor(traceDetail?.currentStatus)}>{statusText(traceDetail?.currentStatus)}</Tag></Descriptions.Item>
          <Descriptions.Item label="链路覆盖"><Tag color={traceCoverage?.level === 'complete' ? 'success' : traceCoverage ? 'warning' : 'default'}>{traceCoverage?.level === 'complete' ? '完整覆盖' : traceCoverage?.level === 'minimal' ? '最小覆盖' : traceCoverage ? '部分覆盖' : '未追踪'}</Tag></Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="业务对象搜索" style={{ marginTop: 16 }}>
        <Form layout="vertical">
          <div className="page-grid two audit-query-grid">
            <Form.Item label="对象类型">
              <Select
                value={objectFilters.objectType}
                onChange={value => setObjectFilter('objectType', value)}
                options={[
                  { value: 'person', label: '人物' },
                  { value: 'relationship', label: '亲属关系' },
                  { value: 'source', label: '来源资料' },
                  { value: 'branch', label: '支派' },
                  { value: 'review_task', label: '审核事项' }
                ]}
              />
            </Form.Item>
            <Form.Item label="业务关键词">
              <Input
                value={objectFilters.keyword}
                onChange={event => setObjectFilter('keyword', event.target.value)}
                onPressEnter={() => void searchObjects(1)}
                placeholder="姓名、谱名、来源名称、支派名称或审核摘要"
                maxLength={100}
              />
            </Form.Item>
            <Form.Item label="当前支派范围">
              <Input value={workspace.branchId ? '当前工作区支派' : '按本人可见范围'} disabled readOnly />
            </Form.Item>
            <Form.Item label="状态">
              <Input value={objectFilters.status} onChange={event => setObjectFilter('status', event.target.value)} placeholder="可选：official / pending / verified" maxLength={50} />
            </Form.Item>
            <Form.Item label="最近变更开始时间">
              <Input value={objectFilters.changedFrom} onChange={event => setObjectFilter('changedFrom', event.target.value)} placeholder="2026-07-01T00:00:00" />
            </Form.Item>
            <Form.Item label="最近变更结束时间">
              <Input value={objectFilters.changedTo} onChange={event => setObjectFilter('changedTo', event.target.value)} placeholder="2026-07-31T23:59:59" />
            </Form.Item>
          </div>
        </Form>
        <Space wrap>
          <Button type="primary" loading={objectLoading} onClick={() => void searchObjects(1)}>搜索业务对象</Button>
          <span>只返回当前宗族、授权支派和隐私规则允许查看的结果。</span>
        </Space>
        {objectError ? <Alert type="error" showIcon message={objectError} style={{ marginTop: 12 }} /> : null}
        <Table<TrackingObjectResponse>
          size="small"
          bordered
          style={{ marginTop: 12 }}
          rowKey={row => `${row.objectType}-${row.objectId}`}
          loading={objectLoading}
          dataSource={objectRows}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="输入业务关键词搜索可追踪对象" /> }}
          pagination={{
            current: objectPage?.pageNo || 1,
            pageSize: objectPage?.pageSize || 10,
            total: objectPage?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (pageNo, pageSize) => void searchObjects(pageNo, pageSize)
          }}
          columns={[
            { key: 'type', title: '类型', render: (_value, row) => targetTypeText(row.objectType) },
            {
              key: 'name',
              title: '业务名称',
              render: (_value, row) => <div><strong>{row.displayName}</strong>{row.secondaryLabel ? <div>{row.secondaryLabel}</div> : null}</div>
            },
            { key: 'branchName', title: '支派', render: (_value, row) => display(row.branchName) },
            { key: 'summary', title: '摘要', render: (_value, row) => display(row.summary) },
            { key: 'status', title: '状态', render: (_value, row) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> },
            { key: 'changedAt', title: '最近变化', render: (_value, row) => display(row.changedAt, '时间未记录') },
            { key: 'trace', title: '操作', width: 90, render: (_value, row) => <Button size="small" type="link" onClick={() => applyTraceFromObject(row)}>选择追踪</Button> }
          ]}
        />
      </Card>

      <div className="page-grid two audit-query-grid">
        <Card title="日志审计查询">
          <Form layout="vertical">
            <Form.Item label="当前宗族"><Input value={workspace.clanId ? '已选择当前宗族' : '未选择宗族'} disabled readOnly /></Form.Item>
            <Form.Item label="动作类型"><Input value={filters.actionType} onChange={event => set('actionType', event.target.value)} placeholder="例如：创建人物 / 更新人物" /></Form.Item>
            <Form.Item label="对象类型">
              <Select value={filters.targetType} onChange={value => set('targetType', value)} options={[{ value: '', label: '全部' }, { value: 'person', label: '人物' }, { value: 'relationship', label: '亲属关系' }, { value: 'source', label: '来源资料' }, { value: 'branch', label: '支派' }, { value: 'clan', label: '宗族' }, { value: 'review_task', label: '审核事项' }]} />
            </Form.Item>
            <Form.Item label="关键词"><Input value={filters.keyword} onChange={event => set('keyword', event.target.value)} placeholder="业务名称或摘要" /></Form.Item>
            <Form.Item label="开始时间"><Input value={filters.startTime} onChange={event => set('startTime', event.target.value)} placeholder="2026-06-01T00:00:00" /></Form.Item>
            <Form.Item label="结束时间"><Input value={filters.endTime} onChange={event => set('endTime', event.target.value)} placeholder="2026-06-30T23:59:59" /></Form.Item>
            <Form.Item label="每页数量"><Input value={filters.pageSize} onChange={event => set('pageSize', event.target.value)} /></Form.Item>
          </Form>
          <Space wrap>
            <Button type="primary" onClick={() => void list()}>查询</Button>
            <Button onClick={() => void stats()}>统计</Button>
            <Button onClick={() => void exportCsv()}>导出 CSV</Button>
          </Space>
          {result ? <Alert type={traceCoverage?.level === 'partial' ? 'warning' : 'success'} showIcon message={result.message} style={{ marginTop: 12 }} /> : null}
        </Card>

        <Card title="审核流追踪">
          <Descriptions size="small" bordered column={1}>
            <Descriptions.Item label="追踪对象">{traceForm.targetSummary || '请先搜索或从日志列表选择业务对象'}</Descriptions.Item>
            <Descriptions.Item label="对象类型">{targetTypeText(traceForm.targetType)}</Descriptions.Item>
            <Descriptions.Item label="聚合方式">由后端统一解析版本、审核、来源与日志</Descriptions.Item>
          </Descriptions>
          <Space style={{ marginTop: 12 }}>
            <Button type="primary" disabled={loading || !canTrace} loading={loading} onClick={() => void loadTrace()}>{loading ? '追踪中...' : '生成追踪链路'}</Button>
          </Space>
          <Alert type="info" showIcon message="业务对象搜索用于准确选中对象；追踪详情由单一聚合接口返回，页面不再拼接或推断审核链路。" style={{ marginTop: 12 }} />
          {traceCoverage ? (
            <Alert
              type={traceCoverage.level === 'complete' ? 'success' : 'warning'}
              showIcon
              message={traceCoverage.level === 'complete' ? '完整覆盖' : traceCoverage.level === 'minimal' ? '最小覆盖' : '部分覆盖'}
              description={traceCoverage.notes.join('；') || '当前可见历史已加载'}
              style={{ marginTop: 12 }}
            />
          ) : null}
        </Card>
      </div>

      <div className="page-grid two audit-query-grid">
        <Card title="操作与审核时间线">
          {timeline.length ? (
            <Timeline items={timeline.map(item => ({
              color: traceEventColor(item),
              children: <div><Space><Tag>{traceSourceText(item.sourceType)}</Tag><strong>{item.title}</strong>{item.resultStatus ? <Tag color={statusColor(item.resultStatus)}>{statusText(item.resultStatus)}</Tag> : null}</Space><p>{display(item.summary, '暂无摘要')}</p><span>{display(item.occurredAt, '时间未记录')} · 操作者 {display(item.actorDisplayName, '未知操作者')}</span></div>
            }))} />
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无追踪数据，请先选择业务对象后生成追踪链路。" />}
        </Card>

        <Card title="追踪摘要">
          <Descriptions size="small" bordered column={1}>
            <Descriptions.Item label="关联对象">{resolvedTargetSummary}</Descriptions.Item>
            <Descriptions.Item label="审核事项">{latestReviewTask ? statusText(latestReviewTask.status) : '暂无审核事项'}</Descriptions.Item>
            <Descriptions.Item label="审核意见">{display(latestReviewTask?.reviewComment)}</Descriptions.Item>
            <Descriptions.Item label="版本记录">{traceDetail?.revisions.length || 0} 条</Descriptions.Item>
            <Descriptions.Item label="来源绑定">{traceDetail?.sourceBindings.length || 0} 条</Descriptions.Item>
            <Descriptions.Item label="截断分段">{traceCoverage?.truncatedSegments.join('、') || '-'}</Descriptions.Item>
            <Descriptions.Item label="缺失分段">{traceCoverage?.missingSegments.join('、') || '-'}</Descriptions.Item>
          </Descriptions>
          <Space wrap style={{ marginTop: 12 }}>
            {actionTypes.length ? actionTypes.map(([name, count]) => <Tag key={name}>{actionText(name)} × {count}</Tag>) : <Tag>暂无动作分布</Tag>}
          </Space>
          {traceDetail?.revisions.length ? (
            <Table<TrackingTraceRevisionResponse>
              size="small"
              bordered
              style={{ marginTop: 12 }}
              rowKey={row => String(row.id)}
              dataSource={traceDetail.revisions}
              pagination={false}
              columns={[
                { key: 'changeType', title: '变更类型', dataIndex: 'changeType' },
                { key: 'summary', title: '变更摘要', render: (_value, row) => display(row.diffSummary) },
                { key: 'status', title: '状态', render: (_value, row) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> },
                { key: 'submitter', title: '提交人', render: (_value, row) => display(row.submitterDisplayName, '未知操作者') },
                { key: 'time', title: '提交时间', render: (_value, row) => display(row.submitTime, '时间未记录') }
              ]}
            />
          ) : null}
          {traceDetail?.sourceBindings.length ? (
            <Table<TrackingTraceSourceBindingResponse>
              size="small"
              bordered
              style={{ marginTop: 12 }}
              rowKey={row => String(row.id)}
              dataSource={traceDetail.sourceBindings}
              pagination={false}
              columns={[
                { key: 'source', title: '来源', dataIndex: 'sourceDisplayName' },
                { key: 'target', title: '关联对象', render: (_value, row) => display(row.targetDisplayName) },
                { key: 'confidence', title: '可信度', render: (_value, row) => display(row.confidenceLevel) },
                { key: 'status', title: '状态', render: (_value, row) => <Tag color={statusColor(row.bindingStatus)}>{statusText(row.bindingStatus)}</Tag> }
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
            { key: 'branch', title: '支派', render: (_value, row) => display(row.targetBranchName) },
            { key: 'actor', title: '操作者', render: (_value, row) => display(row.actorDisplayName, '未知操作者') },
            { key: 'status', title: '结果状态', render: (_value, row) => row.resultStatus ? <Tag color={statusColor(row.resultStatus)}>{statusText(row.resultStatus)}</Tag> : '-' },
            { key: 'summary', title: '摘要', render: (_value, row) => display(row.targetSummary || row.summary) },
            { key: 'createdAt', title: '时间', dataIndex: 'createdAt' },
            { key: 'trace', title: '追踪', width: 90, render: (_value, row) => <Button size="small" type="link" onClick={() => applyTraceFromLog(row)}>追踪</Button> }
          ]}
        />
      </Card>
    </div>
  );
}
