import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Select, Space, Table, Tag, Typography } from 'antd';
import type { PageResponse } from '../../shared/api/client';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { readImportHistoryUrl, writeImportHistoryUrl } from './import-history-state';
import { importFileFormatOptions, importFileFormatText, importTypeOptions, importTypeText } from './import-type-registry';

type Props = { refreshKey: number };
type ImportJobSummary = {
  id: number;
  importType?: string;
  fileFormat?: string;
  legacyImportType?: string;
  originalFilename?: string;
  totalCount?: number;
  successCount?: number;
  failureCount?: number;
  status?: string;
  processingStatus?: string;
  reviewStatus?: string;
  createdAt?: string;
};

const statusOptions = [
  { value: 'running', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'partial_completed', label: '部分完成' },
  { value: 'failed', label: '失败' }
];
const processingLabels: Record<string, string> = {
  processing: '处理中',
  running: '处理中',
  correction_required: '待修正',
  ready_for_review: '可提交审核',
  completed: '已完成',
  partial_completed: '部分完成',
  failed: '失败'
};

function processingText(row: ImportJobSummary) {
  const status = String(row.processingStatus || row.status || '').toLowerCase();
  return processingLabels[status] || row.status || '待维护';
}

function processingColor(row: ImportJobSummary) {
  const status = String(row.processingStatus || row.status || '').toLowerCase();
  if (['ready_for_review', 'completed'].includes(status)) return 'success';
  if (['correction_required', 'partial_completed'].includes(status)) return 'warning';
  if (status === 'failed') return 'error';
  return 'processing';
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
}

export function ImportHistoryOverviewPanel({ refreshKey }: Props) {
  const workspace = useWorkspace();
  const initial = useMemo(() => readImportHistoryUrl(window.location.search), []);
  const [status, setStatus] = useState(initial.status);
  const [importType, setImportType] = useState(initial.type);
  const [fileFormat, setFileFormat] = useState(initial.format);
  const [pageNo, setPageNo] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [jobs, setJobs] = useState<ImportJobSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  function applyUrlState() {
    const next = readImportHistoryUrl(window.location.search);
    setStatus(next.status);
    setImportType(next.type);
    setFileFormat(next.format);
    setPageNo(next.page);
    setPageSize(next.pageSize);
  }

  useEffect(() => {
    window.addEventListener('popstate', applyUrlState);
    return () => window.removeEventListener('popstate', applyUrlState);
  }, []);

  async function load() {
    if (!workspace.clanId) { setJobs([]); setTotal(0); return; }
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({ pageNo: String(pageNo), pageSize: String(pageSize) });
      if (workspace.branchId) params.set('branchId', workspace.branchId);
      if (status) params.set('status', status);
      if (importType) params.set('importType', importType);
      if (fileFormat) params.set('fileFormat', fileFormat);
      const result = await apiClient.get<PageResponse<ImportJobSummary>>(`/clans/${workspace.clanId}/imports?${params.toString()}`);
      setJobs(result.records || []);
      setTotal(result.total || 0);
    } catch (error) {
      setJobs([]);
      setTotal(0);
      setErrorMessage((error as Error).message || '导入记录加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    writeImportHistoryUrl({ status, type: importType, format: fileFormat, page: pageNo, pageSize });
    void load();
  }, [workspace.clanId, workspace.branchId, status, importType, fileFormat, pageNo, pageSize, refreshKey]);

  function resetPage(update: () => void) {
    update();
    setPageNo(1);
  }

  return (
    <Card title="导入记录概览" extra={<Button loading={loading} onClick={() => void load()}>刷新</Button>}>
      <Space wrap className="import-history-filters">
        <Select allowClear placeholder="全部状态" value={status} options={statusOptions} onChange={value => resetPage(() => setStatus(value))} />
        <Select allowClear placeholder="全部业务类型" value={importType} options={importTypeOptions} onChange={value => resetPage(() => setImportType(value))} />
        <Select allowClear placeholder="全部文件格式" value={fileFormat} options={[...importFileFormatOptions]} onChange={value => resetPage(() => setFileFormat(value))} />
        <Typography.Text type="secondary">筛选和分页已写入 URL，可刷新或通过浏览器前进、后退恢复。</Typography.Text>
      </Space>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} className="import-panel-alert" /> : null}
      <div className="import-history-table">
        <Table<ImportJobSummary>
          size="middle"
          loading={loading}
          rowKey="id"
          dataSource={jobs}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无导入记录" /> }}
          pagination={{ current: pageNo, pageSize, total, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: value => `共 ${value} 个批次`, onChange: (nextPage, nextSize) => { setPageNo(nextSize === pageSize ? nextPage : 1); setPageSize(nextSize); } }}
          columns={[
            { key: 'type', title: '导入对象', render: (_value, row) => importTypeText(row.importType || row.legacyImportType) },
            { key: 'format', title: '格式', width: 90, render: (_value, row) => importFileFormatText(row.fileFormat, row.legacyImportType) },
            { key: 'file', title: '文件', dataIndex: 'originalFilename', ellipsis: true },
            { key: 'result', title: '处理结果', width: 220, render: (_value, row) => `总数 ${row.totalCount || 0} · 草稿 ${row.successCount || 0} · 待修正 ${row.failureCount || 0}` },
            { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={processingColor(row)}>{processingText(row)}</Tag> },
            { key: 'created', title: '创建时间', width: 180, render: (_value, row) => formatDateTime(row.createdAt) }
          ]}
          scroll={{ x: 900 }}
        />
      </div>
      <div className="import-history-card-list">
        {loading ? <Card loading /> : jobs.length ? jobs.map(job => (
          <Card key={job.id} size="small" title={importTypeText(job.importType || job.legacyImportType)} extra={<Tag color={processingColor(job)}>{processingText(job)}</Tag>}>
            <Space direction="vertical" size={4} className="import-workbench-stack">
              <Typography.Text ellipsis={{ tooltip: job.originalFilename }}>{job.originalFilename || '未命名文件'}</Typography.Text>
              <Typography.Text type="secondary">格式：{importFileFormatText(job.fileFormat, job.legacyImportType)}</Typography.Text>
              <Typography.Text type="secondary">总数 {job.totalCount || 0} · 草稿 {job.successCount || 0} · 待修正 {job.failureCount || 0}</Typography.Text>
              <Typography.Text type="secondary">创建时间：{formatDateTime(job.createdAt)}</Typography.Text>
            </Space>
          </Card>
        )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无导入记录" />}
        {total > pageSize ? <Space wrap><Button disabled={pageNo <= 1} onClick={() => setPageNo(value => Math.max(1, value - 1))}>上一页</Button><Typography.Text>第 {pageNo} 页</Typography.Text><Button disabled={pageNo * pageSize >= total} onClick={() => setPageNo(value => value + 1)}>下一页</Button></Space> : null}
      </div>
    </Card>
  );
}
