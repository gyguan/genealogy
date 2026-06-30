import type { ReactNode } from 'react';
import { Empty, Table, Typography } from 'antd';

export type Column<T> = {
  key: string;
  title: string;
  render?: (row: T) => ReactNode;
};

export function toRecordList<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (data && typeof data === 'object') return [data];
  return [];
}

export function DataTable<T extends Record<string, any>>({ data, columns, empty = '暂无数据，请先查询或新建记录', onSelect }: { data: any; columns: Column<T>[]; empty?: string; onSelect?: (row: T) => void }) {
  const rows = toRecordList<T>(data);
  if (!rows.length) return <Empty className="empty antd-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />;

  return (
    <div className="table-wrap antd-table-wrap">
      {onSelect ? <Typography.Text className="table-hint" type="secondary">点击列表行可查看详情或执行后续操作</Typography.Text> : null}
      <Table<T>
        size="small"
        bordered={false}
        rowKey={(row, index) => String(row.id || row.personId || index)}
        dataSource={rows}
        pagination={false}
        tableLayout="fixed"
        scroll={{ x: 'max-content' }}
        columns={columns.map(column => ({
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
