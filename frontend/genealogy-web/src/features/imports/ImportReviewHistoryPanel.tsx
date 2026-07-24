import { useEffect, useState } from 'react';
import { Button, Card, Space, Table, Tag, Typography } from 'antd';
import type { PageResponse } from '../../shared/api/client';
import { apiClient } from '../../shared/api/client';
import type { ReviewTaskListItemResponse } from '../../shared/api/generated/tracking-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';

import { feedback } from '../../shared/ui/OperationFeedback';

import { EmptyState } from '../../shared/ui/EmptyState';

type Props = {  refreshKey: number };

function statusText(value?: string) {
  const status = String(value || '').toLowerCase();
  const labels: Record<string, string> = {
    pending: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    cancelled: '已取消'
  };
  return labels[status] || value || '-';
}

function statusColor(value?: string) {
  const status = String(value || '').toLowerCase();
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'pending') return 'processing';
  return 'default';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

export function ImportReviewHistoryPanel({ refreshKey }: Props) {
  const workspace = useWorkspace();
  const [records, setRecords] = useState<ReviewTaskListItemResponse[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!workspace.clanId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view: 'submitted',
        scope: 'mine',
        targetType: 'import_job',
        pageNo: '1',
        pageSize: '10'
      });
      const page = await apiClient.get<PageResponse<ReviewTaskListItemResponse>>(
        `/clans/${workspace.clanId}/review-tasks/search?${params.toString()}`
      );
      setRecords(page.records || []);
    } catch (error) {
      setRecords([]);
      feedback.from({ message: (error as Error).message || '导入审核记录加载失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  function openReview(taskId: number) {
    workspace.setReviewTaskId(String(taskId));
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'reviewCenter');
    url.searchParams.set('reviewTab', 'submitted');
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  useEffect(() => { void load(); }, [workspace.clanId, refreshKey]);

  return (
    <Card
      title="导入审核记录"
      style={{ marginTop: 16 }}
      extra={<Button loading={loading} onClick={() => void load()}>刷新</Button>}
    >
      <Typography.Paragraph type="secondary">
        展示当前用户提交的最近 10 条导入审核轮次。进入审核中心后可查看同一批次的全部历史意见和处理时间。
      </Typography.Paragraph>
      <Table<ReviewTaskListItemResponse>
        size="small"
        bordered
        loading={loading}
        rowKey="id"
        dataSource={records}
        pagination={false}
        locale={{ emptyText: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无导入审核记录" /> }}
        columns={[
          { key: 'file', title: '导入文件', width: 220, ellipsis: true, render: (_value, row) => row.targetSummary?.fileName || row.title },
          { key: 'branch', title: '目标支派', width: 140, render: (_value, row) => row.targetSummary?.branchName || row.branchName || '全宗族' },
          { key: 'round', title: '审核轮次', width: 100, render: (_value, row) => row.targetSummary?.reviewRound ? `第 ${row.targetSummary.reviewRound} 轮` : '-' },
          { key: 'counts', title: '批次摘要', width: 160, render: (_value, row) => <Space size={4}><span>草稿 {row.targetSummary?.draftCount ?? '-'}</span><span>·</span><span>排除 {row.targetSummary?.excludedCount ?? '-'}</span></Space> },
          { key: 'status', title: '状态', width: 100, render: (_value, row) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> },
          { key: 'submitTime', title: '提交时间', width: 170, render: (_value, row) => formatDateTime(row.submitTime) },
          { key: 'action', title: '操作', width: 100, fixed: 'right', render: (_value, row) => <Button size="small" onClick={() => openReview(row.id)}>审核详情</Button> }
        ]}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
}
