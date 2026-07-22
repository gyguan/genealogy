import { ApartmentOutlined, FolderOpenOutlined, UserOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Descriptions, Drawer, Progress, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PageResponse } from '../../shared/api/client';
import { apiClient } from '../../shared/api/client';
import type { ImportExecutionAction } from '../../shared/api/generated/import-execution-types';
import { ConfirmAction, EmptyState, InlineFeedback, PageFeedback } from '../../shared/ui/Feedback';
import {
  allowedImportTaskActions,
  importTaskNumber,
  importTaskProgress,
  importTaskStage,
  importTaskStatus,
  importTaskStatusColor,
  importTaskStatusText,
  matchesImportTask,
  normalizeImportTaskType,
  type ImportTaskRecord
} from './import-task-model';
import type { ImportTaskQueryState } from './import-task-query-state';

const LOAD_LIMIT = 200;
const actionLabels: Record<ImportExecutionAction, string> = { pause: '暂停', resume: '继续', cancel: '取消', retry: '重试' };
const typeLabels = { person: '人物', relationship: '关系', source: '来源' } as const;

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
}

function typePresentation(job: ImportTaskRecord) {
  const type = normalizeImportTaskType(job.importType || job.legacyImportType);
  if (type === 'relationship') return { label: typeLabels.relationship, icon: <ApartmentOutlined />, className: 'relationship' };
  if (type === 'source') return { label: typeLabels.source, icon: <FolderOpenOutlined />, className: 'source' };
  return { label: typeLabels.person, icon: <UserOutlined />, className: 'person' };
}

type Props = {
  clanId: string;
  clanName?: string;
  branchId: string;
  branchName?: string;
  refreshKey: number;
  query: ImportTaskQueryState;
  notify: (data: unknown, error?: boolean) => void;
  onChanged: () => void;
  onTotalChange: (value: number) => void;
  onPageChange: (pageNo: number, pageSize: number) => void;
  onOpenRecords: () => void;
};

export function AsyncImportExecutionPanel({
  clanId,
  clanName,
  branchId,
  branchName,
  refreshKey,
  query,
  notify,
  onChanged,
  onTotalChange,
  onPageChange,
  onOpenRecords
}: Props) {
  const [records, setRecords] = useState<ImportTaskRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionKey, setActionKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedJob, setSelectedJob] = useState<ImportTaskRecord>();

  const filteredJobs = useMemo(() => records.filter(job => matchesImportTask(job, query)), [records, query]);
  const visibleJobs = useMemo(() => {
    const start = (query.pageNo - 1) * query.pageSize;
    return filteredJobs.slice(start, start + query.pageSize);
  }, [filteredJobs, query.pageNo, query.pageSize]);
  const hasActiveJob = useMemo(
    () => records.some(job => ['queued', 'running', 'retry_wait'].includes(importTaskStatus(job))),
    [records]
  );

  async function load() {
    if (!clanId) {
      setRecords([]);
      setServerTotal(0);
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({ pageNo: '1', pageSize: String(LOAD_LIMIT) });
      if (branchId) params.set('branchId', branchId);
      if (query.importTypes.length === 1) params.set('importType', query.importTypes[0]);
      if (query.statuses.length === 1) params.set('status', query.statuses[0]);
      const page = await apiClient.get<PageResponse<ImportTaskRecord>>(`/clans/${clanId}/imports?${params.toString()}`);
      setRecords(page.records || []);
      setServerTotal(page.total || 0);
    } catch (error) {
      setRecords([]);
      setServerTotal(0);
      setErrorMessage((error as Error).message || '导入任务加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function execute(job: ImportTaskRecord, action: ImportExecutionAction) {
    const key = `${job.id}-${action}`;
    setActionKey(key);
    try {
      await apiClient.post(`/clans/${clanId}/imports/${job.id}/execution/${action}`, {});
      notify({ message: `任务已${actionLabels[action]}` });
      await load();
      onChanged();
    } catch (error) {
      notify({ message: (error as Error).message || `${actionLabels[action]}任务失败` }, true);
    } finally {
      setActionKey('');
    }
  }

  useEffect(() => { void load(); }, [
    clanId,
    branchId,
    refreshKey,
    query.importTypes.join(','),
    query.statuses.join(','),
    query.keyword,
    query.createdFrom,
    query.createdTo
  ]);

  useEffect(() => { onTotalChange(filteredJobs.length); }, [filteredJobs.length, onTotalChange]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredJobs.length / query.pageSize));
    if (query.pageNo > maxPage) onPageChange(maxPage, query.pageSize);
  }, [filteredJobs.length, query.pageNo, query.pageSize, onPageChange]);

  useEffect(() => {
    if (!hasActiveJob) return undefined;
    const timer = window.setInterval(() => { void load(); }, 2500);
    return () => window.clearInterval(timer);
  }, [hasActiveJob, clanId, branchId, query.importTypes.join(','), query.statuses.join(',')]);

  function renderActions(job: ImportTaskRecord) {
    const status = importTaskStatus(job);
    const actions = allowedImportTaskActions(job);
    return (
      <Space wrap size={4} className="import-mobile-card-actions">
        <Button type="link" onClick={() => setSelectedJob(job)}>查看详情</Button>
        {actions.filter(action => action !== 'cancel').map(action => (
          <Button key={action} type="link" loading={actionKey === `${job.id}-${action}`} onClick={() => void execute(job, action)}>{actionLabels[action]}</Button>
        ))}
        {actions.includes('cancel') ? (
          <ConfirmAction
            title="取消该导入任务？"
            description="取消仅适用于尚未产生草稿或发布数据的任务，取消后需要重新创建批次。"
            okText="确认取消"
            cancelText="保留任务"
            danger
            onConfirm={() => void execute(job, 'cancel')}
          >
            <Button type="link" danger loading={actionKey === `${job.id}-cancel`}>取消</Button>
          </ConfirmAction>
        ) : null}
        {status === 'completed' || status === 'partial_completed' ? <Button type="link" onClick={onOpenRecords}>查看导入记录</Button> : null}
      </Space>
    );
  }

  const columns: ColumnsType<ImportTaskRecord> = [
    {
      key: 'task', title: '导入任务', width: 300, render: (_value, job) => {
        const presentation = typePresentation(job);
        return (
          <Space align="start">
            <span className={`import-task-type-icon import-task-type-icon--${presentation.className}`}>{presentation.icon}</span>
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{presentation.label}</Typography.Text>
              <Typography.Text>{job.originalFilename || '未命名文件'}</Typography.Text>
              <Typography.Text type="secondary">任务编号：{importTaskNumber(job)}</Typography.Text>
            </Space>
          </Space>
        );
      }
    },
    {
      key: 'scope', title: '目标范围', width: 180, render: (_value, job) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{job.clanName || clanName || '当前宗族'}</Typography.Text>
          <Typography.Text type="secondary">{job.branchName || branchName || '全部支派'}</Typography.Text>
        </Space>
      )
    },
    {
      key: 'status', title: '状态', width: 140, render: (_value, job) => {
        const status = importTaskStatus(job);
        return <Space direction="vertical" size={2}><Tag color={importTaskStatusColor(status)}>{importTaskStatusText[status]}</Tag><Typography.Text type="secondary">{importTaskStage(job)}</Typography.Text></Space>;
      }
    },
    {
      key: 'result', title: '处理结果', width: 280, render: (_value, job) => {
        const status = importTaskStatus(job);
        if ((status === 'failed' || status === 'dead_letter') && job.errorSummary) {
          return <InlineFeedback tone="error" title="执行失败" description={job.errorSummary} />;
        }
        return (
          <Space direction="vertical" size={2} className="import-task-result">
            <Typography.Text>成功 {job.successCount || 0} · 失败 {job.failureCount || 0}</Typography.Text>
            <Progress percent={importTaskProgress(job)} size="small" status={status === 'failed' || status === 'dead_letter' ? 'exception' : undefined} />
            <Typography.Text type="secondary">已处理 {job.processedCount || 0}/{job.totalCount || 0}</Typography.Text>
          </Space>
        );
      }
    },
    { key: 'created', title: '创建时间', width: 180, render: (_value, job) => formatDateTime(job.createdAt || job.updatedAt) },
    { key: 'actions', title: '操作', width: 230, fixed: 'right', render: (_value, job) => renderActions(job) }
  ];

  return (
    <>
      {!clanId ? (
        <PageFeedback
          tone="warning"
          title="请先选择所属宗族"
          description="选择宗族后可查看对应的导入任务。"
        />
      ) : null}
      {errorMessage ? (
        <PageFeedback
          tone="error"
          title="导入任务加载失败"
          description={errorMessage}
          action={<Button size="small" onClick={() => void load()}>重新加载</Button>}
        />
      ) : null}
      {records.some(job => job.manualInterventionRequired) ? (
        <PageFeedback
          tone="warning"
          title="部分任务需要人工处理"
          description="任务已超过自动重试上限，请查看失败摘要后重试。"
        />
      ) : null}
      {serverTotal > records.length ? (
        <PageFeedback
          tone="info"
          title={`当前展示最近 ${records.length} 条任务`}
          description="请使用查询条件缩小范围。"
        />
      ) : null}

      <div className="import-execution-table">
        <Table<ImportTaskRecord>
          size="middle"
          loading={loading}
          rowKey="id"
          dataSource={visibleJobs}
          columns={columns}
          scroll={{ x: 1310 }}
          locale={{ emptyText: <EmptyState compact title="未找到符合条件的导入任务" description="请调整查询条件后重试。" /> }}
          pagination={{
            current: query.pageNo,
            pageSize: query.pageSize,
            total: filteredJobs.length,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: total => `共 ${total} 个任务`,
            onChange: (pageNo, pageSize) => onPageChange(pageNo, pageSize)
          }}
        />
      </div>

      <div className="import-execution-card-list">
        {loading ? <Card loading /> : visibleJobs.length ? visibleJobs.map(job => {
          const presentation = typePresentation(job);
          const status = importTaskStatus(job);
          return (
            <Card key={job.id} size="small" title={<Space><span className={`import-task-type-icon import-task-type-icon--${presentation.className}`}>{presentation.icon}</span>{presentation.label}</Space>} extra={<Tag color={importTaskStatusColor(status)}>{importTaskStatusText[status]}</Tag>}>
              <Space direction="vertical" size={6} className="import-workbench-stack">
                <Typography.Text strong>{job.originalFilename || '未命名文件'}</Typography.Text>
                <Typography.Text type="secondary">任务编号：{importTaskNumber(job)}</Typography.Text>
                <Typography.Text type="secondary">目标：{job.clanName || clanName || '当前宗族'} / {job.branchName || branchName || '全部支派'}</Typography.Text>
                <Typography.Text type="secondary">阶段：{importTaskStage(job)}</Typography.Text>
                <Progress percent={importTaskProgress(job)} size="small" status={status === 'failed' || status === 'dead_letter' ? 'exception' : undefined} />
                <Typography.Text type="secondary">成功 {job.successCount || 0} · 失败 {job.failureCount || 0}</Typography.Text>
                <Typography.Text type="secondary">创建时间：{formatDateTime(job.createdAt || job.updatedAt)}</Typography.Text>
                {job.errorSummary ? <InlineFeedback tone="error" title="任务执行失败" description={job.errorSummary} /> : null}
                {renderActions(job)}
              </Space>
            </Card>
          );
        }) : <EmptyState title="未找到符合条件的导入任务" description="请调整查询条件后重试。" />}
      </div>

      <Drawer width={720} title={selectedJob ? `${typePresentation(selectedJob).label}导入任务` : '导入任务详情'} open={Boolean(selectedJob)} onClose={() => setSelectedJob(undefined)}>
        {selectedJob ? <Space direction="vertical" size={16} className="import-workbench-stack">
          <Descriptions column={1} bordered size="small" items={[
            { key: 'number', label: '任务编号', children: importTaskNumber(selectedJob) },
            { key: 'file', label: '文件', children: selectedJob.originalFilename || '-' },
            { key: 'scope', label: '目标范围', children: `${selectedJob.clanName || clanName || '当前宗族'} / ${selectedJob.branchName || branchName || '全部支派'}` },
            { key: 'status', label: '状态', children: <Tag color={importTaskStatusColor(importTaskStatus(selectedJob))}>{importTaskStatusText[importTaskStatus(selectedJob)]}</Tag> },
            { key: 'stage', label: '当前阶段', children: importTaskStage(selectedJob) },
            { key: 'count', label: '处理结果', children: `总数 ${selectedJob.totalCount || 0}，已处理 ${selectedJob.processedCount || 0}，成功 ${selectedJob.successCount || 0}，失败 ${selectedJob.failureCount || 0}` },
            { key: 'created', label: '创建时间', children: formatDateTime(selectedJob.createdAt) },
            { key: 'updated', label: '最近更新', children: formatDateTime(selectedJob.updatedAt || selectedJob.heartbeatAt) },
            { key: 'retry', label: '恢复信息', children: `已重试 ${selectedJob.executionRetryCount || 0}/${selectedJob.executionMaxRetries || 0}${selectedJob.nextRetryAt ? `，下次重试 ${formatDateTime(selectedJob.nextRetryAt)}` : ''}` }
          ]} />
          {selectedJob.errorSummary ? <PageFeedback tone="error" title="失败摘要" description={selectedJob.errorSummary} /> : null}
          <Card size="small" title="技术执行信息"><Descriptions column={1} size="small" items={[
            { key: 'chunk', label: '分片大小', children: selectedJob.chunkSize || '-' },
            { key: 'heartbeat', label: '最近心跳', children: formatDateTime(selectedJob.heartbeatAt) },
            { key: 'intervention', label: '人工介入', children: selectedJob.manualInterventionRequired ? '需要' : '不需要' }
          ]} /></Card>
          {(selectedJob.failureCount || 0) > 0 ? (
            <PageFeedback
              tone="info"
              title="可查看失败明细"
              description="进入导入记录查看批次级和行级错误，并修正失败数据。"
              action={<Button type="link" onClick={onOpenRecords}>查看导入记录</Button>}
            />
          ) : null}
        </Space> : null}
      </Drawer>
    </>
  );
}
