import { useEffect, useMemo, useState } from 'react';
import type { Key, ReactNode } from 'react';
import { Button, Descriptions, Drawer, Empty, Modal, Popconfirm, Space, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import { reviewTargetTypeText, statusColor, statusText } from '../../shared/dictionaries';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { reviewCenterService } from '../../shared/services/reviewCenterService';
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
  updatedAt?: string;
  submitterId?: number | string;
  submitterName?: string;
  reviewerName?: string;
  comment?: string;
  reviewComment?: string;
  rejectReason?: string;
};

type ReviewTabKey = 'pending' | 'submitted' | 'processed';

function statusValue(row: ReviewTask) {
  return String(row.reviewStatus || row.taskStatus || row.status || '').trim().toLowerCase();
}

function reviewStatusText(row: ReviewTask) {
  return statusText(statusValue(row), statusValue(row) ? '未知状态' : '待维护');
}

function reviewStatusColor(row: ReviewTask) {
  return statusColor(statusValue(row));
}

function targetTypeText(value?: string) {
  return reviewTargetTypeText(String(value || '').trim().toLowerCase().replace(/-/g, '_'), value ? '其他对象' : '未知对象');
}

function taskTitle(row: ReviewTask) {
  return row.title || `${targetTypeText(row.targetType)}变更审核`;
}

function rowKey(row: ReviewTask) {
  return String(row.id || `${row.targetType || 'task'}-${row.targetId || ''}`);
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
          <Typography.Text type="secondary">{row.createdAt || '提交时间待维护'} · {submitterText(row)}</Typography.Text>
        </div>
      )
    },
    {
      color: processed ? 'green' : 'gray',
      children: (
        <div>
          <Typography.Text strong>{processed ? reviewStatusText(row) : '等待审核处理'}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{processed ? `${row.updatedAt || '处理时间待维护'} · ${reviewerText(row)}` : '审核结论由后端返回后展示'}</Typography.Text>
        </div>
      )
    }
  ];
}

export function ReviewCenterPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [modal, contextHolder] = Modal.useModal();
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
      return;
    }
    setLoading(true);
    try {
      const data = await reviewCenterService.listPendingTasks(workspace.clanId);
      setTasks(toRecordList<ReviewTask>(data));
      setSelectedRowKeys([]);
    } catch (error) {
      notify({ message: (error as Error).message || '查询审核任务失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadTasks(); }, [workspace.clanId]);

  async function approveOne(row: ReviewTask) {
    if (!row?.id) return;
    const key = rowKey(row);
    setProcessingKeys(prev => [...prev, key]);
    try {
      await reviewCenterService.approveTask(row.id);
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
      await reviewCenterService.rejectTask(row.id);
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
        ? reviewCenterService.approveTask(task.id)
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
        ? reviewCenterService.rejectTask(task.id)
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

  function confirmBatchReject() {
    modal.confirm({
      title: `确认批量驳回 ${selectedTasks.length} 条审核任务？`,
      content: '批量驳回后，相关对象需要补充资料后重新提交审核。',
      okText: '确认驳回',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => batchReject()
    });
  }

  function renderRejectConfirm(row: ReviewTask, button: ReactNode) {
    return (
      <Popconfirm title="确认驳回该审核任务？" description="驳回后，该对象需要补充资料后重新提交审核。" okText="确认驳回" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => void rejectOne(row)}>
        {button}
      </Popconfirm>
    );
  }

  function renderPendingTable() {
    return (
      <>
        <div className="batch-review-actions table-review-actions">
          <Typography.Text type="secondary">{workspace.clanId ? `待审核任务 ${tasks.length} 条` : '请先选择宗族后查看审核任务'}</Typography.Text>
          <Space wrap><Button type="primary" disabled={!selectedTasks.length || loading} loading={loading && Boolean(selectedTasks.length)} onClick={() => void batchApprove()}>批量通过（{selectedTasks.length}）</Button><Button danger disabled={!selectedTasks.length || loading} loading={loading && Boolean(selectedTasks.length)} onClick={confirmBatchReject}>批量驳回（{selectedTasks.length}）</Button></Space>
        </div>
        <Table<ReviewTask>
          size="small"
          bordered
          loading={loading && !processingKeys.length}
          rowKey={rowKey}
          dataSource={tasks}
          pagination={false}
          rowSelection={{ selectedRowKeys, columnTitle: '勾选', columnWidth: 88, preserveSelectedRowKeys: false, onChange: keys => setSelectedRowKeys(keys) }}
          onRow={row => ({ onClick: () => setDetailTask(row), style: { cursor: 'pointer' } })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '当前没有待审核任务' : '请先选择宗族'} /> }}
          columns={[
            { key: 'title', title: '审核事项', ellipsis: true, render: (_value, row) => taskTitle(row) },
            { key: 'targetType', title: '审核对象', width: 130, render: (_value, row) => targetTypeText(row.targetType) },
            { key: 'status', title: '审核状态', width: 110, render: (_value, row) => <Tag color={reviewStatusColor(row)}>{reviewStatusText(row)}</Tag> },
            { key: 'createdAt', title: '提交时间', width: 180, render: (_value, row) => row.createdAt || '待维护' },
            { key: 'actions', title: '审核操作', width: 170, fixed: 'right', render: (_value, row) => { const key = rowKey(row); const processing = processingKeys.includes(key); return <Space size="small" wrap onClick={event => event.stopPropagation()}><Button size="small" type="primary" loading={processing} disabled={loading} onClick={() => void approveOne(row)}>通过</Button>{renderRejectConfirm(row, <Button size="small" danger loading={processing} disabled={loading}>驳回</Button>)}</Space>; } }
          ]}
          scroll={{ x: 'max-content' }}
        />
      </>
    );
  }

  return (
    <div className="review-center-page">
      {contextHolder}
      <Panel title="审核中心" description="集中处理待审核任务，支持查看审核对象、流转状态和批量审批。">
        <Tabs activeKey={activeTab} onChange={key => setActiveTab(key as ReviewTabKey)} items={[{ key: 'pending', label: `待我审核（${tasks.length}）`, children: renderPendingTable() }, { key: 'submitted', label: '我提交的', children: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="后端暂未返回我提交的审核任务" /> }, { key: 'processed', label: '已处理', children: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="后端暂未返回已处理审核任务" /> }]} />
      </Panel>
      <Drawer title="审核详情" width={520} open={Boolean(detailTask)} onClose={() => setDetailTask(null)} extra={detailTask ? <Space><Button onClick={() => setDetailTask(null)}>关闭</Button>{renderRejectConfirm(detailTask, <Button danger loading={processingKeys.includes(rowKey(detailTask))}>驳回</Button>)}<Button type="primary" loading={processingKeys.includes(rowKey(detailTask))} onClick={() => void approveOne(detailTask)}>通过</Button></Space> : null}>
        {detailTask ? <Space direction="vertical" size="large" style={{ width: '100%' }}><Descriptions column={1} size="small" bordered><Descriptions.Item label="审核事项">{taskTitle(detailTask)}</Descriptions.Item><Descriptions.Item label="审核对象">{targetTypeText(detailTask.targetType)}</Descriptions.Item><Descriptions.Item label="审核状态"><Tag color={reviewStatusColor(detailTask)}>{reviewStatusText(detailTask)}</Tag></Descriptions.Item><Descriptions.Item label="提交时间">{detailTask.createdAt || '待维护'}</Descriptions.Item><Descriptions.Item label="审核意见">{reviewComment(detailTask)}</Descriptions.Item></Descriptions><div><Typography.Title level={5}>流转记录</Typography.Title><Timeline items={reviewTimelineItems(detailTask)} /></div></Space> : null}
      </Drawer>
    </div>
  );
}
