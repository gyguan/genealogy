import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
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

type ImportRowPayload = Record<string, unknown>;

type ImportJobRow = {
  id: number;
  rowNo?: number;
  rawData?: string;
  normalizedData?: ImportRowPayload;
  correctedData?: ImportRowPayload;
  rowStatus?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount?: number;
  draftCreated?: boolean;
  version?: number;
  updatedAt?: string;
};

type RetryFormValues = {
  name?: string;
  gender?: string;
  generationNo?: number;
  generationWord?: string;
  birthDate?: string;
  isLiving?: boolean;
  confirmDuplicates?: boolean;
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

const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' }
];

function importStatusText(value?: string) {
  const dict: Record<string, string> = {
    running: '处理中',
    completed: '已完成',
    partial_completed: '待修正',
    failed: '全部失败'
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

function rowStatusText(value?: string) {
  const dict: Record<string, string> = {
    invalid: '待修正',
    retry_failed: '重试未通过',
    draft_created: '已生成草稿',
    excluded: '已排除'
  };
  return dict[String(value || '').toLowerCase()] || value || '待维护';
}

function rowStatusColor(value?: string) {
  const status = String(value || '').toLowerCase();
  if (status === 'draft_created') return 'success';
  if (status === 'retry_failed') return 'error';
  if (status === 'invalid') return 'warning';
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

function payloadValue(payload: ImportRowPayload, key: string) {
  const value = payload[key];
  return value === null || value === undefined ? undefined : value;
}

function retryable(row: ImportJobRow) {
  return ['invalid', 'retry_failed'].includes(String(row.rowStatus || '').toLowerCase()) && !row.draftCreated;
}

export function ImportJobManagementPanel({ notify, refreshKey }: Props) {
  const workspace = useWorkspace();
  const [form] = Form.useForm<RetryFormValues>();
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

  const [rows, setRows] = useState<ImportJobRow[]>([]);
  const [rowPageNo, setRowPageNo] = useState(1);
  const [rowPageSize, setRowPageSize] = useState(20);
  const [rowTotal, setRowTotal] = useState(0);
  const [rowLoading, setRowLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<ImportJobRow | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);

  async function loadJobs() {
    if (!workspace.clanId) {
      setJobs([]);
      setTotal(0);
      clearSelection();
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
        clearSelection();
      }
    } catch (error) {
      const message = (error as Error).message || '导入任务加载失败';
      setJobs([]);
      setTotal(0);
      clearSelection();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRows(jobId: number, nextPage = rowPageNo, nextPageSize = rowPageSize) {
    if (!workspace.clanId) return;
    setRowLoading(true);
    try {
      const params = new URLSearchParams({
        status: 'failed',
        pageNo: String(nextPage),
        pageSize: String(nextPageSize)
      });
      const page = await apiClient.get<PageResponse<ImportJobRow>>(
        `/clans/${workspace.clanId}/imports/${jobId}/rows?${params.toString()}`
      );
      setRows(page.records || []);
      setRowTotal(page.total || 0);
    } catch (error) {
      setRows([]);
      setRowTotal(0);
      notify({ message: (error as Error).message || '失败行加载失败' }, true);
    } finally {
      setRowLoading(false);
    }
  }

  async function loadDetail(job: ImportJobSummary) {
    if (!workspace.clanId) return;
    setDetailLoading(true);
    setRowPageNo(1);
    setEditingRow(null);
    try {
      const detail = await apiClient.get<ImportJobDetail>(`/clans/${workspace.clanId}/imports/${job.id}`);
      setSelectedJob(detail);
      if ((detail.failureCount || 0) > 0) {
        await loadRows(job.id, 1, rowPageSize);
      } else {
        setRows([]);
        setRowTotal(0);
      }
    } catch (error) {
      notify({ message: (error as Error).message || '导入任务详情加载失败' }, true);
    } finally {
      setDetailLoading(false);
    }
  }

  function clearSelection() {
    setSelectedJob(null);
    setRows([]);
    setRowTotal(0);
    setEditingRow(null);
  }

  function openCorrection(row: ImportJobRow) {
    const values = row.correctedData || row.normalizedData || {};
    form.setFieldsValue({
      name: String(payloadValue(values, 'name') || ''),
      gender: String(payloadValue(values, 'gender') || 'unknown'),
      generationNo: typeof payloadValue(values, 'generationNo') === 'number'
        ? Number(payloadValue(values, 'generationNo'))
        : undefined,
      generationWord: String(payloadValue(values, 'generationWord') || ''),
      birthDate: String(payloadValue(values, 'birthDate') || ''),
      isLiving: payloadValue(values, 'isLiving') === undefined ? true : Boolean(payloadValue(values, 'isLiving')),
      confirmDuplicates: false
    });
    setEditingRow(row);
  }

  async function retryRow() {
    if (!workspace.clanId || !selectedJob || !editingRow) return;
    const values = await form.validateFields();
    setRetryLoading(true);
    try {
      const result = await apiClient.post<ImportJobRow>(
        `/clans/${workspace.clanId}/imports/${selectedJob.id}/rows/${editingRow.id}/retry`,
        {
          ...values,
          expectedVersion: editingRow.version ?? 0
        }
      );
      if (result.rowStatus === 'draft_created') {
        notify({ message: `第 ${result.rowNo || editingRow.rowNo || '-'} 行修正成功，已生成人物草稿` });
        setEditingRow(null);
        form.resetFields();
      } else {
        setEditingRow(result);
        notify({ message: result.errorMessage || '修正后仍未通过校验' }, true);
      }
      const refreshed = await apiClient.get<ImportJobDetail>(`/clans/${workspace.clanId}/imports/${selectedJob.id}`);
      setSelectedJob(refreshed);
      await loadRows(selectedJob.id, rowPageNo, rowPageSize);
      await loadJobs();
    } catch (error) {
      notify({ message: (error as Error).message || '失败行重试失败' }, true);
    } finally {
      setRetryLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs();
  }, [workspace.clanId, workspace.branchId, status, importType, pageNo, pageSize, refreshKey]);

  useEffect(() => {
    if (selectedJob && (selectedJob.failureCount || 0) > 0) {
      void loadRows(selectedJob.id, rowPageNo, rowPageSize);
    }
  }, [rowPageNo, rowPageSize]);

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
            onChange={value => { setStatus(value); setPageNo(1); clearSelection(); }}
          />
          <Select
            allowClear
            placeholder="全部导入类型"
            value={importType}
            options={typeOptions}
            style={{ width: 180 }}
            onChange={value => { setImportType(value); setPageNo(1); clearSelection(); }}
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
              clearSelection();
            }
          }}
          columns={[
            { key: 'importType', title: '导入类型', render: (_value, row) => importTypeText(row.importType) },
            { key: 'originalFilename', title: '文件名', dataIndex: 'originalFilename', ellipsis: true },
            { key: 'totalCount', title: '总数', dataIndex: 'totalCount', width: 80 },
            { key: 'successCount', title: '草稿', dataIndex: 'successCount', width: 80 },
            { key: 'failureCount', title: '待修正', dataIndex: 'failureCount', width: 90 },
            { key: 'status', title: '处理状态', width: 110, render: (_value, row) => <Tag color={importStatusColor(row.status)}>{importStatusText(row.status)}</Tag> },
            { key: 'createdAt', title: '创建时间', width: 180, render: (_value, row) => formatDateTime(row.createdAt) }
          ]}
        />
      </Card>

      {selectedJob ? (
        <Card title={`批次处理 · ${selectedJob.originalFilename || '人物导入'}`} loading={detailLoading} style={{ marginTop: 16 }}>
          <Alert
            type={(selectedJob.failureCount || 0) > 0 ? 'warning' : 'success'}
            showIcon
            message={selectedJob.errorSummary || '全部数据已生成草稿，可以进入下一步审核。'}
            description={(selectedJob.failureCount || 0) > 0 ? '修正失败行后系统会重新计算批次状态；原始行始终保留，不会被覆盖。' : undefined}
            style={{ marginBottom: 12 }}
          />
          {(selectedJob.failureCount || 0) > 0 ? (
            <Table<ImportJobRow>
              size="small"
              bordered
              loading={rowLoading}
              rowKey="id"
              dataSource={rows}
              pagination={{
                current: rowPageNo,
                pageSize: rowPageSize,
                total: rowTotal,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
                showTotal: value => `共 ${value} 条待修正数据`,
                onChange: (nextPage, nextPageSize) => {
                  setRowPageNo(nextPageSize === rowPageSize ? nextPage : 1);
                  setRowPageSize(nextPageSize);
                }
              }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有待修正数据" /> }}
              columns={[
                { key: 'rowNo', title: '行号', dataIndex: 'rowNo', width: 80 },
                { key: 'rowStatus', title: '状态', width: 120, render: (_value, row) => <Tag color={rowStatusColor(row.rowStatus)}>{rowStatusText(row.rowStatus)}</Tag> },
                { key: 'errorMessage', title: '错误原因', dataIndex: 'errorMessage', width: 280 },
                { key: 'rawData', title: '原始数据', dataIndex: 'rawData', ellipsis: true },
                { key: 'retryCount', title: '重试次数', dataIndex: 'retryCount', width: 100 },
                {
                  key: 'action',
                  title: '操作',
                  width: 100,
                  fixed: 'right',
                  render: (_value, row) => (
                    <Button size="small" type="primary" disabled={!retryable(row)} onClick={() => openCorrection(row)}>
                      修正
                    </Button>
                  )
                }
              ]}
              scroll={{ x: 'max-content' }}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前批次没有失败行" />
          )}
        </Card>
      ) : null}

      <Modal
        title={`修正导入数据${editingRow?.rowNo ? ` · 第 ${editingRow.rowNo} 行` : ''}`}
        open={Boolean(editingRow)}
        confirmLoading={retryLoading}
        okText="保存并重试"
        cancelText="取消"
        onOk={() => void retryRow()}
        onCancel={() => { setEditingRow(null); form.resetFields(); }}
        destroyOnHidden
      >
        {editingRow ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert type="info" showIcon message="原始数据仅作对照；保存后将使用下方业务字段重新校验，不会修改原始导入记录。" />
            <Typography.Paragraph type="secondary" copyable={{ text: editingRow.rawData || '' }}>
              原始数据：{editingRow.rawData || '-'}
            </Typography.Paragraph>
            {editingRow.errorMessage ? <Alert type="error" showIcon message={editingRow.errorMessage} /> : null}
            <Form form={form} layout="vertical">
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input maxLength={100} />
              </Form.Item>
              <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
                <Select options={genderOptions} />
              </Form.Item>
              <Form.Item name="generationNo" label="代次">
                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="generationWord" label="字辈">
                <Input maxLength={50} />
              </Form.Item>
              <Form.Item name="birthDate" label="出生日期">
                <Input type="date" />
              </Form.Item>
              <Form.Item name="isLiving" valuePropName="checked">
                <Checkbox>在世</Checkbox>
              </Form.Item>
              <Form.Item name="confirmDuplicates" valuePropName="checked">
                <Checkbox>如修正后命中疑似重复人物，我已确认仍需生成草稿</Checkbox>
              </Form.Item>
            </Form>
          </Space>
        ) : null}
      </Modal>
    </>
  );
}
