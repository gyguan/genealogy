import { useMemo, useState } from 'react';
import type { Key, ReactNode } from 'react';
import { Button, Empty, Table, Typography, message } from 'antd';
import { apiClient } from '../api/client';

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
    || key.endsWith('Id')
    || key.endsWith('Code')
    || key === 'checksum'
    || key === 'storagePath'
    || /(^|[\s（(])ID([\s）)]|$)/i.test(title)
    || /编码|主键|技术标识|系统标识|校验值|SHA/i.test(title);
}

function rowKey(row: Record<string, any>, index?: number) {
  return String(row.id || row.personId || row.clanCode || row.personCode || index);
}

function statusOf(row: Record<string, any>) {
  return String(row?.dataStatus || row?.status || row?.verificationStatus || '').trim().toLowerCase();
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

function pendingReviewRow<T extends Record<string, any>>(row: T): T {
  const next = { ...row } as T;
  if ('dataStatus' in next) next.dataStatus = 'pending_review';
  if ('status' in next) next.status = 'pending_review';
  if ('verificationStatus' in next) next.verificationStatus = 'pending_review';
  return next;
}

function reviewObjectName(row: Record<string, any>, targetType: ReviewTargetType, fallbackColumns: Column<any>[]) {
  if (targetType === 'person') return row.name || `人物#${row.id}`;
  if (targetType === 'branch') return row.branchName || `支派#${row.id}`;
  if (targetType === 'source') return row.sourceName || `来源#${row.id}`;
  if (targetType === 'generation_scheme') return row.schemeName || `字辈方案#${row.id}`;
  if (targetType === 'relationship') {
    const from = row.fromPersonName || row.fromName || (row.fromPersonId ? `人物#${row.fromPersonId}` : '起点');
    const to = row.toPersonName || row.toName || (row.toPersonId ? `人物#${row.toPersonId}` : '终点');
    const label = row.relationLabel || row.relationType || '关系';
    return `${from} → ${to} · ${label}`;
  }
  const firstDisplayColumn = fallbackColumns.find(column => !REVIEW_STATUS_KEYS.has(column.key) && !REVIEW_ACTION_KEYS.has(column.key));
  return firstDisplayColumn ? String(row[firstDisplayColumn.key] ?? '') : `对象#${row.id}`;
}

function isActionColumn(column: Column<any>) {
  return REVIEW_ACTION_KEYS.has(column.key) || /操作|维护/.test(column.title || '');
}

export function DataTable<T extends Record<string, any>>({ data, columns, empty = '暂无数据，请先查询或新建记录', onSelect }: { data: any; columns: Column<T>[]; empty?: string; onSelect?: (row: T) => void }) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [deletedRowKeys, setDeletedRowKeys] = useState<Key[]>([]);
  const [submittedRowKeys, setSubmittedRowKeys] = useState<Key[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRowKey, setDeletingRowKey] = useState<Key | null>(null);
  const allRows = toRecordList<T>(data);
  const rows = allRows
    .filter((row, index) => !deletedRowKeys.includes(rowKey(row, index)))
    .map((row, index) => submittedRowKeys.includes(rowKey(row, index)) || submittedRowKeys.includes(rowKey(row)) ? pendingReviewRow(row) : row);
  const visibleColumns = columns.filter(column => !isTechnicalColumn(column));
  const targetType = useMemo(() => inferReviewTargetType(columns, rows), [columns, rows]);
  const selectableRowHandler = targetType === 'branch' ? undefined : onSelect;
  const reviewableRows = useMemo(() => rows.filter(isReviewable), [rows]);
  const reviewableKeySet = useMemo(() => new Set(reviewableRows.map(row => rowKey(row))), [reviewableRows]);
  const effectiveSelectedKeys = targetType ? selectedRowKeys.filter(key => reviewableKeySet.has(String(key))) : [];
  if (!rows.length) return <Empty className="empty antd-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />;

  async function submitSelectedReview() {
    if (!targetType) return;
    const clanId = workspaceClanId();
    if (!clanId) {
      message.warning('请先选择宗族');
      return;
    }
    const selectedRows = rows.filter(row => effectiveSelectedKeys.includes(rowKey(row)) && isReviewable(row));
    if (!selectedRows.length) {
      message.warning('请先勾选草稿/已驳回版本');
      return;
    }
    setSubmitting(true);
    const results = await Promise.allSettled(selectedRows.map(row => apiClient.post(`/clans/${clanId}/review-tasks`, {
      targetType,
      targetId: Number(row.id),
      comment: `${REVIEW_TARGET_LABEL[targetType]}批量提交审批`
    })));
    const successRows = selectedRows.filter((_row, index) => results[index]?.status === 'fulfilled');
    const successCount = successRows.length;
    const failedCount = results.length - successCount;
    if (successCount) {
      setSubmittedRowKeys(prev => Array.from(new Set([...prev, ...successRows.map(row => rowKey(row))])));
      message.success(`已提交 ${successCount} 条审批任务，列表已自动更新为待审核状态`);
    }
    if (failedCount) message.error(`${failedCount} 条提交失败，请刷新后重试`);
    setSelectedRowKeys([]);
    setSubmitting(false);
  }

  async function deleteBranchDraft(row: T) {
    if (!isDraft(row)) {
      message.warning('仅草稿支派可以删除');
      return;
    }
    const branchName = row.branchName || `支派#${row.id}`;
    const ok = window.confirm(`确认删除草稿支派“${branchName}”吗？删除后不可恢复。`);
    if (!ok) return;
    const key = rowKey(row);
    setDeletingRowKey(key);
    try {
      await apiClient.delete(`/branches/${row.id}`);
      setDeletedRowKeys(prev => [...prev, key]);
      setSelectedRowKeys(prev => prev.filter(item => String(item) !== key));
      message.success('草稿支派已删除');
    } catch (error) {
      message.error((error as Error).message || '删除草稿支派失败');
    } finally {
      setDeletingRowKey(null);
    }
  }

  const reviewRowSelection = targetType && reviewableRows.length ? {
    selectedRowKeys: effectiveSelectedKeys,
    columnTitle: '勾选',
    columnWidth: 88,
    preserveSelectedRowKeys: false,
    getCheckboxProps: (row: T) => ({ disabled: !isReviewable(row), title: isReviewable(row) ? '可提交审批' : '仅草稿/已驳回版本可提交审批' }),
    onChange: (keys: Key[]) => setSelectedRowKeys(keys.filter(key => reviewableKeySet.has(String(key))))
  } : undefined;

  const tableColumns = targetType ? [
    {
      key: 'reviewObjectName',
      title: '对象名',
      ellipsis: true,
      render: (_value: unknown, row: T) => reviewObjectName(row, targetType, visibleColumns)
    },
    {
      key: 'reviewStatus',
      title: '状态',
      width: 120,
      render: (_value: unknown, row: T) => {
        const statusColumn = visibleColumns.find(column => REVIEW_STATUS_KEYS.has(column.key));
        return statusColumn?.render ? statusColumn.render(row) : statusOf(row) || '-';
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
        <Button
          size="small"
          danger
          loading={deletingRowKey === rowKey(row)}
          onClick={event => {
            event.stopPropagation();
            void deleteBranchDraft(row);
          }}
        >
          删除草稿
        </Button>
      ) : '-'
    }] : [])
  ] : [
    ...visibleColumns.map(column => ({
      key: column.key,
      dataIndex: column.key,
      title: column.title,
      ellipsis: true,
      render: (_value: unknown, row: T) => column.render ? column.render(row) : String(row[column.key] ?? '')
    }))
  ];

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
