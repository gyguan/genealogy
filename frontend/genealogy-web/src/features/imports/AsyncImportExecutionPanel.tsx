import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Drawer, Empty, Popconfirm, Progress, Space, Table, Tag, Typography } from 'antd';
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
  failureCount?: number;
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
  updatedAt?: string;
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

function statusColor(status?: ImportExecutionStatus, partial = false) {
  if (partial) return 'warning';
  if (status === 'completed') return 'success';
  if (status === 'failed' || status === 'dead_letter') return 'error';
  if (status === 'paused' || status === 'retry_wait') return 'warning';
  if (status === 'queued' || status === 'running') return 'processing';
  return 'default';
}

function hasSideEffects(job: AsyncImportJob) {
  return Number(job.processedCount || 0) > 0 || Number(job.publishedCount || 0) > 0;
}

function isPartiallyCompleted(job: AsyncImportJob) {
  return job.executionStatus === 'completed' && Number(job.failureCount || 0) > 0;
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

function progressOf(job: AsyncImportJob) {
  const publishing = job.executionStage === 'publishing';
  const denominator = publishing ? Number(job.successCount || 0) : Number(job.totalCount || 0);
  const completed = publishing ? Number(job.publishedCount || 0) : Number(job.processedCount || 0);
  if (job.executionStatus === 'completed') return 100;
  return denominator <= 0 ? 0 : Math.min(100, Math.round(completed * 100 / denominator));
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
}

function displayStatus(job: AsyncImportJob) {
  if (isPartiallyCompleted(job)) return '部分成功';
  return statusText[job.executionStatus || 'queued'];
}

export function AsyncImportExecutionPanel({ clanId, branchId, refreshKey, notify, onChanged }: Props) {
  const [jobs, setJobs] = useState<AsyncImportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionKey, setActionKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedJob, setSelectedJob] = useState<AsyncImportJob>();

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
    const key = `${job.id}-${action}`;
    setActionKey(key);
    try {
      await apiClient.post(`/clans/${clanId}/imports/${job.id}/execution/${action}`, {});
      notify({ message: `任务已${actionText(action)}` });
      await load();
      onChanged();
    } catch (error) {
      notify({ message: (error as Error).message || `${actionText(action)}任务失败` }, true);
    } finally {
      setActionKey('');
    }
  }

  useEffect(() => { void load(); }, [clanId, branchId, refreshKey]);
  useEffect(() => {
    if (!hasActiveJob) return undefined;
    const timer = window.setInterval(() => { void load(); }, 2500);
    return () => window.clearInterval(timer);
  }, [hasActiveJob, clanId, branchId]);

  return (
    <>
      <Card title="执行任务" extra={<Button loading={loading} onClick={() => void load()}>刷新</Button>}>
        <Typography.Paragraph type="secondary">
          大文件会在后台继续处理。可离开当前页面，稍后返回查看进度；存在失败行的完成任务会明确显示为“部分成功”。
        </Typography.Paragraph>
        {!clanId ? <Alert type="warning" showIcon message="请先选择所属宗族后查看执行任务。" /> : null}
        {errorMessage ? <Alert type="error" showIcon message={errorMessage} className="import-panel-alert" /> : null}
        {jobs.some(job => job.manualInterventionRequired) ? (
          <Alert type="warning" showIcon message="存在超过自动重试上限的任务，请查看失败摘要并人工重试。" className="import-panel-alert" />
        ) : null}
        <Table<AsyncImportJob>
          size="middle"
          loading={loading}
          rowKey="id"
          dataSource={jobs}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有异步导入任务" /> }}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: total => `共 ${total} 个任务` }}
          columns={[
            { key: 'type', title: '导入对象', width: 110, render: (_value, row) => importTypeText(row.importType || row.legacyImportType) },
            { key: 'filename', title: '文件', dataIndex: 'originalFilename', ellipsis: true },
            { key: 'stage', title: '当前阶段', width: 120, render: (_value, row) => stageText[row.executionStage || 'queued'] },
            {
              key: 'status',
              title: '状态',
              width: 120,
              render: (_value, row) => <Tag color={statusColor(row.executionStatus, isPartiallyCompleted(row))}>{displayStatus(row)}</Tag>
            },
            {
              key: 'progress',
              title: '处理进度',
              width: 280,
              render: (_value, row) => (
                <Space direction="vertical" size={0} className="import-workbench-stack">
                  <Progress percent={progressOf(row)} size="small" status={row.executionStatus === 'failed' || row.executionStatus === 'dead_letter' ? 'exception' : undefined} />
                  <Typography.Text type="secondary">
                    已处理 {row.processedCount || 0}/{row.totalCount || 0} · 成功 {row.successCount || 0} · 失败 {row.failureCount || 0}
                  </Typography.Text>
                  <Typography.Text type="secondary">最近更新：{formatDateTime(row.updatedAt || row.heartbeatAt)}</Typography.Text>
                </Space>
              )
            },
            {
              key: 'actions',
              title: '操作',
              width: 210,
              fixed: 'right',
              render: (_value, row) => (
                <Space wrap size={4}>
                  <Button type="link" onClick={() => setSelectedJob(row)}>查看详情</Button>
                  {allowedActions(row).filter(action => action !== 'cancel').map(action => (
                    <Button
                      key={action}
                      type="link"
                      loading={actionKey === `${row.id}-${action}`}
                      onClick={() => void execute(row, action)}
                    >
                      {actionText(action)}
                    </Button>
                  ))}
                  {allowedActions(row).includes('cancel') ? (
                    <Popconfirm
                      title="确认取消该导入任务？"
                      description="取消仅适用于尚未产生草稿或发布数据的任务，取消后需要重新创建批次。"
                      okText="确认取消"
                      cancelText="保留任务"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => void execute(row, 'cancel')}
                    >
                      <Button type="link" danger loading={actionKey === `${row.id}-cancel`}>取消</Button>
                    </Popconfirm>
                  ) : null}
                </Space>
              )
            }
          ]}
          scroll={{ x: 1050 }}
        />
      </Card>

      <Drawer
        width={720}
        title={selectedJob ? `${importTypeText(selectedJob.importType || selectedJob.legacyImportType)}导入任务` : '导入任务详情'}
        open={Boolean(selectedJob)}
        onClose={() => setSelectedJob(undefined)}
      >
        {selectedJob ? (
          <Space direction="vertical" size={16} className="import-workbench-stack">
            <Descriptions column={1} bordered size="small" items={[
              { key: 'file', label: '文件', children: selectedJob.originalFilename || '-' },
              { key: 'status', label: '状态', children: <Tag color={statusColor(selectedJob.executionStatus, isPartiallyCompleted(selectedJob))}>{displayStatus(selectedJob)}</Tag> },
              { key: 'stage', label: '当前阶段', children: stageText[selectedJob.executionStage || 'queued'] },
              { key: 'count', label: '处理结果', children: `总数 ${selectedJob.totalCount || 0}，已处理 ${selectedJob.processedCount || 0}，成功 ${selectedJob.successCount || 0}，失败 ${selectedJob.failureCount || 0}` },
              { key: 'updated', label: '最近更新', children: formatDateTime(selectedJob.updatedAt || selectedJob.heartbeatAt) },
              { key: 'retry', label: '恢复信息', children: `已重试 ${selectedJob.executionRetryCount || 0}/${selectedJob.executionMaxRetries || 0}${selectedJob.nextRetryAt ? `，下次重试 ${formatDateTime(selectedJob.nextRetryAt)}` : ''}` }
            ]} />
            {selectedJob.errorSummary ? <Alert type="error" showIcon message="失败摘要" description={selectedJob.errorSummary} /> : null}
            <Card size="small" title="技术执行信息">
              <Descriptions column={1} size="small" items={[
                { key: 'chunk', label: '分片大小', children: selectedJob.chunkSize || '-' },
                { key: 'heartbeat', label: '最近心跳', children: formatDateTime(selectedJob.heartbeatAt) },
                { key: 'intervention', label: '人工介入', children: selectedJob.manualInterventionRequired ? '需要' : '不需要' }
              ]} />
            </Card>
            {(selectedJob.failureCount || 0) > 0 ? (
              <Alert type="info" showIcon message="失败明细处理" description="请在“导入记录”中查看批次级和行级错误，并按现有任务管理能力下载或修正失败数据。" />
            ) : null}
          </Space>
        ) : null}
      </Drawer>
    </>
  );
}
