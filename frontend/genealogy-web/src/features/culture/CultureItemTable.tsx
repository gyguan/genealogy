import { Button, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import type { CultureItemSummaryResponse } from '../../shared/api/generated/culture-types';
import {
  categoryOptions,
  formatDateTime,
  optionLabel,
  privacyColor,
  privacyOptions,
  statusColor,
  statusOptions
} from './cultureOptions';

const { Text } = Typography;

type Props = {
  items: CultureItemSummaryResponse[];
  total: number;
  pageNo: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (pageNo: number, pageSize: number) => void;
  onOpen: (item: CultureItemSummaryResponse) => void;
  onEdit: (item: CultureItemSummaryResponse) => void;
  onSubmitReview: (item: CultureItemSummaryResponse) => void;
  onArchive: (item: CultureItemSummaryResponse) => void;
  onDelete: (item: CultureItemSummaryResponse) => void;
};

function can(item: CultureItemSummaryResponse, ...actions: string[]) {
  return actions.some(action => item.allowedActions.includes(action));
}

export function CultureItemTable(props: Props) {
  const columns: TableProps<CultureItemSummaryResponse>['columns'] = [
    {
      title: '文化资料', dataIndex: 'title', key: 'title', width: 280,
      render: (_, item) => (
        <Space direction="vertical" size={2}>
          <Button type="link" className="culture-title-button" onClick={event => { event.stopPropagation(); props.onOpen(item); }}>
            {item.title}
          </Button>
          <Text type="secondary" ellipsis>{item.summary || '暂无摘要'}</Text>
        </Space>
      )
    },
    {
      title: '分类', dataIndex: 'category', key: 'category', width: 110,
      render: value => <Tag>{optionLabel(categoryOptions, value)}</Tag>
    },
    {
      title: '所属范围', key: 'scope', width: 150,
      render: (_, item) => item.scope.branchName || item.scope.clanName
    },
    {
      title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 110,
      render: value => <Tag color={statusColor(value)}>{optionLabel(statusOptions, value)}</Tag>
    },
    {
      title: '可见范围', dataIndex: 'privacyLevel', key: 'privacyLevel', width: 130,
      render: value => <Tag color={privacyColor(value)}>{optionLabel(privacyOptions, value)}</Tag>
    },
    {
      title: '证据', key: 'evidence', width: 120,
      render: (_, item) => <Text type="secondary">来源 {item.sourceCount} · 附件 {item.attachmentCount}</Text>
    },
    {
      title: '最近更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 170,
      render: value => formatDateTime(value)
    },
    {
      title: '操作', key: 'actions', fixed: 'right', width: 250,
      render: (_, item) => (
        <Space size={2} wrap onClick={event => event.stopPropagation()}>
          <Button type="link" onClick={() => props.onOpen(item)}>查看</Button>
          {can(item, 'update', 'request_update') ? <Button type="link" onClick={() => props.onEdit(item)}>编辑</Button> : null}
          {can(item, 'submit_review') ? <Button type="link" onClick={() => props.onSubmitReview(item)}>提交审核</Button> : null}
          {can(item, 'archive', 'request_archive') ? <Button type="link" onClick={() => props.onArchive(item)}>归档</Button> : null}
          {can(item, 'delete', 'request_delete') ? <Button danger type="link" onClick={() => props.onDelete(item)}>删除</Button> : null}
        </Space>
      )
    }
  ];

  return (
    <Table<CultureItemSummaryResponse>
      rowKey="id"
      size="middle"
      loading={props.loading}
      columns={columns}
      dataSource={props.items}
      scroll={{ x: 1260 }}
      onRow={item => ({ onClick: () => props.onOpen(item) })}
      pagination={{
        current: props.pageNo,
        pageSize: props.pageSize,
        total: props.total,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50],
        showTotal: total => `共 ${total} 条`,
        onChange: props.onPageChange
      }}
      locale={{ emptyText: '没有符合当前条件的文化资料' }}
    />
  );
}
