import { Collapse, Descriptions, Drawer, Skeleton, Space, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import type {
  OperationLogResponse,
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

import { PageFeedback } from '../../shared/ui/Feedback';

import { EmptyState } from '../../shared/ui/Feedback';

const { Text, Title } = Typography;

function technicalLogItems(log: OperationLogResponse) {
  const values = [
    ['请求标识', log.requestId],
    ['客户端地址', log.clientIp],
    ['技术详情', log.detail]
  ].filter(([, value]) => String(value ?? '').trim());
  if (!values.length) return null;
  return (
    <Descriptions size="small" bordered column={1}>
      {values.map(([label, value]) => (
        <Descriptions.Item key={label} label={label}>{display(value)}</Descriptions.Item>
      ))}
    </Descriptions>
  );
}

function TraceOverview({ detail }: { detail: TrackingTraceDetailResponse }) {
  const summary = detail.objectSummary;
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="业务对象">{summary.displayName}</Descriptions.Item>
        <Descriptions.Item label="对象类型">{targetTypeText(summary.objectType)}</Descriptions.Item>
        <Descriptions.Item label="所属支派">{display(summary.branchName, '未归属支派')}</Descriptions.Item>
        <Descriptions.Item label="当前状态">
          <Tag color={statusColor(detail.currentStatus)}>{statusText(detail.currentStatus)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="业务摘要" span={2}>{display(summary.summary || summary.secondaryLabel, '暂无摘要')}</Descriptions.Item>
        <Descriptions.Item label="最近变更">{formatDateTime(summary.changedAt)}</Descriptions.Item>
        <Descriptions.Item label="历史覆盖">
          <Tag color={detail.traceCoverage.complete ? 'success' : 'warning'}>{coverageText(detail.traceCoverage.level)}</Tag>
        </Descriptions.Item>
      </Descriptions>
      <PageFeedback
        tone={detail.traceCoverage.complete ? 'success' : 'warning'}
        title={detail.traceCoverage.complete ? '当前可见历史已完整加载' : '当前历史存在范围说明'}
        description={detail.traceCoverage.notes.join('；') || '未发现需要补充说明的历史缺口'}
      />
    </Space>
  );
}

function TraceTimeline({ detail }: { detail: TrackingTraceDetailResponse }) {
  if (!detail.timeline.length) {
    return <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="当前对象暂无可见变更记录" />;
  }
  return (
    <Timeline
      items={detail.timeline.map(item => ({
        color: traceEventColor(item),
        children: (
          <div className="tracking-timeline-entry">
            <Space size={8} wrap>
              <Tag>{traceSourceText(item.sourceType)}</Tag>
              <Text strong>{item.title}</Text>
              {item.resultStatus ? <Tag color={statusColor(item.resultStatus)}>{statusText(item.resultStatus)}</Tag> : null}
            </Space>
            <p>{display(item.summary, '暂无补充说明')}</p>
            <Text type="secondary">{formatDateTime(item.occurredAt)} · {display(item.actorDisplayName, '系统或未知操作者')}</Text>
          </div>
        )
      }))}
    />
  );
}


function compatibilityText(value: string) {
  if (value === 'complete') return '完整链路';
  if (value === 'legacy_partial') return '历史兼容';
  if (value === 'inconsistent') return '关联不一致';
  if (value === 'orphan_partial') return '仅日志链路';
  return value || '未知';
}

function ChangeChainTable({ rows }: { rows: TrackingTraceChangeChainResponse[] }) {
  return (
    <Table<TrackingTraceChangeChainResponse>
      size="small"
      rowKey={row => row.chainKey}
      dataSource={rows}
      pagination={false}
      locale={{ emptyText: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无可识别的单次变更链路" /> }}
      scroll={{ x: 940 }}
      columns={[
        {
          key: 'trace',
          title: '变更链路',
          width: 260,
          render: (_value, row) => (
            <div>
              <Text code copyable={Boolean(row.traceId)}>{row.traceId || row.chainKey}</Text>
              <div><Text type="secondary">版本 #{display(row.revisionId, '历史记录')}</Text></div>
            </div>
          )
        },
        {
          key: 'compatibility',
          title: '覆盖状态',
          width: 120,
          render: (_value, row) => (
            <Tag color={row.compatibilityStatus === 'complete' ? 'success' : row.compatibilityStatus === 'inconsistent' ? 'error' : 'warning'}>
              {compatibilityText(row.compatibilityStatus)}
            </Tag>
          )
        },
        { key: 'result', title: '最终结果', width: 110, render: (_value, row) => <Tag color={statusColor(row.resultStatus)}>{statusText(row.resultStatus)}</Tag> },
        { key: 'reviews', title: '审核事项', width: 110, render: (_value, row) => `${row.reviewTaskIds.length} 条` },
        { key: 'started', title: '发起时间', width: 170, render: (_value, row) => formatDateTime(row.startedAt) },
        { key: 'completed', title: '最终事件', width: 170, render: (_value, row) => formatDateTime(row.completedAt, '尚未完成') },
        { key: 'events', title: '链路事件', width: 110, render: (_value, row) => `${row.eventKeys.length} 条` }
      ]}
    />
  );
}

function RevisionTable({ rows }: { rows: TrackingTraceRevisionResponse[] }) {
  return (
    <Table<TrackingTraceRevisionResponse>
      size="small"
      rowKey={row => String(row.id)}
      dataSource={rows}
      pagination={false}
      locale={{ emptyText: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无字段差异或版本记录" /> }}
      scroll={{ x: 760 }}
      columns={[
        { key: 'changeType', title: '变更类型', render: (_value, row) => display(row.changeType, '变更') },
        { key: 'diffSummary', title: '字段差异摘要', render: (_value, row) => display(row.diffSummary, '后端未返回字段差异摘要') },
        { key: 'status', title: '状态', width: 100, render: (_value, row) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> },
        { key: 'submitter', title: '提交人', width: 140, render: (_value, row) => display(row.submitterDisplayName, '未知提交人') },
        { key: 'submitTime', title: '提交时间', width: 170, render: (_value, row) => formatDateTime(row.submitTime) },
        { key: 'result', title: '处理结果', width: 220, render: (_value, row) => display(row.rejectedReason || (row.approvedAt ? `通过于 ${formatDateTime(row.approvedAt)}` : ''), '尚无最终处理结果') }
      ]}
    />
  );
}

function ReviewTable({ rows }: { rows: TrackingTraceReviewTaskResponse[] }) {
  return (
    <Table<TrackingTraceReviewTaskResponse>
      size="small"
      rowKey={row => String(row.id)}
      dataSource={rows}
      pagination={false}
      locale={{ emptyText: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无审核记录" /> }}
      scroll={{ x: 820 }}
      columns={[
        { key: 'status', title: '审核状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> },
        { key: 'reviewer', title: '审核人', width: 140, render: (_value, row) => display(row.reviewerDisplayName, '尚未分配') },
        { key: 'role', title: '审核角色', width: 130, render: (_value, row) => display(row.reviewerRole, '未记录') },
        { key: 'branch', title: '审核支派', width: 140, render: (_value, row) => display(row.branchName, '宗族范围') },
        { key: 'comment', title: '审核意见', render: (_value, row) => display(row.reviewComment, '暂无审核意见') },
        { key: 'createdAt', title: '发起时间', width: 170, render: (_value, row) => formatDateTime(row.createdAt) },
        { key: 'reviewedAt', title: '处理时间', width: 170, render: (_value, row) => formatDateTime(row.reviewedAt, '尚未处理') }
      ]}
    />
  );
}

function SourceTable({ rows }: { rows: TrackingTraceSourceBindingResponse[] }) {
  return (
    <Table<TrackingTraceSourceBindingResponse>
      size="small"
      rowKey={row => String(row.id)}
      dataSource={rows}
      pagination={false}
      locale={{ emptyText: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无可见来源证据" /> }}
      scroll={{ x: 760 }}
      columns={[
        { key: 'source', title: '来源资料', render: (_value, row) => row.sourceDisplayName },
        { key: 'target', title: '关联对象', render: (_value, row) => display(row.targetDisplayName, '关联对象不可用') },
        { key: 'reason', title: '绑定说明', render: (_value, row) => display(row.bindingReason, '未填写绑定说明') },
        { key: 'confidence', title: '可信度', width: 110, render: (_value, row) => display(row.confidenceLevel, '未评估') },
        { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.bindingStatus)}>{statusText(row.bindingStatus)}</Tag> },
        { key: 'creator', title: '维护人', width: 140, render: (_value, row) => display(row.createdByDisplayName, '未知维护人') },
        { key: 'time', title: '最近维护', width: 170, render: (_value, row) => formatDateTime(row.updatedAt || row.createdAt) }
      ]}
    />
  );
}

function TraceLogTable({ rows }: { rows: OperationLogResponse[] }) {
  return (
    <Table<OperationLogResponse>
      size="small"
      rowKey={row => String(row.id)}
      dataSource={rows}
      pagination={false}
      locale={{ emptyText: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无可见原始日志" /> }}
      scroll={{ x: 820 }}
      expandable={{
        rowExpandable: row => Boolean(technicalLogItems(row)),
        expandedRowRender: row => technicalLogItems(row),
        expandRowByClick: false
      }}
      columns={[
        { key: 'action', title: '动作', width: 130, render: (_value, row) => actionText(row.actionType) },
        { key: 'target', title: '业务对象', render: (_value, row) => display(row.targetDisplayName || row.targetSummary, '业务对象信息不可用') },
        { key: 'actor', title: '操作者', width: 140, render: (_value, row) => display(row.actorDisplayName, '系统或未知操作者') },
        { key: 'status', title: '结果', width: 100, render: (_value, row) => row.resultStatus ? <Tag color={statusColor(row.resultStatus)}>{statusText(row.resultStatus)}</Tag> : '-' },
        { key: 'summary', title: '摘要', render: (_value, row) => display(row.summary, '暂无摘要') },
        { key: 'time', title: '时间', width: 170, render: (_value, row) => formatDateTime(row.createdAt) }
      ]}
    />
  );
}

export function TrackingTraceDrawer({
  open,
  loading,
  error,
  detail,
  selectedObject,
  onClose
}: {
  open: boolean;
  loading: boolean;
  error: string;
  detail: TrackingTraceDetailResponse | null;
  selectedObject: TrackingObjectResponse | null;
  onClose: () => void;
}) {
  const title = detail?.objectSummary.displayName || selectedObject?.displayName || '对象追踪详情';
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1040px, 96vw)"
      destroyOnHidden
      title={(
        <div>
          <Title level={4} style={{ margin: 0 }}>{title}</Title>
          <Text type="secondary">只读追踪 · {targetTypeText(detail?.objectSummary.objectType || selectedObject?.objectType)}</Text>
        </div>
      )}
    >
      {loading ? <Skeleton active paragraph={{ rows: 10 }} /> : null}
      {!loading && error ? <PageFeedback tone="error" title="追踪详情加载失败" description={error} /> : null}
      {!loading && !error && detail ? (
        <Tabs
          defaultActiveKey="timeline"
          items={[
            { key: 'overview', label: '对象概览', children: <TraceOverview detail={detail} /> },
            { key: 'timeline', label: `事件时间线 (${detail.timeline.length})`, children: <TraceTimeline detail={detail} /> },
            { key: 'chains', label: `单次变更链路 (${detail.changeChains.length})`, children: <ChangeChainTable rows={detail.changeChains} /> },
            { key: 'changes', label: `字段差异 (${detail.revisions.length})`, children: <RevisionTable rows={detail.revisions} /> },
            { key: 'reviews', label: `审核记录 (${detail.reviewTasks.length})`, children: <ReviewTable rows={detail.reviewTasks} /> },
            { key: 'sources', label: `来源证据 (${detail.sourceBindings.length})`, children: <SourceTable rows={detail.sourceBindings} /> },
            { key: 'logs', label: `原始日志 (${detail.operationLogs.length})`, children: <TraceLogTable rows={detail.operationLogs} /> }
          ]}
        />
      ) : null}
    </Drawer>
  );
}

export function OperationLogDrawer({
  log,
  onClose
}: {
  log: OperationLogResponse | null;
  onClose: () => void;
}) {
  const technical = log ? technicalLogItems(log) : null;
  return (
    <Drawer
      open={Boolean(log)}
      onClose={onClose}
      width="min(680px, 96vw)"
      destroyOnHidden
      title="操作审计详情"
    >
      {log ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Descriptions size="small" bordered column={1}>
            <Descriptions.Item label="动作">{actionText(log.actionType)}</Descriptions.Item>
            <Descriptions.Item label="业务对象">{targetTypeText(log.targetType)}：{display(log.targetDisplayName || log.targetSummary, '业务信息不可用')}</Descriptions.Item>
            <Descriptions.Item label="所属支派">{display(log.targetBranchName, '未记录支派')}</Descriptions.Item>
            <Descriptions.Item label="操作者">{display(log.actorDisplayName, '系统或未知操作者')}</Descriptions.Item>
            <Descriptions.Item label="执行结果">{log.resultStatus ? <Tag color={statusColor(log.resultStatus)}>{statusText(log.resultStatus)}</Tag> : '未记录'}</Descriptions.Item>
            <Descriptions.Item label="操作时间">{formatDateTime(log.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="业务摘要">{display(log.summary || log.targetSummary, '暂无摘要')}</Descriptions.Item>
          </Descriptions>
          {technical ? (
            <Collapse
              items={[{
                key: 'technical',
                label: '技术信息（默认折叠）',
                children: technical
              }]}
            />
          ) : (
            <PageFeedback tone="info" title="当前权限未返回技术信息" description="技术详情仅向具备审计导出权限的用户披露。" />
          )}
        </Space>
      ) : null}
    </Drawer>
  );
}
