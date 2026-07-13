import { useEffect, useState } from 'react';
import { Alert, Button, Card, Empty, Select, Space, Table, Tag, Typography } from 'antd';
import type { PageResponse } from '../../shared/api/client';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';

type Props = {
  notify: (data: unknown, error?: boolean) => void;
  refreshKey: number;
};

type ImportJobSummary = {
  id: number;
  importType?: string;
  originalFilename?: string;
  totalCount?: number;
  successCount?: number;
  failureCount?: number;
  status?: string;
  errorSummary?: string;
  createdAt?: string;
};

type ImportJobDetail = ImportJobSummary & {
  errors?: { rowNo?: number; errorMessage?: string; rawData?: string }[];
};

const statusOptions = [
  { value: 'running', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'partial_completed', label: '部分完成' },
  { value: 'failed', label: '失败' }
];

const typeOptions = [
  { value: 'person_csv', label: '人物 CSV' },
  { value: 'person_xlsx', label: '人物 Excel' }
];

function importStatusText(value?: string) {
  const dict: Record<string, string> = {
    running: '处理中',
    completed: '已完成',
    partial_completed: '部分完成',
    failed: '失败'
  };
  return dict[String(value || '').toLowerCase()] || value || '待维护';
}

function importStatusColor(value?: string) {
  const status = String(value || '').toLowerCase();
  if (status === 'completed') return 'success';
  if (status === 'partial_completed') return 'warning';
  if (status === 'failed') return 'error';
  if (status === 'running') return 'processing';
  return 'default';
}

function importTypeText(value?: string) {
  const dict: Record<string, string> = {
    person_csv: '人物 CSV',
    person_xlsx: '人物 Excel'
  };
  return dict[String(value || '').toLowerCase()] || value || '-';
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

export function ImportJobManagementPanel({ notify, refreshKey }: Props) {
  const workspace = useWorkspace();
  const [jobs, setJobs] = useState<ImportJobSummary[]>([]);
  const [selectedJob, setSelectedJob] = useState<ImportJobDetail | null>(null);
  const [status, setStatus] = useState<string>();
  const [importType, setImportType] = useState<string>();
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadJobs() {
    if (!workspace.clanId) {
      setJobs([]);
      setTotal(0);
      setSelectedJob(null);
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({ pageNo: String(pageNo), pageSize: String(pageSize) });
      if (workspace.branchId) params.set('branchId', String(workspace.branchId));
      if (status) params.set('status', status);
      if (importType) params.set('importType', importType);
      const page = await apiClient.get<PageResponse<ImportJobSummary>>(
        `/clans/${workspace.clanId}/imports?${params.toString()}`
      );
      setJobs(page.records || []);
      setTotal(page.total || 0);
      if (selectedJob && !(page.records || []).some(item => item.id === selectedJob.id)) {
        setSelectedJob(null);
      }
    } catch (error) {
      const message = (error as Error).message || '导入任务加载失败';
      setJobs([]);
      setTotal(0);
      setSelectedJob(null);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(job: ImportJobSummary) {
    if (!workspace.clanId) return;
    setDetailLoading(true);
    try {
      const detail = await apiClient.get<ImportJobDetail>(`/clans/${workspace.clanId}/imports/${job.id}`);
      setSelectedJob(detail);
    } catch (error) {
      notify({ message: (error as Error).message || '导入任务详情加载失败' }, true);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs();
  }, [workspace.clanId, workspace.branchId, status, importType, pageNo, pageSize, refreshKey]);

  return (
    <>
      <Card
        title="导入任务"
        style={{ marginTop: 16 }}
        extra={<Button loading={loading} onClick={() => void loadJobs()}>刷新</Button>}
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="全部状态"
            value={status}
            options={statusOptions}
            style={{ width: 150 }}
            onChange={value => { setStatus(value); setPageNo(1); setSelectedJob(null); }}
          />
          <Select
            allowClear
            placeholder="全部导入类型"
            value={importType}
            options={typeOptions}
            style={{ width: 180 }}
            onChange={value => { setImportType(value); setPageNo(1); setSelectedJob(null); }}
          />
          <Typography.Text type="secondary">
            {workspace.branchId ? '当前仅显示所选支派的导入任务' : '当前显示全宗族导入任务'}
          </Typography.Text>
        </Space>
        {errorMessage ? <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 16 }} /> : null}
        <Table<ImportJobSummary>
          size="small"
          bordered
          loading={loading}
          rowKey="id"
          dataSource={jobs}
          onRow={row => ({ onClick: () => void loadDetail(row), style: { cursor: 'pointer' } })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无导入任务" /> }}
          pagination={{
            current: pageNo,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: value => `共 ${value} 个任务`,
            onChange: (nextPage, nextPageSize) => {
              setPageNo(nextPageSize === pageSize ? nextPage : 1);
              setPageSize(nextPageSize);
              setSelectedJob(null);
            }
          }}
          columns={[
            { key: 'importType', title: '导入类型', render: (_value, row) => importTypeText(row.importType) },
            { key: 'originalFilename', title: '文件名', dataIndex: 'originalFilename', ellipsis: true },
            { key: 'totalCount', title: '总数', dataIndex: 'totalCount', width: 80 },
            { key: 'successCount', title: '成功', dataIndex: 'successCount', width: 80 },
            { key: 'failureCount', title: '失败', dataIndex: 'failureCount', width: 80 },
            { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={importStatusColor(row.status)}>{importStatusText(row.status)}</Tag> },
            { key: 'createdAt', title: '创建时间', width: 180, render: (_value, row) => formatDateTime(row.createdAt) }
          ]}
        />
      </Card>

      {selectedJob ? (
        <Card title={`错误明细 · ${selectedJob.originalFilename || '导入任务'}`} loading={detailLoading} style={{ marginTop: 16 }}>
          <Alert
            type={(selectedJob.failureCount || 0) > 0 ? 'warning' : 'success'}
            showIcon
            message={selectedJob.errorSummary || '当前任务没有错误行。'}
            style={{ marginBottom: 12 }}
          />
          <Table
            size="small"
            bordered
            rowKey={(row: { rowNo?: number }, index) => String(row.rowNo || index)}
            dataSource={selectedJob.errors || []}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无错误行" /> }}
            columns={[
              { key: 'rowNo', title: '行号', dataIndex: 'rowNo', width: 80 },
              { key: 'errorMessage', title: '错误原因', dataIndex: 'errorMessage', width: 260 },
              { key: 'rawData', title: '原始数据', dataIndex: 'rawData', ellipsis: true }
            ]}
          />
        </Card>
      ) : null}
    </>
  );
}
