import {
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Result,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography
} from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiClient, ApiRequestError } from '../../shared/api/client';
import type {
  FieldDiff,
  OperationLogResponse,
  ReviewDiffResponse,
  TrackingObjectResponse,
  TrackingTraceChangeChainResponse,
  TrackingTraceDetailResponse,
  TrackingTraceReviewTaskResponse,
  TrackingTraceRevisionResponse,
  TrackingTraceSourceBindingResponse
} from '../../shared/api/generated/tracking-types';
import {
  actionText,
  coverageText,
  display,
  formatDateTime,
  statusColor,
  statusText,
  targetTypeText,
  traceEventColor,
  traceSourceText
} from './trackingCenterLabels';
import './tracking-trace-detail-page.css';

import { PageFeedback } from '../../shared/ui/Feedback';

const { Text, Title } = Typography;

type SectionKey = 'timeline' | 'chains' | 'changes' | 'reviews' | 'sources' | 'logs';
type SectionState<T> = { data: T; loading: boolean; error: string; forbidden: boolean; loaded: boolean };

type Props = {
  clanId: string;
  targetType: string;
  targetId: string;
  reviewTaskId?: string;
  selectedObject?: TrackingObjectResponse | null;
  onBack: () => void;
};

function emptyState<T>(data: T): SectionState<T> {
  return { data, loading: false, error: '', forbidden: false, loaded: false };
}

function fieldChangeText(value?: string | null) {
  return value === null || value === undefined || value === '' ? '未填写' : value;
}

function changeTypeText(value?: string) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'added' || normalized === 'add') return '新增';
  if (normalized === 'removed' || normalized === 'remove') return '删除';
  if (normalized === 'updated' || normalized === 'changed' || normalized === 'modify') return '修改';
  return value || '变更';
}

function SectionStateView({ state, onRetry, children }: {
  state: SectionState<unknown>;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (state.loading && !state.loaded) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (state.forbidden) return <Result status="403" title="无权查看该分区" subTitle="当前账号没有该分区的审计查看权限。" />;
  if (state.error) {
    return (
      <PageFeedback
        tone="error"
        title="当前分区加载失败"
        description={state.error}
        action={<Button icon={<ReloadOutlined />} onClick={onRetry}>重试</Button>}
      />
    );
  }
  return <>{children}</>;
}

function TraceOverview({ detail }: { detail: TrackingTraceDetailResponse }) {
  const summary = detail.objectSummary;
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions bordered column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="业务对象">{summary.displayName}</Descriptions.Item>
        <Descriptions.Item label="对象类型">{targetTypeText(summary.objectType)}</Descriptions.Item>
        <Descriptions.Item label="所属支派">{display(summary.branchName, '未归属支派')}</Descriptions.Item>
        <Descriptions.Item label="当前状态"><Tag color={statusColor(detail.currentStatus)}>{statusText(detail.currentStatus)}</Tag></Descriptions.Item>
        <Descriptions.Item label="业务摘要" span={2}>{display(summary.summary || summary.secondaryLabel, '暂无摘要')}</Descriptions.Item>
        <Descriptions.Item label="最近变更">{formatDateTime(summary.changedAt)}</Descriptions.Item>
        <Descriptions.Item label="历史覆盖"><Tag color={detail.traceCoverage.complete ? 'success' : 'warning'}>{coverageText(detail.traceCoverage.level)}</Tag></Descriptions.Item>
      </Descriptions>
      <PageFeedback
        tone={detail.traceCoverage.complete ? 'success' : 'warning'}
        title={detail.traceCoverage.complete ? '当前可见历史已完整加载' : '当前历史存在范围说明'}
        description={detail.traceCoverage.notes.join('；') || '未发现需要补充说明的历史缺口'}
      />
    </Space>
  );
}

export function TrackingTraceDetailPage({ clanId, targetType, targetId, reviewTaskId = '', selectedObject, onBack }: Props) {
  const [summary, setSummary] = useState<TrackingTraceDetailResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [summaryStatus, setSummaryStatus] = useState<number>();
  const [activeTab, setActiveTab] = useState<SectionKey>('timeline');
  const requestVersion = useRef(0);

  const [timeline, setTimeline] = useState(emptyState<TrackingTraceDetailResponse['timeline']>([]));
  const [chains, setChains] = useState(emptyState<TrackingTraceChangeChainResponse[]>([]));
  const [changes, setChanges] = useState(emptyState<Array<TrackingTraceRevisionResponse & { fields?: FieldDiff[] }>>([]));
  const [reviews, setReviews] = useState(emptyState<TrackingTraceReviewTaskResponse[]>([]));
  const [sources, setSources] = useState(emptyState<TrackingTraceSourceBindingResponse[]>([]));
  const [logs, setLogs] = useState(emptyState<OperationLogResponse[]>([]));

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ clanId });
    if (reviewTaskId) params.set('reviewTaskId', reviewTaskId);
    return `/tracking/objects/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}/trace?${params}`;
  }, [clanId, targetType, targetId, reviewTaskId]);

  async function loadSummary() {
    const version = ++requestVersion.current;
    setSummaryLoading(true);
    setSummaryError('');
    setSummaryStatus(undefined);
    try {
      const detail = await apiClient.get<TrackingTraceDetailResponse>(endpoint);
      if (version !== requestVersion.current) return;
      setSummary(detail);
      setTimeline({ data: detail.timeline || [], loading: false, error: '', forbidden: false, loaded: true });
    } catch (error) {
      if (version !== requestVersion.current) return;
      const requestError = error as ApiRequestError;
      setSummaryStatus(requestError.status);
      setSummaryError((error as Error)?.message || '追踪详情加载失败');
    } finally {
      if (version === requestVersion.current) setSummaryLoading(false);
    }
  }

  async function loadSection(key: SectionKey) {
    const setters = { timeline: setTimeline, chains: setChains, changes: setChanges, reviews: setReviews, sources: setSources, logs: setLogs } as const;
    const setter = setters[key] as React.Dispatch<React.SetStateAction<SectionState<any>>>;
    setter(previous => ({ ...previous, loading: true, error: '', forbidden: false }));
    try {
      const detail = await apiClient.get<TrackingTraceDetailResponse>(`${endpoint}&section=${key}`);
      if (key === 'timeline') setter({ data: detail.timeline || [], loading: false, error: '', forbidden: false, loaded: true });
      if (key === 'chains') setter({ data: detail.changeChains || [], loading: false, error: '', forbidden: false, loaded: true });
      if (key === 'reviews') setter({ data: detail.reviewTasks || [], loading: false, error: '', forbidden: false, loaded: true });
      if (key === 'sources') setter({ data: detail.sourceBindings || [], loading: false, error: '', forbidden: false, loaded: true });
      if (key === 'logs') setter({ data: detail.operationLogs || [], loading: false, error: '', forbidden: false, loaded: true });
      if (key === 'changes') {
        const rows = await Promise.all((detail.revisions || []).map(async revision => {
          const task = (detail.reviewTasks || []).find(item => item.revisionId === revision.id);
          if (!task?.id) return revision;
          try {
            const diff = await apiClient.get<ReviewDiffResponse>(`/review-tasks/${task.id}/diff`);
            return { ...revision, fields: diff.fields || [] };
          } catch {
            return revision;
          }
        }));
        setter({ data: rows, loading: false, error: '', forbidden: false, loaded: true });
      }
    } catch (error) {
      const requestError = error as ApiRequestError;
      setter(previous => ({ ...previous, loading: false, error: requestError.status === 403 ? '' : ((error as Error)?.message || '加载失败'), forbidden: requestError.status === 403, loaded: true }));
    }
  }

  useEffect(() => { void loadSummary(); }, [endpoint]);
  useEffect(() => {
    const states = { timeline, chains, changes, reviews, sources, logs };
    if (!states[activeTab].loaded && !states[activeTab].loading) void loadSection(activeTab);
  }, [activeTab, endpoint]);

  const pageTitle = summary?.objectSummary.displayName || selectedObject?.displayName || '对象追踪详情';

  if (summaryLoading && !summary) return <div className="tracking-detail-page"><Skeleton active paragraph={{ rows: 12 }} /></div>;
  if (!summary && summaryStatus === 403) return <Result status="403" title="无权查看该对象" subTitle="当前账号没有该对象或所属支派的追踪权限。" extra={<Button onClick={onBack}>返回对象列表</Button>} />;
  if (!summary && summaryStatus === 404) return <Result status="404" title="对象不存在" subTitle="对象可能已删除、合并或失效。" extra={<Button onClick={onBack}>返回对象列表</Button>} />;
  if (!summary) return <Result status="error" title="追踪详情加载失败" subTitle={summaryError} extra={<Space><Button onClick={onBack}>返回</Button><Button type="primary" onClick={() => void loadSummary()}>重试</Button></Space>} />;

  return (
    <div className="tracking-detail-page">
      <header className="tracking-detail-page__header">
        <div>
          <Button type="link" icon={<ArrowLeftOutlined />} onClick={onBack}>返回审计追踪</Button>
          <Title level={3}>{pageTitle}</Title>
          <Text type="secondary">只读追踪 · {targetTypeText(summary.objectSummary.objectType)} · {display(summary.objectSummary.branchName, '宗族范围')}</Text>
        </div>
        <Space wrap>
          <Tag color={statusColor(summary.currentStatus)}>{statusText(summary.currentStatus)}</Tag>
          <Tag color={summary.traceCoverage.complete ? 'success' : 'warning'}>{coverageText(summary.traceCoverage.level)}</Tag>
        </Space>
      </header>

      <Card title="对象摘要"><TraceOverview detail={summary} /></Card>

      <Card className="tracking-detail-page__content">
        <Tabs
          activeKey={activeTab}
          onChange={key => setActiveTab(key as SectionKey)}
          items={[
            {
              key: 'timeline', label: `事件时间线 (${timeline.data.length})`, children: (
                <SectionStateView state={timeline} onRetry={() => void loadSection('timeline')}>
                  {timeline.data.length ? <Timeline items={timeline.data.map(item => ({ color: traceEventColor(item), children: <div><Space wrap><Tag>{traceSourceText(item.sourceType)}</Tag><Text strong>{item.title}</Text>{item.resultStatus ? <Tag color={statusColor(item.resultStatus)}>{statusText(item.resultStatus)}</Tag> : null}</Space><p>{display(item.summary, '暂无补充说明')}</p><Text type="secondary">{formatDateTime(item.occurredAt)} · {display(item.actorDisplayName, '系统或未知操作者')}</Text></div> }))} /> : <Empty description="当前对象暂无可见变更记录" />}
                </SectionStateView>
              )
            },
            {
              key: 'changes', label: `字段变更 (${changes.data.length})`, children: (
                <SectionStateView state={changes} onRetry={() => void loadSection('changes')}>
                  <Table
                    rowKey={row => String(row.id)}
                    dataSource={changes.data}
                    pagination={false}
                    expandable={{
                      rowExpandable: row => Boolean(row.fields?.length || row.diffSummary),
                      expandedRowRender: row => row.fields?.length ? (
                        <Table<FieldDiff>
                          size="small"
                          rowKey={(field, index) => `${row.id}-${field.fieldName}-${index}`}
                          dataSource={row.fields}
                          pagination={false}
                          columns={[
                            { key: 'field', title: '字段名称', dataIndex: 'fieldName', width: 180 },
                            { key: 'before', title: '旧值', render: (_value, field) => fieldChangeText(field.beforeValue) },
                            { key: 'after', title: '新值', render: (_value, field) => fieldChangeText(field.afterValue) },
                            { key: 'type', title: '变更类型', width: 100, render: (_value, field) => <Tag>{changeTypeText(field.changeType)}</Tag> }
                          ]}
                        />
                      ) : <PageFeedback tone="info" title="仅有历史摘要" description={display(row.diffSummary, '该历史版本无法恢复字段级差异。')} />
                    }}
                    columns={[
                      { key: 'changeType', title: '变更类型', width: 120, render: (_value, row) => changeTypeText(row.changeType) },
                      { key: 'summary', title: '变更摘要', render: (_value, row) => display(row.diffSummary, row.fields?.length ? `共 ${row.fields.length} 个字段发生变化` : '仅有历史摘要') },
                      { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> },
                      { key: 'actor', title: '操作者', width: 140, render: (_value, row) => display(row.submitterDisplayName, '未知提交人') },
                      { key: 'time', title: '时间', width: 180, render: (_value, row) => formatDateTime(row.submitTime) }
                    ]}
                  />
                </SectionStateView>
              )
            },
            {
              key: 'reviews', label: `审核记录 (${reviews.data.length})`, children: <SectionStateView state={reviews} onRetry={() => void loadSection('reviews')}><Table rowKey={row => String(row.id)} dataSource={reviews.data} pagination={false} columns={[{ key: 'status', title: '审核状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> }, { key: 'reviewer', title: '审核人', width: 140, render: (_value, row) => display(row.reviewerDisplayName, '尚未分配') }, { key: 'role', title: '审核角色', width: 130, render: (_value, row) => display(row.reviewerRole, '未记录') }, { key: 'comment', title: '审核意见', render: (_value, row) => display(row.reviewComment, '暂无审核意见') }, { key: 'created', title: '发起时间', width: 180, render: (_value, row) => formatDateTime(row.createdAt) }, { key: 'reviewed', title: '处理时间', width: 180, render: (_value, row) => formatDateTime(row.reviewedAt, '尚未处理') }]} /></SectionStateView>
            },
            {
              key: 'sources', label: `来源证据 (${sources.data.length})`, children: <SectionStateView state={sources} onRetry={() => void loadSection('sources')}><Table rowKey={row => String(row.id)} dataSource={sources.data} pagination={false} columns={[{ key: 'source', title: '来源资料', dataIndex: 'sourceDisplayName' }, { key: 'target', title: '关联对象', render: (_value, row) => display(row.targetDisplayName, '关联对象不可用') }, { key: 'reason', title: '绑定说明', render: (_value, row) => display(row.bindingReason, '未填写绑定说明') }, { key: 'confidence', title: '可信度', width: 110, render: (_value, row) => display(row.confidenceLevel, '未评估') }, { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.bindingStatus)}>{statusText(row.bindingStatus)}</Tag> }]} /></SectionStateView>
            },
            {
              key: 'logs', label: `操作日志 (${logs.data.length})`, children: <SectionStateView state={logs} onRetry={() => void loadSection('logs')}><Table rowKey={row => String(row.id)} dataSource={logs.data} pagination={false} columns={[{ key: 'action', title: '动作', width: 130, render: (_value, row) => actionText(row.actionType) }, { key: 'actor', title: '操作者', width: 140, render: (_value, row) => display(row.actorDisplayName, '系统或未知操作者') }, { key: 'status', title: '结果', width: 100, render: (_value, row) => row.resultStatus ? <Tag color={statusColor(row.resultStatus)}>{statusText(row.resultStatus)}</Tag> : '-' }, { key: 'summary', title: '摘要', render: (_value, row) => display(row.summary, '暂无摘要') }, { key: 'time', title: '时间', width: 180, render: (_value, row) => formatDateTime(row.createdAt) }]} /></SectionStateView>
            },
            {
              key: 'chains', label: `链路诊断 (${chains.data.length})`, children: <SectionStateView state={chains} onRetry={() => void loadSection('chains')}><Table rowKey={row => row.chainKey} dataSource={chains.data} pagination={false} columns={[{ key: 'trace', title: '变更链路', render: (_value, row) => <Text code copyable={Boolean(row.traceId)}>{row.traceId || row.chainKey}</Text> }, { key: 'result', title: '最终结果', width: 110, render: (_value, row) => <Tag color={statusColor(row.resultStatus)}>{statusText(row.resultStatus)}</Tag> }, { key: 'reviews', title: '审核事项', width: 110, render: (_value, row) => `${row.reviewTaskIds.length} 条` }, { key: 'started', title: '发起时间', width: 180, render: (_value, row) => formatDateTime(row.startedAt) }, { key: 'completed', title: '最终事件', width: 180, render: (_value, row) => formatDateTime(row.completedAt, '尚未完成') }]} /></SectionStateView>
            }
          ]}
        />
      </Card>
    </div>
  );
}
