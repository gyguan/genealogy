import { useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Button, Descriptions, Drawer, Empty, Space, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';

type Props = { notify: (data: unknown, error?: boolean) => void };

type ReviewTask = {
  id?: number | string;
  title?: string;
  targetType?: string;
  targetId?: number | string;
  status?: string;
  reviewStatus?: string;
  taskStatus?: string;
  createdAt?: string;
  submitTime?: string;
  updatedAt?: string;
  submitterId?: number | string;
  submitterName?: string;
  reviewerName?: string;
  diffSummary?: string;
  comment?: string;
  reviewComment?: string;
  rejectReason?: string;
};

type ReviewTabKey = 'pending' | 'submitted' | 'processed';

function taskTitle(row: ReviewTask) {
  return row.title || `${targetTypeText(row.targetType)}变更审核`;
}

function rowKey(row: ReviewTask) {
  return String(row.id || `${row.targetType || 'task'}-${row.targetId || ''}`);
}

function targetTypeText(value?: string) {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  const dict: Record<string, string> = {
    person: '人物',
    persons: '人物',
    relationship: '关系',
    relationships: '关系',
    source: '来源',
    sources: '来源',
    source_binding: '来源绑定',
    branch: '支派',
    branches: '支派',
    generation_scheme: '字辈方案',
    generation_schemes: '字辈方案',
    generation_scheme_item: '字辈明细',
    generation_schemes_item: '字辈明细',
    import_job: '人物导入批次',
    clan: '宗族'
  };
  return dict[normalized] || (value ? '其他对象' : '未知对象');
}

function statusValue(row: ReviewTask) {
  return String(row.reviewStatus || row.taskStatus || row.status || '').trim().toLowerCase();
}

function statusText(row: ReviewTask) {
  const status = statusValue(row);
  const dict: Record<string, string> = {
    pending: '待审核',
    pending_review: '待审核',
    reviewing: '审核中',
    approved: '已通过',
    passed: '已通过',
    rejected: '已驳回',
    cancelled: '已取消',
    canceled: '已取消',
    completed: '已完成'
  };
  return dict[status] || (status ? '未知状态' : '待维护');
}

function statusColor(row: ReviewTask) {
  const status = statusValue(row);
  if (['approved', 'passed', 'completed'].includes(status)) return 'success';
  if (['rejected', 'cancelled', 'canceled'].includes(status)) return 'error';
  if (['pending', 'pending_review', 'reviewing'].includes(status)) return 'processing';
  return 'default';
}

function submitterText(row: ReviewTask) {
  return row.submitterName || '提交人待维护';
}

function reviewerText(row: ReviewTask) {
  return row.reviewerName || '审核人待维护';
}

function reviewComment(row: ReviewTask) {
  return row.reviewComment || row.rejectReason || row.comment || '暂无审核意见';
}

function submittedAt(row: ReviewTask) {
  return row.submitTime || row.createdAt || '提交时间待维护';
}

function isProcessed(row: ReviewTask) {
  return ['approved', 'passed', 'rejected', 'cancelled', 'canceled', 'completed'].includes(statusValue(row));
}

function reviewTimelineItems(row: ReviewTask) {
  const processed = isProcessed(row);
  return [
    {
      color: 'blue',
      children: (
        <div>
          <Typography.Text strong>提交审核</Typography.Text>
          <br />
          <Typography.Text type="secondary">{submittedAt(row)} · {submitterText(row)}</Typography.Text>
        </div>
      )
    },
    {
      color: processed ? 'green' : 'gray',
      children: (
        <div>
          <Typography.Text strong>{processed ? statusText(row) : '等待审核处理'}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{processed ? `${row.updatedAt || '处理时间待维护'} · ${reviewerText(row)}` : '审核结论由后端返回后展示'}</Typography.Text>
        </div>
      )
    }
  ];
}

export function ReviewCenterPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingKeys, setProcessingKeys] = useState<Key[]>([]);
  const [activeTab, setActiveTab] = useState<ReviewTabKey>('pending');
  const [detailTask, setDetailTask] = useState<ReviewTask | null>(null);

  const selectedTasks = useMemo(
    () => tasks.filter(task => selectedRowKeys.includes(rowKey(task))),
    [tasks, selectedRowKeys]
  );

  async function loadTasks() {
    if (!workspace.clanId) {
      setTasks([]);
      setSelectedRowKeys([]);
      setDetailTask(null);
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.get(`/clans/${workspace.clanId}/review-tasks/pending`);
      const nextTasks = toRecordList<ReviewTask>(data);
      setTasks(nextTasks);
      setDetailTask(null);
      const focusTask = workspace.reviewTaskId
        ? nextTasks.find(task => String(task.id || '') === workspace.reviewTaskId || rowKey(task) === workspace.reviewTaskId)
        : null;
      if (focusTask) {
        setActiveTab('pending');
        setSelectedRowKeys([rowKey(focusTask)]);
      } else {
        setSelectedRowKeys([]);
      }
    } catch (error) {
      notify({ message: (error as Error).message || '查询审核任务失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadTasks(); }, [workspace.clanId, workspace.reviewTaskId]);

  async function approveOne(row: ReviewTask) {
    if (!row?.id) return;
    const key = rowKey(row);
    setProcessingKeys(prev => [...prev, key]);
    try {
      await apiClient.post(`/review-tasks/${row.id}/approve`, { comment: '同意入谱' });
      notify({ message: '审核已通过' });
      await loadTasks();
      setDetailTask(null);
    } catch (error) {
      notify({ message: (error as Error).message || '审核通过失败' }, true);
    } finally {
      setProcessingKeys(prev => prev.filter(item => item !== key));
    }
  }

  async function rejectOne(row: ReviewTask) {
    if (!row?.id) return;
    const key = rowKey(row);
    setProcessingKeys(prev => [...prev, key]);
    try {
      await apiClient.post(`/review-tasks/${row.id}/reject`, { comment: '请补充资料后重新提交' });
      notify({ message: '审核已驳回' });
      await loadTasks();
      setDetailTask(null);
    } catch (error) {
      notify({ message: (error as Error).message || '审核驳回失败' }, true);
    } finally {
      setProcessingKeys(prev => prev.filter(item => item !== key));
    }
  }

  async function batchApprove() {
    if (!selectedTasks.length) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(selectedTasks.map(task => task.id
        ? apiClient.post(`/review-tasks/${task.id}/approve`, { comment: '同意入谱' })
        : Promise.reject(new Error('审核任务为空'))
      ));
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount) notify({ message: `已通过 ${successCount} 条审核任务` });
      if (failedCount) notify({ message: `${failedCount} 条审核任务处理失败` }, true);
      await loadTasks();
    } finally {
      setLoading(false);
    }
  }

  async function batchReject() {
    if (!selectedTasks.length) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(selectedTasks.map(task => task.id
        ? apiClient.post(`/review-tasks/${task.id}/reject`, { comment: '请补充资料后重新提交' })
        : Promise.reject(new Error('审核任务为空'))
      ));
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount) notify({ message: `已驳回 ${successCount} 条审核任务` });
      if (failedCount) notify({ message: `${failedCount} 条审核任务处理失败` }, true);
      await loadTasks();
    } finally {
      setLoading(false);
    }
  }

  function renderPendingTable() {
    return (
      <>
        <div className="batch-review-actions table-review-actions">
          <Typography.Text type="secondary">
            {workspace.clanId ? `待审核任务 ${tasks.length} 条` : '请先选择宗族后查看审核任务'}
          </Typography.Text>
          <Space wrap>
            <Button type="primary" disabled={!selectedTasks.length || loading} loading={loading && Boolean(selectedTasks.length)} onClick={() => void batchApprove()}>
              批量通过（{selectedTasks.length}）
            </Button>
            <Button danger disabled={!selectedTasks.length || loading} loading={loading && Boolean(selectedTasks.length)} onClick={() => void batchReject()}>
              批量驳回（{selectedTasks.length}）
            </Button>
          </Space>
        </div>
        <Table<ReviewTask>
          size="small"
          bordered
          loading={loading && !processingKeys.length}
          rowKey={rowKey}
          dataSource={tasks}
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            columnTitle: '勾选',
            columnWidth: 88,
            preserveSelectedRowKeys: false,
            onChange: keys => setSelectedRowKeys(keys)
          }}
          onRow={row => ({ onClick: () => setDetailTask(row), style: { cursor: 'pointer' } })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '当前没有待审核任务' : '请先选择宗族'} /> }}
          columns={[
            { key: 'title', title: '审核事项', ellipsis: true, render: (_value, row) => taskTitle(row) },
            { key: 'targetType', title: '审核对象', width: 150, render: (_value, row) => targetTypeText(row.targetType) },
            { key: 'diffSummary', title: '变更摘要', dataIndex: 'diffSummary', ellipsis: true },
            { key: 'status', title: '审核状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
            { key: 'createdAt', title: '提交时间', width: 180, render: (_value, row) => submittedAt(row) },
            {
              key: 'actions',
              title: '审核操作',
              width: 170,
              fixed: 'right',
              render: (_value, row) => {
                const key = rowKey(row);
                const processing = processingKeys.includes(key);
                return (
                  <Space size="small" wrap onClick={event => event.stopPropagation()}>
                    <Button size="small" type="primary" loading={processing} disabled={loading} onClick={() => void approveOne(row)}>通过</Button>
                    <Button size="small" danger loading={processing} disabled={loading} onClick={() => void rejectOne(row)}>驳回</Button>
                  </Space>
                );
              }
            }
          ]}
          scroll={{ x: 'max-content' }}
        />
      </>
    );
  }

  return (
    <div className="review-center-page">
      <Panel title="审核中心" description="集中处理待审核任务，支持查看审核对象、流转状态和批量审批。">
        <Tabs
          activeKey={activeTab}
          onChange={key => setActiveTab(key as ReviewTabKey)}
          items={[
            { key: 'pending', label: `待我审核（${tasks.length}）`, children: renderPendingTable() },
            { key: 'submitted', label: '我提交的', children: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="后端暂未返回我提交的审核任务" /> },
            { key: 'processed', label: '已处理', children: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="后端暂未返回已处理审核任务" /> }
          ]}
        />
      </Panel>

      <Drawer
        title="审核详情"
        width={560}
        open={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
        extra={detailTask ? (
          <Space>
            <Button onClick={() => setDetailTask(null)}>关闭</Button>
            <Button danger loading={processingKeys.includes(rowKey(detailTask))} onClick={() => void rejectOne(detailTask)}>驳回</Button>
            <Button type="primary" loading={processingKeys.includes(rowKey(detailTask))} onClick={() => void approveOne(detailTask)}>通过</Button>
          </Space>
        ) : null}
      >
        {detailTask ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="审核事项">{taskTitle(detailTask)}</Descriptions.Item>
              <Descriptions.Item label="审核对象">{targetTypeText(detailTask.targetType)}</Descriptions.Item>
              <Descriptions.Item label="变更摘要">{detailTask.diffSummary || '暂无摘要'}</Descriptions.Item>
              <Descriptions.Item label="审核状态"><Tag color={statusColor(detailTask)}>{statusText(detailTask)}</Tag></Descriptions.Item>
              <Descriptions.Item label="提交时间">{submittedAt(detailTask)}</Descriptions.Item>
              <Descriptions.Item label="审核意见">{reviewComment(detailTask)}</Descriptions.Item>
            </Descriptions>
            <div>
              <Typography.Title level={5}>流转记录</Typography.Title>
              <Timeline items={reviewTimelineItems(detailTask)} />
            </div>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
