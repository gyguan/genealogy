import { useMemo, useState } from 'react';
import type { Key, ReactNode } from 'react';
import { Button, Table, Tag, Typography } from 'antd';
import { apiClient } from '../api/client';
import { ConfirmAction, EmptyState } from './Feedback';
import { feedback } from './OperationFeedback';

export type Column<T> = {
  key: string;
  title: string;
  render?: (row: T) => ReactNode;
};

type ReviewTargetType = 'person' | 'relationship' | 'source' | 'branch' | 'generation_scheme';

const REVIEW_TARGET_LABEL: Record<ReviewTargetType, string> = {
  person: '人物',
  relationship: '关系',
  source: '来源',
  branch: '支派',
  generation_scheme: '字辈方案'
};

const REVIEW_STATUS_KEYS = new Set(['dataStatus', 'status', 'verificationStatus']);
const REVIEW_ACTION_KEYS = new Set(['actions', 'maintainWords']);
const TECHNICAL_COLUMN_KEYS = new Set(['targetId', 'targetType', 'checksum', 'storagePath']);

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending: '待处理',
  pending_review: '待审核',
  official: '正式',
  approved: '已通过',
  rejected: '已驳回',
  archived: '已归档',
  success: '成功',
  failed: '失败',
  failure: '失败'
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending: 'processing',
  pending_review: 'processing',
  official: 'success',
  approved: 'success',
  rejected: 'error',
  archived: 'default',
  success: 'success',
  failed: 'error',
  failure: 'error'
};

export function toRecordList<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (data && typeof data === 'object') return [data];
  return [];
}

function isTechnicalColumn(column: Column<any>) {
  if (column.render) return false;
  const key = column.key || '';
  const title = column.title || '';
  return key === 'id'
    || TECHNICAL_COLUMN_KEYS.has(key)
    || key.endsWith('Id')
    || key.endsWith('Code')
    || /(^|[\s（(])ID([\s）)]|$)/i.test(title)
    || /编码|主键|技术标识|系统标识|校验值|SHA|接口字段|存储路径/i.test(title);
}

function rowKey(row: Record<string, any>, index?: number) {
  return String(row.id || row.personId || row.clanCode || row.personCode || index);
}

function statusOf(row: Record<string, any>) {
  return String(row?.dataStatus || row?.status || row?.verificationStatus || '').trim().toLowerCase();
}

function statusLabel(status: string) {
  if (!status) return '-';
  return STATUS_LABEL[status] || '未知状态';
}

function renderStatusTag(row: Record<string, any>) {
  const status = statusOf(row);
  if (!status) return '-';
  return <Tag color={STATUS_COLOR[status] || 'default'}>{statusLabel(status)}</Tag>;
}

function isLifecycleRow(row: Record<string, any>) {
  return row?.dataStatus !== undefined || row?.status !== undefined || row?.verificationStatus !== undefined;
}

function isReviewable(row: Record<string, any>) {
  return ['draft', 'rejected'].includes(statusOf(row)) && Boolean(row.id);
}

function isDraft(row: Record<string, any>) {
  return statusOf(row) === 'draft' && Boolean(row.id);
}

function workspaceClanId() {
  const runtimeValue = (window as any).__genealogyWorkspace?.clanId;
  if (runtimeValue) return String(runtimeValue);
  return localStorage.getItem('genealogy.workspace.clanId') || '';
}

function inferReviewTargetType(columns: Column<any>[], rows: Record<string, any>[]): ReviewTargetType | null {
  const keys = new Set(columns.map(column => column.key));
  const sample = rows.find(row => isLifecycleRow(row) && Boolean(row.id)) || {};
  if (!sample.id) return null;
  if (!columns.some(column => REVIEW_STATUS_KEYS.has(column.key))) return null;
  if (keys.has('branchName') || 'branchName' in sample) return 'branch';
  if (keys.has('schemeName') || 'schemeName' in sample) return 'generation_scheme';
  if (keys.has('sourceName') || 'sourceName' in sample) return 'source';
  if (keys.has('relationLabel') || keys.has('relationType') || 'fromPersonId' in sample || 'toPersonId' in sample) return 'relationship';
  if (keys.has('name') && ('branchId' in sample || 'generationNo' in sample || 'dataStatus' in sample)) return 'person';
  return null;
}

function reviewObjectName(row: Record<string, any>, targetType: ReviewTargetType, fallbackColumns: Column<any>[]) {
  if (targetType === 'person') return row.name || '未命名人物';
  if (targetType === 'branch') return row.branchName || '未命名支派';
  if (targetType === 'source') return row.sourceName || '未命名来源';
  if (targetType === 'generation_scheme') return row.schemeName || '未命名字辈方案';
  if (targetType === 'relationship') {
    const from = row.fromPersonName || row.fromName || '起点人物待维护';
    const to = row.toPersonName || row.toName || '终点人物待维护';
    const label = row.relationLabel || row.relationType || '关系';
    return `${from} → ${to} · ${label}`;
  }
  const firstDisplayColumn = fallbackColumns.find(column => !REVIEW_STATUS_KEYS.has(column.key) && !REVIEW_ACTION_KEYS.has(column.key));
  return firstDisplayColumn ? String(row[firstDisplayColumn.key] ?? '') : '对象信息待维护';
}

function isActionColumn(column: Column<any>) {
  return REVIEW_ACTION_KEYS.has(column.key) || /操作|维护/.test(column.title || '');
}

type DataTableProps<T extends Record<string, any>> = {
  data: any;
  columns: Column<T>[];
  empty?: string;
  onSelect?: (row: T) => void;
  normalizeReviewColumns?: boolean;
  reviewTargetType?: ReviewTargetType;
};

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  empty = '暂无数据，请先查询或新建记录',
  onSelect,
  normalizeReviewColumns = true,
  reviewTargetType
}: DataTableProps<T>) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [deletedRowKeys, setDeletedRowKeys] = useState<Key[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRowKey, setDeletingRowKey] = useState<Key | null>(null);
  const allRows = toRecordList<T>(data);
  const rows = allRows.filter((row, index) => !deletedRowKeys.includes(rowKey(row, index)));
  const visibleColumns = columns.filter(column => !isTechnicalColumn(column));
  const inferredTargetType = useMemo(() => inferReviewTargetType(columns, rows), [columns, rows]);
  const targetType = reviewTargetType || inferredTargetType;
  const selectableRowHandler = targetType === 'branch' ? undefined : onSelect;
  const reviewableRows = useMemo(() => rows.filter(isReviewable), [rows]);
  const reviewableKeySet = useMemo(() => new Set(reviewableRows.map(row => rowKey(row))), [reviewableRows]);
  const effectiveSelectedKeys = targetType ? selectedRowKeys.filter(key => reviewableKeySet.has(String(key))) : [];

  async function submitSelectedReview() {
    if (!targetType) return;
    const clanId = workspaceClanId();
    if (!clanId) {
      feedback.warning('请先选择宗族');
      return;
    }
    const selectedRows = rows.filter(row => effectiveSelectedKeys.includes(rowKey(row)) && isReviewable(row));
    if (!selectedRows.length) {
      feedback.warning('请先勾选草稿/已驳回版本');
      return;
    }
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(selectedRows.map(row => apiClient.post(`/clans/${clanId}/review-tasks`, {
        targetType,
        targetId: Number(row.id),
        comment: `${REVIEW_TARGET_LABEL[targetType]}批量提交审批`
      })));
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount) {
        feedback.success(`已提交 ${successCount} 条审批任务，列表将自动刷新`);
        window.dispatchEvent(new CustomEvent('genealogy:review-submitted', { detail: { targetType, successCount } }));
      }
      if (failedCount) feedback.error(`${failedCount} 条提交失败，请刷新后重试`);
      setSelectedRowKeys([]);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteBranchDraft(row: T) {
    if (!isDraft(row)) {
      feedback.warning('仅草稿支派可以删除');
      return;
    }
    const key = rowKey(row);
    setDeletingRowKey(key);
    try {
      await apiClient.delete(`/branches/${row.id}`);
      setDeletedRowKeys(previous => [...previous, key]);
      setSelectedRowKeys(previous => previous.filter(item => String(item) !== key));
      feedback.success('草稿支派已删除');
      window.dispatchEvent(new CustomEvent('genealogy:object-changed', { detail: { targetType: 'branch' } }));
    } catch (error) {
      feedback.error((error as Error).message || '删除草稿支派失败');
    } finally {
      setDeletingRowKey(null);
    }
  }

  if (!rows.length) return <EmptyState title={empty} compact />;

  const reviewRowSelection = targetType && reviewableRows.length ? {
    selectedRowKeys: effectiveSelectedKeys,
    columnTitle: '勾选',
    columnWidth: 88,
    preserveSelectedRowKeys: false,
    getCheckboxProps: (row: T) => ({ disabled: !isReviewable(row), title: isReviewable(row) ? '可提交审批' : '仅草稿/已驳回版本可提交审批' }),
    onChange: (keys: Key[]) => setSelectedRowKeys(keys.filter(key => reviewableKeySet.has(String(key))))
  } : undefined;

  const normalizedReviewColumns = [
    {
      key: 'reviewObjectName',
      title: '对象名',
      ellipsis: true,
      render: (_value: unknown, row: T) => reviewObjectName(row, targetType!, visibleColumns)
    },
    {
      key: 'reviewStatus',
      title: '状态',
      width: 120,
      render: (_value: unknown, row: T) => {
        const statusColumn = visibleColumns.find(column => REVIEW_STATUS_KEYS.has(column.key));
        return statusColumn?.render ? statusColumn.render(row) : renderStatusTag(row);
      }
    },
    ...visibleColumns.filter(isActionColumn).map(column => ({
      key: column.key,
      dataIndex: column.key,
      title: '操作',
      width: 120,
      render: (_value: unknown, row: T) => column.render ? column.render(row) : String(row[column.key] ?? '')
    })),
    ...(targetType === 'branch' ? [{
      key: 'actions',
      title: '操作',
      width: 96,
      render: (_value: unknown, row: T) => isDraft(row) ? (
        <ConfirmAction
          title="删除草稿支派"
          description={`确认删除草稿支派“${row.branchName || '未命名支派'}”吗？`}
          okText="删除"
          danger
          onConfirm={() => void deleteBranchDraft(row)}
        >
          <Button
            size="small"
            danger
            loading={deletingRowKey === rowKey(row)}
            onClick={event => event.stopPropagation()}
          >
            删除草稿
          </Button>
        </ConfirmAction>
      ) : '-'
    }] : [])
  ];

  const originalColumns = visibleColumns.map(column => ({
    key: column.key,
    dataIndex: column.key,
    title: column.title,
    ellipsis: true,
    render: (_value: unknown, row: T) => {
      if (column.render) return column.render(row);
      if (REVIEW_STATUS_KEYS.has(column.key)) return renderStatusTag(row);
      return String(row[column.key] ?? '');
    }
  }));

  const tableColumns = targetType && normalizeReviewColumns ? normalizedReviewColumns : originalColumns;

  return (
    <div className={`table-wrap antd-table-wrap${reviewRowSelection ? ' batch-review-table-wrap' : ''}`}>
      {selectableRowHandler ? <Typography.Text className="table-hint" type="secondary">点击列表行可查看详情或执行后续操作</Typography.Text> : null}
      {targetType && reviewableRows.length ? (
        <div className="batch-review-actions table-review-actions">
          <Typography.Text type="secondary">仅草稿/已驳回对象可勾选提交审批。</Typography.Text>
          <Button size="small" type="primary" disabled={!effectiveSelectedKeys.length} loading={submitting} onClick={submitSelectedReview}>
            批量提交审批（{effectiveSelectedKeys.length}）
          </Button>
        </div>
      ) : null}
      <Table<T>
        size="small"
        bordered={Boolean(reviewRowSelection)}
        rowKey={rowKey}
        rowSelection={reviewRowSelection}
        dataSource={rows}
        pagination={false}
        tableLayout="fixed"
        scroll={{ x: 'max-content' }}
        columns={tableColumns}
        onRow={row => ({
          onClick: () => selectableRowHandler?.(row),
          className: selectableRowHandler ? 'clickable' : '',
          title: selectableRowHandler ? '点击查看详情' : undefined
        })}
      />
    </div>
  );
}
