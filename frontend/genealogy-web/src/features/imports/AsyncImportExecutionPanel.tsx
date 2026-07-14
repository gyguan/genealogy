import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Progress, Space, Table, Tag, Typography } from 'antd';
import type { PageResponse } from '../../shared/api/client';
import { apiClient } from '../../shared/api/client';
import type { ImportExecutionAction, ImportExecutionStage, ImportExecutionStatus } from '../../shared/api/generated/import-execution-types';
import { importTypeText } from './import-type-registry';

type Props = {
  clanId: string;
  branchId: string;
  refreshKey: number;
  notify: (data: unknown, error?: boolean) => void;
  onChanged: () => void;
};

type AsyncImportJob = {
  id: number;
  importType?: string;
  legacyImportType?: string;
  originalFilename?: string;
  totalCount?: number;
  successCount?: number;
  errorSummary?: string;
  executionMode?: string;
  executionStatus?: ImportExecutionStatus;
  executionStage?: ImportExecutionStage;
  processedCount?: number;
  publishedCount?: number;
  chunkSize?: number;
  executionRetryCount?: number;
  executionMaxRetries?: number;
  manualInterventionRequired?: boolean;
  nextRetryAt?: string;
  heartbeatAt?: string;
};

const statusText: Record<ImportExecutionStatus, string> = {
  queued: '排队中',
  running: '执行中',
  paused: '已暂停',
  retry_wait: '等待自动重试',
  completed: '已完成',
  failed: '执行失败',
  cancelled: '已取消',
  dead_letter: '待人工处理'
};

const stageText: Record<ImportExecutionStage, string> = {
  queued: '等待执行',
  parsing: '解析文件',
  drafting: '生成草稿',
  ready_for_review: '等待提交审核',
  publishing: '正式发布',
  completed: '处理完成',
  failed: '失败处理',
  cancelled: '已取消'
};

function statusColor(status?: ImportExecutionStatus) {
  if (status === 'completed') return 'success';
  if (status === 'failed' || status === 'dead_letter') return 'error';
  if (status === 'paused' || status === 'retry_wait') return 'warning';
  if (status === 'queued' || status === 'running') return 'processing';
  return 'default';
}

function hasSideEffects(job: AsyncImportJob) {
  return Number(job.processedCount || 0) > 0 || Number(job.publishedCount || 0) > 0;
}

function allowedActions(job: AsyncImportJob): ImportExecutionAction[] {
  const cancellable = !hasSideEffects(job);
  const status = job.executionStatus;
  if (status === 'queued' || status === 'running' || status === 'retry_wait') {
    return cancellable ? ['pause', 'cancel'] : ['pause'];
  }
  if (status === 'paused') return cancellable ? ['resume', 'cancel'] : ['resume'];
  if (status === 'failed' || status === 'dead_letter') return cancellable ? ['retry', 'cancel'] : ['retry'];
  return [];
}

function actionText(action: ImportExecutionAction) {
  return { pause: '暂停', resume: '继续', cancel: '取消', retry: '重试' }[action];
}

function actionDanger(action: ImportExecutionAction) {
  return action === 'cancel';
}

function progressOf(job: AsyncImportJob) {
  const publishing = job.executionStage === 'publishing';
  const denominator = publishing ? Number(job.successCount || 0) : Number(job.totalCount || 0);
  const completed = publishing ? Number(job.publishedCount || 0) : Number(job.processedCount || 0);
  if (job.executionStatus === 'completed') return 100;
  return denominator <= 0 ? 0 : Math.min(100, Math.round(completed * 100 / denominator));
}

function remainingOf(job: AsyncImportJob) {
  const publishing = job.executionStage === 'publishing';
  const denominator = publishing ? Number(job.successCount || 0) : Number(job.totalCount || 0);
  const completed = publishing ? Number(job.publishedCount || 0) : Number(job.processedCount || 0);
  return Math.max(0, denominator - completed);
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

export function AsyncImportExecutionPanel({ clanId, branchId, refreshKey, notify, onChanged }: Props) {
  const [jobs, setJobs] = useState<AsyncImportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionJobId, setActionJobId] = useState<number>();
  const [errorMessage, setErrorMessage] = useState('');

  const hasActiveJob = useMemo(
    () => jobs.some(job => ['queued', 'running', 'retry_wait'].includes(String(job.executionStatus || ''))),
    [jobs]
  );

  async function load() {
    if (!clanId) {
      setJobs([]);
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({ pageNo: '1', pageSize: '50' });
      if (branchId) params.set('branchId', branchId);
      const page = await apiClient.get<PageResponse<AsyncImportJob>>(`/clans/${clanId}/imports?${params.toString()}`);
      setJobs((page.records || []).filter(job => job.executionMode === 'async'));
    } catch (error) {
      setErrorMessage((error as Error).message || '后台导入任务加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function execute(job: AsyncImportJob, action: ImportExecutionAction) {
    setActionJobId(job.id);
    try {
      await apiClient.post(`/clans/${clanId}/imports/${job.id}/execution/${action}`, {});
      notify({ message: `任务已${actionText(action)}` });
      await load();
      onChanged();
    } catch (error) {
      notify({ message: (error as Error).message || `${actionText(action)}任务失败` }, true);
    } finally {
      setActionJobId(undefined);
    }
  }

  useEffect(() => { void load(); }, [clanId, branchId, refreshKey]);
  useEffect(() => {
    if (!hasActiveJob) return undefined;
    const timer = window.setInterval(() => { void load(); }, 2500);
    return () => window.clearInterval(timer);
  }, [hasActiveJob, clanId, branchId]);

  return (
    <Card
      title="后台执行任务"
      style={{ marginTop: 16 }}
      extra={<Button loading={loading} onClick={() => void load()}>刷新</Button>}
    >
      <Typography.Paragraph type="secondary">
        大文件会在后台按分片处理。任务尚未产生草稿时可取消；产生草稿或开始发布后只允许暂停、继续或重试，防止留下不可恢复的半成品。
      </Typography.Paragraph>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 12 }} /> : null}
      {jobs.some(job => job.manualInterventionRequired) ? (
        <Alert type="warning" showIcon message="存在超过自动重试上限的任务，请查看失败摘要并人工重试。" style={{ marginBottom: 12 }} />
      ) : null}
      <Table<AsyncImportJob>
        size="small"
        bordered
        loading={loading}
        rowKey="id"
        dataSource={jobs}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有异步导入任务" /> }}
        pagination={false}
        columns={[
          { key: 'type', title: '业务类型', width: 110, render: (_value, row) => importTypeText(row.importType || row.legacyImportType) },
          { key: 'filename', title: '文件', dataIndex: 'originalFilename', ellipsis: true },
          { key: 'stage', title: '当前阶段', width: 120, render: (_value, row) => stageText[row.executionStage || 'queued'] },
          { key: 'status', title: '执行状态', width: 130, render: (_value, row) => <Tag color={statusColor(row.executionStatus)}>{statusText[row.executionStatus || 'queued']}</Tag> },
          {
            key: 'progress',
            title: '进度',
            width: 230,
            render: (_value, row) => (
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Progress percent={progressOf(row)} size="small" status={row.executionStatus === 'failed' || row.executionStatus === 'dead_letter' ? 'exception' : undefined} />
                <Typography.Text type="secondary">剩余 {remainingOf(row)} 条 · 分片 {row.chunkSize || '-'}</Typography.Text>
              </Space>
            )
          },
          {
            key: 'retry',
            title: '恢复信息',
            width: 210,
            render: (_value, row) => (
              <Space direction="vertical" size={0}>
                <Typography.Text>重试 {row.executionRetryCount || 0}/{row.executionMaxRetries || 0}</Typography.Text>
                <Typography.Text type="secondary">心跳：{formatDateTime(row.heartbeatAt)}</Typography.Text>
                {row.nextRetryAt ? <Typography.Text type="warning">下次重试：{formatDateTime(row.nextRetryAt)}</Typography.Text> : null}
                {row.errorSummary ? <Typography.Text type="danger" ellipsis={{ tooltip: row.errorSummary }}>{row.errorSummary}</Typography.Text> : null}
              </Space>
            )
          },
          {
            key: 'actions',
            title: '操作',
            width: 150,
            render: (_value, row) => (
              <Space wrap>
                {allowedActions(row).map(action => (
                  <Button
                    key={action}
                    size="small"
                    danger={actionDanger(action)}
                    type={action === 'resume' || action === 'retry' ? 'primary' : 'default'}
                    loading={actionJobId === row.id}
                    onClick={() => void execute(row, action)}
                  >
                    {actionText(action)}
                  </Button>
                ))}
              </Space>
            )
          }
        ]}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
}
