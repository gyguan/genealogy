import { useMemo, useState } from 'react';
import type { Key, ReactNode } from 'react';
import { Button, Checkbox, Empty, Space, Table, Typography, message } from 'antd';
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

function workspaceClanId() {
  const runtimeValue = (window as any).__genealogyWorkspace?.clanId;
  if (runtimeValue) return String(runtimeValue);
  return localStorage.getItem('genealogy.workspace.clanId') || '';
}

function inferReviewTargetType(columns: Column<any>[], rows: Record<string, any>[]): ReviewTargetType | null {
  const keys = new Set(columns.map(column => column.key));
  const sample = rows.find(isLifecycleRow) || rows[0] || {};
  if (!isLifecycleRow(sample)) return null;
  if (!columns.some(column => REVIEW_STATUS_KEYS.has(column.key))) return null;
  if (keys.has('branchName') || 'branchName' in sample) return 'branch';
  if (keys.has('schemeName') || 'schemeName' in sample) return 'generation_scheme';
  if (keys.has('sourceName') || 'sourceName' in sample) return 'source';
  if (keys.has('relationLabel') || keys.has('relationType') || 'fromPersonId' in sample || 'toPersonId' in sample) return 'relationship';
  if (keys.has('name') && ('branchId' in sample || 'generationNo' in sample || 'dataStatus' in sample)) return 'person';
  return null;
}

export function DataTable<T extends Record<string, any>>({ data, columns, empty = '暂无数据，请先查询或新建记录', onSelect }: { data: any; columns: Column<T>[]; empty?: string; onSelect?: (row: T) => void }) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const rows = toRecordList<T>(data);
  const visibleColumns = columns.filter(column => !isTechnicalColumn(column));
  const targetType = useMemo(() => inferReviewTargetType(columns, rows), [columns, rows]);
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
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const failedCount = results.length - successCount;
    if (successCount) message.success(`已提交 ${successCount} 条审批任务，请刷新列表查看最新状态`);
    if (failedCount) message.error(`${failedCount} 条提交失败，请刷新后重试`);
    setSelectedRowKeys([]);
    setSubmitting(false);
  }

  const reviewRowSelection = targetType && reviewableRows.length ? {
    selectedRowKeys: effectiveSelectedKeys,
    columnTitle: '勾选',
    preserveSelectedRowKeys: false,
    getCheckboxProps: (row: T) => ({ disabled: !isReviewable(row), title: isReviewable(row) ? '可提交审批' : '仅草稿/已驳回版本可提交审批' }),
    onChange: (keys: Key[]) => setSelectedRowKeys(keys.filter(key => reviewableKeySet.has(String(key))))
  } : undefined;

  return (
    <div className="table-wrap antd-table-wrap">
      {onSelect ? <Typography.Text className="table-hint" type="secondary">点击列表行可查看详情或执行后续操作</Typography.Text> : null}
      {targetType && reviewableRows.length ? (
        <Space className="table-review-actions" size={8} wrap>
          <Checkbox
            checked={effectiveSelectedKeys.length === reviewableRows.length}
            indeterminate={effectiveSelectedKeys.length > 0 && effectiveSelectedKeys.length < reviewableRows.length}
            onChange={event => setSelectedRowKeys(event.target.checked ? reviewableRows.map(row => rowKey(row)) : [])}
          >
            勾选草稿/已驳回版本
          </Checkbox>
          <Button size="small" type="primary" disabled={!effectiveSelectedKeys.length} loading={submitting} onClick={submitSelectedReview}>
            批量提交审批（{effectiveSelectedKeys.length}）
          </Button>
        </Space>
      ) : null}
      <Table<T>
        size="small"
        bordered={false}
        rowKey={rowKey}
        rowSelection={reviewRowSelection}
        dataSource={rows}
        pagination={false}
        tableLayout="fixed"
        scroll={{ x: 'max-content' }}
        columns={visibleColumns.map(column => ({
          key: column.key,
          dataIndex: column.key,
          title: column.title,
          ellipsis: true,
          render: (_value: unknown, row: T) => column.render ? column.render(row) : String(row[column.key] ?? '')
        }))}
        onRow={row => ({
          onClick: () => onSelect?.(row),
          className: onSelect ? 'clickable' : '',
          title: onSelect ? '点击查看详情' : undefined
        })}
      />
    </div>
  );
}
