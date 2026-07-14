import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import type { PageResponse } from '../../shared/api/client';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { importFileFormatOptions, importFileFormatText, importTypeOptions, importTypeText } from './import-type-registry';

type Props = { notify: (data: unknown, error?: boolean) => void; refreshKey: number };

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
  errorSummary?: string;
  createdAt?: string;
  processingStatus?: string;
  reviewStatus?: string;
  reviewRound?: number;
};

type ImportJobDetail = ImportJobSummary & { errors?: { rowNo?: number; errorMessage?: string; rawData?: string }[] };
type ImportRowPayload = Record<string, unknown>;

type ImportJobRow = {
  id: number;
  rowNo?: number;
  rawData?: string;
  normalizedData?: ImportRowPayload;
  correctedData?: ImportRowPayload;
  rowStatus?: string;
  errorMessage?: string;
  retryCount?: number;
  draftCreated?: boolean;
  version?: number;
};

type RetryFormValues = {
  name?: string;
  gender?: string;
  generationNo?: number;
  generationWord?: string;
  birthDate?: string;
  isLiving?: boolean;
  confirmDuplicates?: boolean;
  fromPersonCode?: string;
  toPersonCode?: string;
  relationshipType?: string;
  description?: string;
  sourceName?: string;
  sourceType?: string;
  providerName?: string;
  bookTitle?: string;
  volumeNo?: string;
  pageNo?: string;
  sourceDate?: string;
  collectionLocation?: string;
  sourceDescription?: string;
  excerpt?: string;
  confidenceLevel?: string;
  privacyLevel?: string;
  sensitiveLevel?: string;
};

type ReviewTaskCreated = { id?: number };

const statusOptions = [
  { value: 'running', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'partial_completed', label: '部分完成' },
  { value: 'failed', label: '失败' }
];
const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' }
];
const relationshipTypeOptions = ['父子', '母子', '配偶'].map(value => ({ value, label: value }));
const sourceTypeOptions = ['谱书', '地方志', '墓碑', '照片', '口述', '档案', '其他'].map(value => ({ value, label: value }));
const confidenceOptions = ['高', '中', '低', '未知'].map(value => ({ value, label: value }));
const privacyOptions = ['公开', '宗族内', '支派内', '亲属可见', '私密', '封存'].map(value => ({ value, label: value }));
const sensitiveOptions = ['普通', '敏感', '高度敏感'].map(value => ({ value, label: value }));

function processingStatusText(row: ImportJobSummary) {
  const status = String(row.processingStatus || '').toLowerCase();
  const dict: Record<string, string> = { processing: '处理中', correction_required: '待修正', ready_for_review: '可提交审核' };
  const legacy: Record<string, string> = { running: '处理中', completed: '已完成', partial_completed: '待修正', failed: '全部失败' };
  return dict[status] || legacy[String(row.status || '').toLowerCase()] || row.status || '待维护';
}

function processingStatusColor(row: ImportJobSummary) {
  const status = String(row.processingStatus || row.status || '').toLowerCase();
  if (['ready_for_review', 'completed'].includes(status)) return 'success';
  if (['correction_required', 'partial_completed'].includes(status)) return 'warning';
  if (status === 'failed') return 'error';
  if (['processing', 'running'].includes(status)) return 'processing';
  return 'default';
}

function reviewStatusText(value?: string) {
  const dict: Record<string, string> = { not_submitted: '未提交', pending: '审核中', approved: '已通过', rejected: '已驳回', cancelled: '已取消' };
  return dict[String(value || '').toLowerCase()] || value || '未提交';
}

function reviewStatusColor(value?: string) {
  const status = String(value || '').toLowerCase();
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'pending') return 'processing';
  return 'default';
}

function rowStatusText(value?: string) {
  const dict: Record<string, string> = { invalid: '待修正', retry_failed: '重试未通过', draft_created: '已生成草稿', excluded: '已排除' };
  return dict[String(value || '').toLowerCase()] || value || '待维护';
}

function rowStatusColor(value?: string) {
  const status = String(value || '').toLowerCase();
  if (status === 'draft_created') return 'success';
  if (status === 'retry_failed') return 'error';
  if (status === 'invalid') return 'warning';
  return 'default';
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

function normalizedImportType(row?: ImportJobSummary | null) {
  return String(row?.importType || row?.legacyImportType || '').toLowerCase().replace(/_(csv|xlsx)$/, '');
}

function retryable(row: ImportJobRow, job?: ImportJobSummary | null) {
  return ['person', 'relationship', 'source'].includes(normalizedImportType(job))
    && ['invalid', 'retry_failed'].includes(String(row.rowStatus || '').toLowerCase())
    && !row.draftCreated;
}

function canSubmitReview(job: ImportJobSummary) {
  return String(job.processingStatus || '').toLowerCase() === 'ready_for_review'
    && (job.failureCount || 0) === 0
    && ['not_submitted', 'rejected'].includes(String(job.reviewStatus || 'not_submitted').toLowerCase());
}

export function ImportJobManagementPanel({ notify, refreshKey }: Props) {
  const workspace = useWorkspace();
  const [form] = Form.useForm<RetryFormValues>();
  const [jobs, setJobs] = useState<ImportJobSummary[]>([]);
  const [selectedJob, setSelectedJob] = useState<ImportJobDetail | null>(null);
  const [status, setStatus] = useState<string>();
  const [importType, setImportType] = useState<string>();
  const [fileFormat, setFileFormat] = useState<string>();
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
  const [reviewJob, setReviewJob] = useState<ImportJobSummary | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  function clearSelection() {
    setSelectedJob(null);
    setRows([]);
    setRowTotal(0);
    setEditingRow(null);
  }

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
      if (fileFormat) params.set('fileFormat', fileFormat);
      const page = await apiClient.get<PageResponse<ImportJobSummary>>(`/clans/${workspace.clanId}/imports?${params.toString()}`);
      setJobs(page.records || []);
      setTotal(page.total || 0);
      if (selectedJob && !(page.records || []).some(item => item.id === selectedJob.id)) clearSelection();
    } catch (error) {
      setJobs([]);
      setTotal(0);
      clearSelection();
      setErrorMessage((error as Error).message || '导入任务加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadRows(jobId: number, nextPage = rowPageNo, nextPageSize = rowPageSize) {
    if (!workspace.clanId) return;
    setRowLoading(true);
    try {
      const params = new URLSearchParams({ status: 'failed', pageNo: String(nextPage), pageSize: String(nextPageSize) });
      const page = await apiClient.get<PageResponse<ImportJobRow>>(`/clans/${workspace.clanId}/imports/${jobId}/rows?${params.toString()}`);
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

  async function refreshDetail(jobId: number) {
    if (!workspace.clanId) return null;
    const detail = await apiClient.get<ImportJobDetail>(`/clans/${workspace.clanId}/imports/${jobId}`);
    setSelectedJob(detail);
    return detail;
  }

  async function loadDetail(job: ImportJobSummary) {
    if (!workspace.clanId) return;
    setDetailLoading(true);
    setRowPageNo(1);
    setEditingRow(null);
    try {
      const detail = await refreshDetail(job.id);
      if ((detail?.failureCount || 0) > 0) await loadRows(job.id, 1, rowPageSize);
      else {
        setRows([]);
        setRowTotal(0);
      }
    } catch (error) {
      notify({ message: (error as Error).message || '导入任务详情加载失败' }, true);
    } finally {
      setDetailLoading(false);
    }
  }

  function openCorrection(row: ImportJobRow) {
    const values = row.correctedData || row.normalizedData || {};
    const type = normalizedImportType(selectedJob);
    if (type === 'relationship') {
      form.setFieldsValue({
        fromPersonCode: String(payloadValue(values, 'fromPersonCode') || ''),
        toPersonCode: String(payloadValue(values, 'toPersonCode') || ''),
        relationshipType: String(payloadValue(values, 'relationshipType') || ''),
        description: String(payloadValue(values, 'description') || '')
      });
    } else if (type === 'source') {
      form.setFieldsValue({
        sourceName: String(payloadValue(values, 'sourceName') || ''),
        sourceType: String(payloadValue(values, 'sourceType') || ''),
        providerName: String(payloadValue(values, 'providerName') || ''),
        bookTitle: String(payloadValue(values, 'bookTitle') || ''),
        volumeNo: String(payloadValue(values, 'volumeNo') || ''),
        pageNo: String(payloadValue(values, 'pageNo') || ''),
        sourceDate: String(payloadValue(values, 'sourceDate') || ''),
        collectionLocation: String(payloadValue(values, 'collectionLocation') || ''),
        sourceDescription: String(payloadValue(values, 'sourceDescription') || ''),
        excerpt: String(payloadValue(values, 'excerpt') || ''),
        confidenceLevel: String(payloadValue(values, 'confidenceLevel') || '未知'),
        privacyLevel: String(payloadValue(values, 'privacyLevel') || '宗族内'),
        sensitiveLevel: String(payloadValue(values, 'sensitiveLevel') || '普通')
      });
    } else {
      form.setFieldsValue({
        name: String(payloadValue(values, 'name') || ''),
        gender: String(payloadValue(values, 'gender') || 'unknown'),
        generationNo: typeof payloadValue(values, 'generationNo') === 'number' ? Number(payloadValue(values, 'generationNo')) : undefined,
        generationWord: String(payloadValue(values, 'generationWord') || ''),
        birthDate: String(payloadValue(values, 'birthDate') || ''),
        isLiving: payloadValue(values, 'isLiving') === undefined ? true : Boolean(payloadValue(values, 'isLiving')),
        confirmDuplicates: false
      });
    }
    setEditingRow(row);
  }

  async function retryRow() {
    if (!workspace.clanId || !selectedJob || !editingRow) return;
    const values = await form.validateFields();
    setRetryLoading(true);
    try {
      const type = normalizedImportType(selectedJob);
      const endpoint = type === 'relationship'
        ? `/clans/${workspace.clanId}/imports/${selectedJob.id}/rows/${editingRow.id}/relationship-retry`
        : type === 'source'
          ? `/clans/${workspace.clanId}/imports/${selectedJob.id}/rows/${editingRow.id}/source-retry`
          : `/clans/${workspace.clanId}/imports/${selectedJob.id}/rows/${editingRow.id}/retry`;
      const result = await apiClient.post<ImportJobRow>(endpoint, { ...values, expectedVersion: editingRow.version ?? 0 });
      if (result.rowStatus === 'draft_created') {
        notify({ message: `第 ${result.rowNo || editingRow.rowNo || '-'} 行修正成功，已生成草稿` });
        setEditingRow(null);
        form.resetFields();
      } else {
        setEditingRow(result);
        notify({ message: result.errorMessage || '修正后仍未通过校验' }, true);
      }
      await refreshDetail(selectedJob.id);
      await loadRows(selectedJob.id, rowPageNo, rowPageSize);
      await loadJobs();
    } catch (error) {
      notify({ message: (error as Error).message || '失败行重试失败' }, true);
    } finally {
      setRetryLoading(false);
    }
  }

  async function submitReview() {
    if (!workspace.clanId || !reviewJob) return;
    setReviewLoading(true);
    try {
      const task = await apiClient.post<ReviewTaskCreated>(`/clans/${workspace.clanId}/imports/${reviewJob.id}/submit-review`, { comment: reviewComment.trim() || undefined });
      if (task.id) workspace.setReviewTaskId(String(task.id));
      notify({ message: `导入批次已提交第 ${(reviewJob.reviewRound || 0) + 1} 轮审核` });
      setReviewJob(null);
      setReviewComment('');
      await refreshDetail(reviewJob.id);
      await loadJobs();
    } catch (error) {
      notify({ message: (error as Error).message || '提交审核失败' }, true);
    } finally {
      setReviewLoading(false);
    }
  }

  useEffect(() => { void loadJobs(); }, [workspace.clanId, workspace.branchId, status, importType, fileFormat, pageNo, pageSize, refreshKey]);
  useEffect(() => { if (selectedJob && (selectedJob.failureCount || 0) > 0) void loadRows(selectedJob.id, rowPageNo, rowPageSize); }, [rowPageNo, rowPageSize]);

  function renderCorrectionFields() {
    const type = normalizedImportType(selectedJob);
    if (type === 'relationship') {
      return (
        <>
          <Form.Item name="fromPersonCode" label="关系主体编码" rules={[{ required: true, message: '请输入关系主体编码' }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="toPersonCode" label="关系对象编码" rules={[{ required: true, message: '请输入关系对象编码' }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="relationshipType" label="关系类型" rules={[{ required: true, message: '请选择关系类型' }]}><Select options={relationshipTypeOptions} /></Form.Item>
          <Form.Item name="description" label="说明"><Input.TextArea maxLength={500} rows={3} showCount /></Form.Item>
        </>
      );
    }
    if (type === 'source') {
      return (
        <>
          <Form.Item name="sourceName" label="资料名称" rules={[{ required: true, message: '请输入资料名称' }]}><Input maxLength={200} /></Form.Item>
          <Form.Item name="sourceType" label="资料类型" rules={[{ required: true, message: '请选择资料类型' }]}><Select options={sourceTypeOptions} /></Form.Item>
          <Form.Item name="providerName" label="作者/编纂者"><Input maxLength={100} /></Form.Item>
          <Form.Item name="bookTitle" label="书名/题名"><Input maxLength={200} /></Form.Item>
          <Form.Item name="volumeNo" label="卷号"><Input maxLength={100} /></Form.Item>
          <Form.Item name="pageNo" label="页码"><Input maxLength={100} /></Form.Item>
          <Form.Item name="sourceDate" label="形成时间"><Input maxLength={100} /></Form.Item>
          <Form.Item name="collectionLocation" label="馆藏位置"><Input maxLength={200} /></Form.Item>
          <Form.Item name="sourceDescription" label="来源说明"><Input.TextArea maxLength={1000} rows={3} showCount /></Form.Item>
          <Form.Item name="excerpt" label="摘录内容"><Input.TextArea maxLength={5000} rows={4} showCount /></Form.Item>
          <Form.Item name="confidenceLevel" label="可信度"><Select options={confidenceOptions} /></Form.Item>
          <Form.Item name="privacyLevel" label="可见范围" rules={[{ required: true, message: '请选择可见范围' }]}><Select options={privacyOptions} /></Form.Item>
          <Form.Item name="sensitiveLevel" label="敏感级别"><Select options={sensitiveOptions} /></Form.Item>
        </>
      );
    }
    return (
      <>
        <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input maxLength={100} /></Form.Item>
        <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}><Select options={genderOptions} /></Form.Item>
        <Form.Item name="generationNo" label="代次"><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="generationWord" label="字辈"><Input maxLength={50} /></Form.Item>
        <Form.Item name="birthDate" label="出生日期"><Input type="date" /></Form.Item>
        <Form.Item name="isLiving" valuePropName="checked"><Checkbox>在世</Checkbox></Form.Item>
        <Form.Item name="confirmDuplicates" valuePropName="checked"><Checkbox>如修正后命中疑似重复人物，我已确认仍需生成草稿</Checkbox></Form.Item>
      </>
    );
  }

  return (
    <>
      <Card title="导入任务" style={{ marginTop: 16 }} extra={<Button loading={loading} onClick={() => void loadJobs()}>刷新</Button>}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select allowClear placeholder="全部状态" value={status} options={statusOptions} style={{ width: 150 }} onChange={value => { setStatus(value); setPageNo(1); clearSelection(); }} />
          <Select allowClear placeholder="全部业务类型" value={importType} options={importTypeOptions} style={{ width: 180 }} onChange={value => { setImportType(value); setPageNo(1); clearSelection(); }} />
          <Select allowClear placeholder="全部文件格式" value={fileFormat} options={[...importFileFormatOptions]} style={{ width: 160 }} onChange={value => { setFileFormat(value); setPageNo(1); clearSelection(); }} />
          <Typography.Text type="secondary">{workspace.branchId ? '当前仅显示所选支派的导入任务' : '当前显示全宗族导入任务'}</Typography.Text>
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
            onChange: (nextPage, nextPageSize) => { setPageNo(nextPageSize === pageSize ? nextPage : 1); setPageSize(nextPageSize); clearSelection(); }
          }}
          columns={[
            { key: 'importType', title: '业务类型', width: 130, render: (_value, row) => importTypeText(row.importType || row.legacyImportType) },
            { key: 'fileFormat', title: '文件格式', width: 100, render: (_value, row) => importFileFormatText(row.fileFormat, row.legacyImportType) },
            { key: 'originalFilename', title: '文件名', dataIndex: 'originalFilename', ellipsis: true },
            { key: 'totalCount', title: '总数', dataIndex: 'totalCount', width: 72 },
            { key: 'successCount', title: '草稿', dataIndex: 'successCount', width: 72 },
            { key: 'failureCount', title: '待修正', dataIndex: 'failureCount', width: 88 },
            { key: 'processingStatus', title: '处理状态', width: 115, render: (_value, row) => <Tag color={processingStatusColor(row)}>{processingStatusText(row)}</Tag> },
            { key: 'reviewStatus', title: '审核状态', width: 105, render: (_value, row) => <Tag color={reviewStatusColor(row.reviewStatus)}>{reviewStatusText(row.reviewStatus)}</Tag> },
            { key: 'createdAt', title: '创建时间', width: 170, render: (_value, row) => formatDateTime(row.createdAt) },
            {
              key: 'actions',
              title: '操作',
              width: 110,
              render: (_value, row) => (
                <Space onClick={event => event.stopPropagation()}>
                  <Button size="small" type="primary" disabled={!canSubmitReview(row)} onClick={() => { setReviewJob(row); setReviewComment(''); }}>
                    {row.reviewStatus === 'rejected' ? '重新提交' : '提交审核'}
                  </Button>
                </Space>
              )
            }
          ]}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {selectedJob ? (
        <Card title={`批次处理 · ${selectedJob.originalFilename || importTypeText(selectedJob.importType)}`} loading={detailLoading} style={{ marginTop: 16 }} extra={canSubmitReview(selectedJob) ? <Button type="primary" onClick={() => { setReviewJob(selectedJob); setReviewComment(''); }}>{selectedJob.reviewStatus === 'rejected' ? '修正后重新提交' : '提交审核'}</Button> : null}>
          <Space wrap style={{ marginBottom: 12 }}>
            <Tag>{importTypeText(selectedJob.importType || selectedJob.legacyImportType)}</Tag>
            <Tag>{importFileFormatText(selectedJob.fileFormat, selectedJob.legacyImportType)}</Tag>
            <Tag color={processingStatusColor(selectedJob)}>{processingStatusText(selectedJob)}</Tag>
            <Tag color={reviewStatusColor(selectedJob.reviewStatus)}>{reviewStatusText(selectedJob.reviewStatus)}</Tag>
            {(selectedJob.reviewRound || 0) > 0 ? <Typography.Text type="secondary">已提交 {selectedJob.reviewRound} 轮</Typography.Text> : null}
          </Space>
          <Alert
            type={(selectedJob.failureCount || 0) > 0 ? 'warning' : selectedJob.reviewStatus === 'approved' ? 'success' : 'info'}
            showIcon
            message={selectedJob.errorSummary || (selectedJob.reviewStatus === 'approved' ? '审核已通过，批次数据已正式生效。' : selectedJob.reviewStatus === 'pending' ? '批次正在审核中，暂不能继续修改。' : selectedJob.reviewStatus === 'rejected' ? '批次已驳回，可按审核意见调整后重新提交。' : '全部数据已生成草稿，可以提交审核。')}
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
              pagination={{ current: rowPageNo, pageSize: rowPageSize, total: rowTotal, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: value => `共 ${value} 条待修正数据`, onChange: (nextPage, nextPageSize) => { setRowPageNo(nextPageSize === rowPageSize ? nextPage : 1); setRowPageSize(nextPageSize); } }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有待修正数据" /> }}
              columns={[
                { key: 'rowNo', title: '行号', dataIndex: 'rowNo', width: 80 },
                { key: 'rowStatus', title: '状态', width: 120, render: (_value, row) => <Tag color={rowStatusColor(row.rowStatus)}>{rowStatusText(row.rowStatus)}</Tag> },
                { key: 'errorMessage', title: '错误原因', dataIndex: 'errorMessage', width: 280 },
                { key: 'rawData', title: '原始数据', dataIndex: 'rawData', ellipsis: true },
                { key: 'retryCount', title: '重试次数', dataIndex: 'retryCount', width: 100 },
                { key: 'action', title: '操作', width: 100, render: (_value, row) => <Button size="small" type="primary" disabled={!retryable(row, selectedJob)} onClick={() => openCorrection(row)}>修正</Button> }
              ]}
              scroll={{ x: 'max-content' }}
            />
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={selectedJob.reviewStatus === 'approved' ? '批次已正式生效' : '当前批次没有失败行'} />}
        </Card>
      ) : null}

      <Modal title={`修正导入数据${editingRow?.rowNo ? ` · 第 ${editingRow.rowNo} 行` : ''}`} open={Boolean(editingRow)} confirmLoading={retryLoading} okText="保存并重试" cancelText="取消" onOk={() => void retryRow()} onCancel={() => { setEditingRow(null); form.resetFields(); }} destroyOnHidden>
        {editingRow ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert type="info" showIcon message="原始数据仅作对照；保存后将使用对应业务类型的修正规则重新校验，不会修改原始导入记录。" />
            <Typography.Paragraph type="secondary" copyable={{ text: editingRow.rawData || '' }}>原始数据：{editingRow.rawData || '-'}</Typography.Paragraph>
            {editingRow.errorMessage ? <Alert type="error" showIcon message={editingRow.errorMessage} /> : null}
            <Form form={form} layout="vertical">{renderCorrectionFields()}</Form>
          </Space>
        ) : null}
      </Modal>

      <Modal title={reviewJob?.reviewStatus === 'rejected' ? '重新提交导入批次审核' : '提交导入批次审核'} open={Boolean(reviewJob)} confirmLoading={reviewLoading} okText="确认提交" cancelText="取消" onOk={() => void submitReview()} onCancel={() => { setReviewJob(null); setReviewComment(''); }} destroyOnHidden>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert type="info" showIcon message="提交后，批次草稿将锁定，审核通过后统一正式生效；提交人不能审核自己的批次。" />
          <Typography.Text>业务类型：{importTypeText(reviewJob?.importType || reviewJob?.legacyImportType)}</Typography.Text>
          <Typography.Text>文件：{reviewJob?.originalFilename || '-'}</Typography.Text>
          <Typography.Text>草稿数据：{reviewJob?.successCount || 0} 条</Typography.Text>
          <Input.TextArea value={reviewComment} maxLength={500} showCount rows={4} placeholder="填写本轮审核说明（可选）" onChange={event => setReviewComment(event.target.value)} />
        </Space>
      </Modal>
    </>
  );
}
