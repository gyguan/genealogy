import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert, Button, Card, DatePicker, Form, Result, Select, Space, Table, Tag, Typography } from 'antd';
import { apiClient, ApiRequestError } from '../../shared/api/client';
import type {
  OperationLogResponse,
  RiskAuditEventPage,
  RiskAuditEventResponse
} from '../../shared/api/generated/tracking-types';
import { OperationLogDrawer } from './TrackingDetailDrawers';
import { buildRiskQuery, DEFAULT_RISK_FILTERS, TRACKING_PAGE_SIZE } from './trackingCenterModel.js';
import type { RiskFilters } from './trackingCenterModel.js';
import {
  RISK_DISPOSITION_OPTIONS,
  RISK_EVENT_OPTIONS,
  RISK_LEVEL_OPTIONS,
  actionText,
  display,
  formatDateTime,
  riskDispositionColor,
  riskDispositionText,
  riskEventText,
  riskLevelColor,
  riskLevelText,
  targetTypeText
} from './trackingCenterLabels';

import { PageFeedback } from '../../shared/ui/Feedback';

import { EmptyState } from '../../shared/ui/Feedback';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const TRACEABLE_TYPES = new Set([
  'person', 'relationship', 'source', 'branch', 'review_task',
  'culture_item', 'migration_event', 'culture_site'
]);

function rangeValue(from: string, to: string) {
  if (!from || !to) return null;
  const start = dayjs(from);
  const end = dayjs(to);
  return start.isValid() && end.isValid() ? [start, end] as any : null;
}

function rangeStrings(values: any) {
  if (!values?.[0] || !values?.[1]) return ['', ''] as const;
  return [values[0].format('YYYY-MM-DDTHH:mm:ss'), values[1].format('YYYY-MM-DDTHH:mm:ss')] as const;
}

function asOperationLog(row: RiskAuditEventResponse): OperationLogResponse {
  return {
    id: row.id,
    clanId: row.clanId,
    actorId: row.actorId,
    actorDisplayName: row.actorDisplayName,
    actionType: row.actionType,
    targetType: row.targetType,
    targetId: row.targetId,
    targetDisplayName: row.targetDisplayName,
    targetBranchName: row.targetBranchName,
    targetSummary: row.targetSummary,
    resultStatus: row.resultStatus,
    summary: row.summary,
    detail: row.detail,
    requestId: row.requestId,
    clientIp: row.clientIp,
    createdAt: row.createdAt,
    traceId: row.traceId,
    revisionId: row.revisionId,
    reviewTaskId: row.reviewTaskId,
    businessTargetType: row.trackingTargetType,
    businessTargetId: row.trackingTargetId,
    eventResult: row.resultStatus
  };
}

type Props = {
  active: boolean;
  clanId: string;
  workspaceBranchId: string;
  filters: RiskFilters;
  setFilters: (next: RiskFilters | ((previous: RiskFilters) => RiskFilters)) => void;
  selectedRiskLogId: string;
  setSelectedRiskLogId: (value: string) => void;
  onOpenTrace: (targetType: string, targetId: string, reviewTaskId?: string) => void;
};

export function RiskAuditPanel({
  active,
  clanId,
  workspaceBranchId,
  filters,
  setFilters,
  selectedRiskLogId,
  setSelectedRiskLogId,
  onOpenTrace
}: Props) {
  const [page, setPage] = useState<RiskAuditEventPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [selected, setSelected] = useState<RiskAuditEventResponse | null>(null);
  const requestVersion = useRef(0);

  async function load(nextFilters = filters, selectedId = selectedRiskLogId) {
    if (!active || !clanId) return;
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const query = buildRiskQuery(nextFilters, clanId);
      const nextPage = await apiClient.get<RiskAuditEventPage>(`/logs/risks?${query}`);
      if (version !== requestVersion.current) return;
      setPage(nextPage);
      setSelected(selectedId ? nextPage.records.find(row => String(row.id) === selectedId) || null : null);
    } catch (loadError) {
      if (version !== requestVersion.current) return;
      const requestError = loadError as ApiRequestError;
      setForbidden(requestError.status === 403);
      setError((loadError as Error)?.message || '风险审计查询失败');
      setPage(null);
      setSelected(null);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    void load(filters, selectedRiskLogId);
  }, [
    active,
    clanId,
    filters.actorId,
    filters.riskLevel,
    filters.eventType,
    filters.branchId,
    filters.dispositionStatus,
    filters.startTime,
    filters.endTime,
    filters.pageNo,
    filters.pageSize,
    selectedRiskLogId
  ]);

  const actorOptions = useMemo(() => {
    const actors = new Map<string, string>();
    (page?.records || []).forEach(row => {
      if (row.actorId != null) actors.set(String(row.actorId), display(row.actorDisplayName, '系统或未知操作者'));
    });
    if (filters.actorId && !actors.has(filters.actorId)) actors.set(filters.actorId, '已选操作者');
    return Array.from(actors.entries()).map(([value, label]) => ({ value, label }));
  }, [page, filters.actorId]);

  const branchOptions = [
    { value: '', label: '本人可见支派范围' },
    ...(workspaceBranchId ? [{ value: workspaceBranchId, label: '当前工作区支派' }] : [])
  ];

  function update<K extends keyof RiskFilters>(key: K, value: RiskFilters[K]) {
    setFilters(previous => ({ ...previous, [key]: value }));
  }

  function reset() {
    setSelected(null);
    setSelectedRiskLogId('');
    setFilters({ ...DEFAULT_RISK_FILTERS });
  }

  function openLog(row: RiskAuditEventResponse) {
    setSelected(row);
    setSelectedRiskLogId(String(row.id));
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="tracking-filter-card">
        <Form layout="vertical">
          <div className="tracking-filter-grid tracking-filter-grid--audit">
            <Form.Item label="时间范围">
              <RangePicker
                value={rangeValue(filters.startTime, filters.endTime)}
                showTime
                format="YYYY-MM-DD HH:mm"
                allowClear
                onChange={values => {
                  const [startTime, endTime] = rangeStrings(values);
                  setFilters(previous => ({ ...previous, startTime, endTime, pageNo: 1 }));
                }}
              />
            </Form.Item>
            <Form.Item label="风险等级">
              <Select value={filters.riskLevel} options={RISK_LEVEL_OPTIONS} onChange={value => update('riskLevel', value)} />
            </Form.Item>
            <Form.Item label="事件类型">
              <Select value={filters.eventType} options={RISK_EVENT_OPTIONS} onChange={value => update('eventType', value)} />
            </Form.Item>
            <Form.Item label="处置状态">
              <Select value={filters.dispositionStatus} options={RISK_DISPOSITION_OPTIONS} onChange={value => update('dispositionStatus', value)} />
            </Form.Item>
            <Form.Item label="操作者">
              <Select
                value={filters.actorId || undefined}
                options={actorOptions}
                placeholder="全部操作者"
                allowClear
                showSearch
                optionFilterProp="label"
                onChange={value => update('actorId', value || '')}
              />
            </Form.Item>
            <Form.Item label="所属支派">
              <Select value={filters.branchId} options={branchOptions} onChange={value => update('branchId', value)} />
            </Form.Item>
          </div>
        </Form>
        <div className="tracking-filter-actions">
          <Space wrap>
            <Button type="primary" loading={loading} onClick={() => void load(filters, '')}>查询</Button>
            <Button disabled={loading} onClick={reset}>重置</Button>
          </Space>
          <Text type="secondary">风险事件分页由服务端在权限范围内计算。</Text>
        </div>
      </Card>

      {forbidden ? (
        <Result status="403" title="无权查看高风险审计" subTitle="当前账号缺少高风险操作审计权限，风险事件不会返回。" />
      ) : error ? (
        <PageFeedback tone="error" title="风险审计查询失败" description={error} action={<Button size="small" onClick={() => void load()}>重试</Button>} />
      ) : (
        <>
          <Card title="高风险操作事件" extra={<Text type="secondary">点击记录查看原始日志；可追踪对象可直接跳转</Text>}>
            <Table<RiskAuditEventResponse>
              size="small"
              rowKey={row => String(row.id)}
              dataSource={page?.records || []}
              loading={loading}
              scroll={{ x: 1180 }}
              onRow={row => ({ onClick: () => openLog(row) })}
              rowClassName="tracking-clickable-row"
              locale={{ emptyText: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="当前条件下暂无高风险操作" /> }}
              pagination={{
                current: page?.pageNo || filters.pageNo,
                pageSize: TRACKING_PAGE_SIZE,
                total: page?.total || 0,
                showSizeChanger: false,
                showTotal: total => `共 ${total} 条风险事件`,
                onChange: pageNo => setFilters(previous => ({ ...previous, pageNo, pageSize: TRACKING_PAGE_SIZE }))
              }}
              columns={[
                { key: 'time', title: '发生时间', width: 180, render: (_value, row) => formatDateTime(row.createdAt) },
                { key: 'level', title: '风险等级', width: 100, render: (_value, row) => <Tag color={riskLevelColor(row.riskLevel)}>{riskLevelText(row.riskLevel)}</Tag> },
                { key: 'event', title: '事件类型', width: 170, render: (_value, row) => riskEventText(row.eventType) },
                { key: 'actor', title: '操作者', width: 150, render: (_value, row) => display(row.actorDisplayName, '系统或未知操作者') },
                { key: 'target', title: '业务对象', render: (_value, row) => <div><Text strong>{display(row.targetDisplayName || row.targetSummary, targetTypeText(row.targetType))}</Text><div><Text type="secondary">{targetTypeText(row.targetType)}{row.targetBranchName ? ` · ${row.targetBranchName}` : ''}</Text></div></div> },
                { key: 'action', title: '动作', width: 150, render: (_value, row) => actionText(row.actionType) },
                { key: 'disposition', title: '处置状态', width: 110, render: (_value, row) => <Tag color={riskDispositionColor(row.dispositionStatus)}>{riskDispositionText(row.dispositionStatus)}</Tag> },
                { key: 'summary', title: '风险摘要', render: (_value, row) => display(row.summary, '暂无摘要') },
                {
                  key: 'actions',
                  title: '操作',
                  width: 170,
                  render: (_value, row) => (
                    <Space size={4}>
                      <Button type="link" onClick={event => { event.stopPropagation(); openLog(row); }}>日志详情</Button>
                      {row.trackingTargetType && row.trackingTargetId != null && TRACEABLE_TYPES.has(row.trackingTargetType) ? (
                        <Button type="link" onClick={event => {
                          event.stopPropagation();
                          onOpenTrace(row.trackingTargetType!, String(row.trackingTargetId), row.reviewTaskId ? String(row.reviewTaskId) : '');
                        }}>对象追踪</Button>
                      ) : null}
                    </Space>
                  )
                }
              ]}
            />
          </Card>
        </>
      )}

      <OperationLogDrawer
        log={selected ? asOperationLog(selected) : null}
        onClose={() => {
          setSelected(null);
          setSelectedRiskLogId('');
        }}
      />
    </Space>
  );
}
