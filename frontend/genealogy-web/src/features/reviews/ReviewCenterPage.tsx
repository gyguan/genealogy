import { useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Button, Empty, Space, Table, Tag, Typography } from 'antd';
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
  submitterId?: number | string;
};

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
    branch: '支派',
    branches: '支派',
    generation_scheme: '字辈方案',
    generation_schemes: '字辈方案',
    generation_scheme_item: '字辈明细',
    generation_schemes_item: '字辈明细',
    clan: '宗族'
  };
  return dict[normalized] || (value ? String(value) : '-');
}

function statusValue(row: ReviewTask) {
  return String(row.reviewStatus || row.taskStatus || row.status || '').trim().toLowerCase();
}

function statusText(row: ReviewTask) {
  const status = statusValue(row);
  const dict: Record<string, string> = {
    pending: '待审核',
    pending_review: '待审核',
    approved: '已通过',
    passed: '已通过',
    rejected: '已驳回',
    cancelled: '已取消',
    canceled: '已取消',
    completed: '已完成'
  };
  return dict[status] || status || '-';
}

function statusColor(row: ReviewTask) {
  const status = statusValue(row);
  if (['approved', 'passed', 'completed'].includes(status)) return 'success';
  if (['rejected', 'cancelled', 'canceled'].includes(status)) return 'error';
  return 'processing';
}

export function ReviewCenterPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingKeys, setProcessingKeys] = useState<Key[]>([]);

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
      const data = await apiClient.get(`/clans/${workspace.clanId}/review-tasks/pending`);
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
      await apiClient.post(`/review-tasks/${row.id}/approve`, { comment: '同意入谱' });
      notify({ message: '审核已通过' });
      await loadTasks();
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
        : Promise.reject(new Error('审核任务ID为空'))
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
        : Promise.reject(new Error('审核任务ID为空'))
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

  return (
    <div className="review-center-page">
      <Panel title="审核中心" description="集中处理待审核任务，支持单选、多选、全选后批量审批。">
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
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '当前没有待审核任务' : '请先选择宗族'} /> }}
          columns={[
            { key: 'title', title: '标题', ellipsis: true, render: (_value, row) => taskTitle(row) },
            { key: 'targetType', title: '对象类型', width: 130, render: (_value, row) => targetTypeText(row.targetType) },
            { key: 'targetId', title: '对象ID', width: 110, render: (_value, row) => row.targetId || '-' },
            { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
            { key: 'createdAt', title: '创建时间', width: 180, render: (_value, row) => row.createdAt || '-' },
            {
              key: 'actions',
              title: '审核',
              width: 160,
              fixed: 'right',
              render: (_value, row) => {
                const key = rowKey(row);
                const processing = processingKeys.includes(key);
                return (
                  <Space size="small" wrap>
                    <Button size="small" type="primary" loading={processing} disabled={loading} onClick={() => void approveOne(row)}>通过</Button>
                    <Button size="small" danger loading={processing} disabled={loading} onClick={() => void rejectOne(row)}>驳回</Button>
                  </Space>
                );
              }
            }
          ]}
          scroll={{ x: 'max-content' }}
        />
      </Panel>
    </div>
  );
}
