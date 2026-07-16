import type { Key, ReactNode } from 'react';
import { Alert, Button, Card, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import { WIZARD_RESULT_PAGE_SIZE, wizardBatchToolbarVisible, wizardSelectionLabel } from '../../features/mvp1/domain/wizardResultListModel';
import './result-list-card.css';

type ResultListCardProps<RecordType extends object> = TableProps<RecordType> & {
  resultTitle?: ReactNode;
  description?: ReactNode;
  initialError?: string;
  refreshError?: string;
  stale?: boolean;
  onRetry?: () => void;
  selectedKey?: Key;
  selectionLabel?: (record: RecordType) => string;
};

function titleText<RecordType extends object>(props: ResultListCardProps<RecordType>) {
  if (props.resultTitle) return props.resultTitle;
  const first = (props.columns || []).find(column => String((column as any).key || '') !== 'actions');
  const title = (first as any)?.title;
  return typeof title === 'string' ? title : '查询结果';
}

function rowKeyValue<RecordType extends object>(props: ResultListCardProps<RecordType>, record: RecordType, index: number): Key {
  if (typeof props.rowKey === 'function') return props.rowKey(record);
  if (typeof props.rowKey === 'string') return (record as any)[props.rowKey] as Key;
  return (record as any).key ?? (record as any).id ?? index;
}

export function ResultListCard<RecordType extends object>(props: ResultListCardProps<RecordType>) {
  const {
    resultTitle,
    description,
    initialError,
    refreshError,
    stale,
    onRetry,
    selectedKey,
    selectionLabel,
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
  const cardTitle = <span>{titleText(props)}（{rows.length}）</span>;

  return (
    <Card
      size="small"
      className="result-list-card"
      title={cardTitle}
      extra={(
        <Space size={8} wrap>
          {stale ? <Tag color="warning">数据可能已过期</Tag> : null}
          {wizardBatchToolbarVisible(selectedCount) ? <Tag color="processing">已选择 {selectedCount} 项</Tag> : null}
        </Space>
      )}
    >
      {description ? <Typography.Paragraph type="secondary">{description}</Typography.Paragraph> : null}
      {initialError && !rows.length ? (
        <Alert type="error" showIcon message={initialError} action={onRetry ? <Button onClick={onRetry}>重试</Button> : undefined} />
      ) : null}
      {refreshError && rows.length ? (
        <Alert className="result-list-card__refresh-error" type="warning" showIcon message={refreshError} action={onRetry ? <Button onClick={onRetry}>重试</Button> : undefined} />
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
    </Card>
  );
}
