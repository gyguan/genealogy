import type { Key, ReactNode } from 'react';
import { Button, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import { WIZARD_RESULT_PAGE_SIZE, wizardBatchToolbarVisible, wizardSelectionLabel } from '../../features/mvp1/domain/wizardResultListModel';
import { QueryResultCard } from './QueryResultCards';
import './result-list-card.css';

import { PageFeedback } from './Feedback';

type ResultListCardProps<RecordType extends object> = TableProps<RecordType> & {
  description?: ReactNode;
  notice?: ReactNode;
  initialError?: string;
  refreshError?: string;
  stale?: boolean;
  onRetry?: () => void;
  selectedKey?: Key;
  selectionLabel?: (record: RecordType) => string;
  extra?: ReactNode;
  resultExtra?: ReactNode;
  resultTotal?: number;
  totalSuffix?: string;
  cardClassName?: string;
};

function rowKeyValue<RecordType extends object>(props: ResultListCardProps<RecordType>, record: RecordType, index: number): Key {
  if (typeof props.rowKey === 'function') return props.rowKey(record);
  if (typeof props.rowKey === 'string') return (record as any)[props.rowKey] as Key;
  return (record as any).key ?? (record as any).id ?? index;
}

export function ResultListCard<RecordType extends object>(props: ResultListCardProps<RecordType>) {
  const {
    description,
    notice,
    initialError,
    refreshError,
    stale,
    onRetry,
    selectedKey,
    selectionLabel,
    extra,
    resultExtra,
    resultTotal,
    totalSuffix = '条',
    cardClassName = '',
    dataSource = [],
    columns = [],
    pagination,
    scroll,
    rowSelection,
    onRow,
    ...tableProps
  } = props;
  const rows = Array.from(dataSource as readonly RecordType[]);
  const selectedRowKeys = rowSelection?.selectedRowKeys || [];
  const selectedCount = selectedRowKeys.length;
  const firstColumnIndex = columns.findIndex(column => String((column as any).key || '') !== 'actions');
  const accessibleColumns = columns.map((column, columnIndex) => {
    if (columnIndex !== firstColumnIndex || !onRow) return column;
    const originalRender = (column as any).render;
    return {
      ...column,
      render: (value: unknown, record: RecordType, index: number) => {
        const content = originalRender ? originalRender(value, record, index) : value as ReactNode;
        const key = rowKeyValue(props, record, index);
        const selected = selectedKey !== undefined
          ? String(selectedKey) === String(key)
          : selectedRowKeys.some(item => String(item) === String(key));
        const label = selectionLabel?.(record) || String((record as any).name || (record as any).branchName || (record as any).sourceName || content || '当前记录');
        return (
          <Button
            type="link"
            className="result-list-card__selection"
            aria-label={wizardSelectionLabel(label, selected)}
            onClick={event => {
              event.stopPropagation();
              onRow(record, index)?.onClick?.(event as any);
            }}
          >
            {content}
          </Button>
        );
      }
    };
  });
  const resolvedPagination = pagination === false
    ? rows.length > WIZARD_RESULT_PAGE_SIZE
      ? { pageSize: WIZARD_RESULT_PAGE_SIZE, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }
      : false
    : pagination;
  const summaryExtra = resultExtra || stale || wizardBatchToolbarVisible(selectedCount)
    ? (
      <Space size={8} wrap>
        {resultExtra}
        {stale ? <Tag color="warning">数据可能已过期</Tag> : null}
        {wizardBatchToolbarVisible(selectedCount) ? <Tag color="processing">已选择 {selectedCount} 项</Tag> : null}
      </Space>
    )
    : undefined;

  return (
    <QueryResultCard
      className={`result-list-card wizard-query-result-card ${cardClassName}`.trim()}
      total={resultTotal ?? rows.length}
      totalSuffix={totalSuffix}
      extra={extra}
      resultExtra={summaryExtra}
    >
      {notice ? <div className="result-list-card__notice">{notice}</div> : null}
      {description ? <Typography.Paragraph className="result-list-card__description" type="secondary">{description}</Typography.Paragraph> : null}
      {initialError && !rows.length ? (
        <PageFeedback tone="error" title={initialError} action={onRetry ? <Button onClick={onRetry}>重试</Button> : undefined} />
      ) : null}
      {refreshError && rows.length ? (
        <PageFeedback className="result-list-card__refresh-error" tone="warning" title={refreshError} action={onRetry ? <Button onClick={onRetry}>重试</Button> : undefined} />
      ) : null}
      <Table<RecordType>
        {...tableProps}
        rowKey={props.rowKey}
        dataSource={rows}
        columns={accessibleColumns}
        rowSelection={rowSelection}
        onRow={onRow}
        pagination={resolvedPagination}
        scroll={{ x: 760, ...scroll }}
      />
    </QueryResultCard>
  );
}
