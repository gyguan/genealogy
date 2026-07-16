import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Collapse, Empty, Segmented, Space, Table, Tag, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../shared/api/client';
import { saveDownloadedBlob } from '../../shared/utils/download';
import type { ImportWorkspaceProgress } from './import-workspace-progress';
import {
  filterImportPreviewRows,
  importPreviewCounts,
  importPreviewMessage,
  importValidationStatus,
  type ImportPreviewResult,
  type ImportPreviewRowBase,
  type ImportValidationStatus
} from './import-preview-model';

const { Dragger } = Upload;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const TEMPLATE_VERSION = '2026.07';
const TEMPLATE_UPDATED_AT = '2026-07-16';

type TemplateFormat = 'csv' | 'xlsx';
type PreviewFilter = 'all' | ImportValidationStatus;
type ImportJobResult = {
  successCount?: number;
  failureCount?: number;
  executionMode?: string;
  executionStatus?: string;
};

export type StandardImportWorkspaceProps<Row extends ImportPreviewRowBase> = {
  notify: (data: unknown, error?: boolean) => void;
  clanId: string;
  branchId: string;
  branchName: string;
  onBatchCreated: () => void;
  onProgressChange?: (progress: ImportWorkspaceProgress) => void;
  title: string;
  objectName: string;
  targetLabel: string;
  templateSlug: string;
  previewPath: (clanId: string) => string;
  createPath: (clanId: string) => string;
  guide: string;
  columns: ColumnsType<Row>;
};

function statusTag(status: ImportValidationStatus) {
  const config = {
    valid: { color: 'success', text: '有效' },
    warning: { color: 'warning', text: '警告' },
    duplicate: { color: 'warning', text: '疑似重复' },
    error: { color: 'error', text: '错误' }
  }[status];
  return <Tag color={config.color}>{config.text}</Tag>;
}

function columnValue<Row extends ImportPreviewRowBase>(row: Row, dataIndex: unknown) {
  const key = Array.isArray(dataIndex) ? dataIndex.join('.') : String(dataIndex || '');
  return key ? (row as unknown as Record<string, unknown>)[key] : undefined;
}

export function StandardImportWorkspace<Row extends ImportPreviewRowBase>(props: StandardImportWorkspaceProps<Row>) {
  const {
    notify, clanId, branchId, branchName, onBatchCreated, onProgressChange,
    title, objectName, targetLabel, templateSlug, previewPath, createPath, guide, columns
  } = props;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult<Row> | null>(null);
  const [duplicatesConfirmed, setDuplicatesConfirmed] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState<TemplateFormat>();
  const [previewing, setPreviewing] = useState(false);
  const [batchCreating, setBatchCreating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('all');
  const branchSelected = Boolean(branchId);

  function publishProgress(nextFile: File | null, nextPreview: ImportPreviewResult<Row> | null) {
    onProgressChange?.({ hasFile: Boolean(nextFile), previewReady: Boolean(nextPreview), batchCreated: false });
  }

  function resetSelection() {
    setFile(null);
    setPreview(null);
    setDuplicatesConfirmed(false);
    setPreviewFilter('all');
    setValidationMessage('');
    publishProgress(null, null);
  }

  useEffect(() => { resetSelection(); }, [clanId, branchId]);

  const counts = useMemo(() => importPreviewCounts(preview), [preview]);
  const filteredRows = useMemo(() => filterImportPreviewRows(preview?.rows, previewFilter), [preview, previewFilter]);

  async function downloadTemplate(format: TemplateFormat) {
    if (templateDownloading) return;
    setTemplateDownloading(format);
    try {
      const blob = await apiClient.download(`/imports/templates/${templateSlug}.${format}`);
      saveDownloadedBlob(blob, `${templateSlug}-import-template-${TEMPLATE_VERSION}.${format}`);
      notify({ message: `${title} ${format.toUpperCase()} 模板已下载` });
    } catch (error) {
      notify({ message: (error as Error).message || `${title}模板下载失败` }, true);
    } finally {
      setTemplateDownloading(undefined);
    }
  }

  function inputError() {
    if (!clanId) return '请先在应用顶部选择所属宗族。';
    if (!branchId) return `请先选择${targetLabel}。`;
    if (!file) return '请上传填写后的 CSV 或 XLSX 标准模板。';
    return '';
  }

  function query(includeDuplicateConfirmation = false) {
    const params = new URLSearchParams({ branchId, templateVersion: TEMPLATE_VERSION });
    if (includeDuplicateConfirmation) params.set('confirmDuplicates', String(duplicatesConfirmed));
    return params.toString();
  }

  async function previewFile() {
    if (previewing || batchCreating) return null;
    const error = inputError();
    if (error) { setValidationMessage(error); return null; }
    setPreviewing(true);
    setValidationMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await apiClient.upload<ImportPreviewResult<Row>>(`${previewPath(clanId)}?${query()}`, formData);
      if (result.templateVersion && result.templateVersion !== TEMPLATE_VERSION) {
        setPreview(null);
        publishProgress(file, null);
        setValidationMessage(`模板版本不兼容：当前要求 ${TEMPLATE_VERSION}，文件识别为 ${result.templateVersion}。请重新下载模板。`);
        return null;
      }
      const nextCounts = importPreviewCounts(result);
      setPreview(result);
      setDuplicatesConfirmed(false);
      setPreviewFilter(nextCounts.error ? 'error' : nextCounts.duplicate ? 'duplicate' : nextCounts.warning ? 'warning' : 'all');
      publishProgress(file, result);
      notify({ message: `预检完成：有效 ${nextCounts.valid} 行，警告 ${nextCounts.warning} 行，疑似重复 ${nextCounts.duplicate} 行，错误 ${nextCounts.error} 行` });
      return result;
    } catch (error) {
      setValidationMessage((error as Error).message || `${title}预检失败，请检查模板版本和内容后重试。`);
      setPreview(null);
      publishProgress(file, null);
      return null;
    } finally {
      setPreviewing(false);
    }
  }

  async function createBatch() {
    if (previewing || batchCreating) return;
    const error = inputError();
    if (error) { setValidationMessage(error); return; }
    const effectivePreview = preview || await previewFile();
    if (!effectivePreview) return;
    const nextCounts = importPreviewCounts(effectivePreview);
    if (nextCounts.error > 0) {
      setValidationMessage(`存在 ${nextCounts.error} 条阻断错误，请修正文件并重新预检。`);
      return;
    }
    if (nextCounts.duplicate > 0 && !duplicatesConfirmed) {
      setValidationMessage(`存在 ${nextCounts.duplicate} 条疑似重复${objectName}，请核对并确认后再创建批次。`);
      return;
    }
    setBatchCreating(true);
    setValidationMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await apiClient.upload<ImportJobResult>(`${createPath(clanId)}?${query(true)}`, formData);
      const asyncQueued = result.executionMode === 'async'
        || ['queued', 'running', 'retry_wait'].includes(String(result.executionStatus || '').toLowerCase());
      notify({
        message: asyncQueued
          ? '导入批次已创建，可在“执行任务”中查看后台进度。'
          : (result.failureCount || 0) > 0
            ? `导入批次已创建：成功 ${result.successCount || 0} 行，待修正 ${result.failureCount || 0} 行`
            : `导入完成：${result.successCount || 0} 行已生成草稿，等待提交审核`
      });
      resetSelection();
      onBatchCreated();
    } catch (error) {
      setValidationMessage((error as Error).message || `创建${title}批次失败，当前文件和预检结果已保留。`);
    } finally {
      setBatchCreating(false);
    }
  }

  const uploadProps: UploadProps = {
    maxCount: 1,
    accept: '.csv,.xlsx',
    disabled: !branchSelected || previewing || batchCreating,
    beforeUpload: nextFile => {
      const filename = nextFile.name.toLowerCase();
      if (!filename.endsWith('.csv') && !filename.endsWith('.xlsx')) { setValidationMessage('只支持 CSV 或 XLSX 标准模板。'); return Upload.LIST_IGNORE; }
      if (nextFile.size <= 0) { setValidationMessage('文件内容为空，请重新选择。'); return Upload.LIST_IGNORE; }
      if (nextFile.size > MAX_FILE_SIZE) { setValidationMessage('文件不能超过 20 MB，请拆分后重新上传。'); return Upload.LIST_IGNORE; }
      setFile(nextFile);
      setPreview(null);
      setDuplicatesConfirmed(false);
      setPreviewFilter('all');
      setValidationMessage('');
      publishProgress(nextFile, null);
      return false;
    },
    onRemove: () => { resetSelection(); return true; },
    fileList: file ? [{ uid: `${file.name}-${file.lastModified}`, name: file.name, size: file.size, status: 'done' }] : []
  };

  const previewColumns: ColumnsType<Row> = [
    ...columns,
    { key: 'validationStatus', title: '预检结果', width: 110, render: (_value, row) => statusTag(importValidationStatus(row)) },
    { key: 'validationMessage', title: '问题说明', render: (_value, row) => importPreviewMessage(row) || '-' }
  ];

  return (
    <div className="standard-import-workspace">
      <Card title={title} extra={<Space wrap><Button loading={templateDownloading === 'csv'} disabled={Boolean(templateDownloading)} onClick={() => void downloadTemplate('csv')}>下载 CSV 模板</Button><Button loading={templateDownloading === 'xlsx'} disabled={Boolean(templateDownloading)} onClick={() => void downloadTemplate('xlsx')}>下载 XLSX 模板</Button></Space>}>
        <Space direction="vertical" size="middle" className="import-workbench-stack">
          <Alert type="info" showIcon message={`模板版本：${TEMPLATE_VERSION}`} description={`更新时间：${TEMPLATE_UPDATED_AT}；格式：CSV / XLSX；CSV 编码：UTF-8；最大文件：20 MB。模板版本变化后必须重新上传并预检。`} />
          <Collapse ghost size="small" items={[{ key: 'guide', label: '查看字段填写说明', children: <Typography.Paragraph type="secondary" className="import-guide-text">{guide}</Typography.Paragraph> }]} />
          {!branchSelected ? <Alert type="warning" showIcon message={`请先选择${targetLabel}`} /> : <Typography.Text type="secondary">{targetLabel}：{branchName || '未命名支派'}</Typography.Text>}
          {validationMessage ? <Alert type="error" showIcon message={validationMessage} closable onClose={() => setValidationMessage('')} /> : null}
          <Dragger {...uploadProps} className="import-upload-dragger"><Typography.Text strong>拖拽文件到此处，或点击选择文件</Typography.Text><Typography.Paragraph type="secondary">选择文件后不会自动提交，需先完成数据预检。</Typography.Paragraph></Dragger>
          <Space wrap><Button disabled={!file || !branchSelected || batchCreating} loading={previewing} onClick={() => void previewFile()}>预览并校验</Button><Button type="primary" disabled={!preview || counts.error > 0 || (counts.duplicate > 0 && !duplicatesConfirmed) || previewing || batchCreating} loading={batchCreating} onClick={() => void createBatch()}>创建导入批次</Button></Space>
        </Space>
      </Card>

      {preview ? <Card title={`${title}预检结果`}>
        <Space direction="vertical" size="middle" className="import-workbench-stack">
          <Segmented value={previewFilter} onChange={value => setPreviewFilter(value as PreviewFilter)} options={[
            { value: 'all', label: `全部 ${counts.total}` },
            { value: 'valid', label: `有效 ${counts.valid}` },
            { value: 'warning', label: `警告 ${counts.warning}` },
            { value: 'duplicate', label: `疑似重复 ${counts.duplicate}` },
            { value: 'error', label: `错误 ${counts.error}` }
          ]} />
          {counts.error > 0 ? <Alert type="error" showIcon message={`存在 ${counts.error} 条阻断错误，修正并重新预检后才能创建批次。`} /> : null}
          {counts.duplicate > 0 ? <Checkbox checked={duplicatesConfirmed} onChange={event => { setDuplicatesConfirmed(event.target.checked); setValidationMessage(''); }}>我已核对疑似重复{objectName}，确认仍继续创建导入批次</Checkbox> : null}
          <div className="import-preview-table"><Table<Row> size="middle" rowKey={(row, index) => String(row.rowNo || index)} dataSource={filteredRows} pagination={{ pageSize: 20, showSizeChanger: true, showTotal: total => `共 ${total} 条` }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前分类暂无数据" /> }} columns={previewColumns} scroll={{ x: 900 }} /></div>
          <div className="import-preview-card-list">{filteredRows.map((row, index) => <Card key={String(row.rowNo || index)} size="small" title={`第 ${row.rowNo || index + 1} 行`} extra={statusTag(importValidationStatus(row))}><Space direction="vertical" size={4}>{columns.slice(0, 4).map(column => { const value = columnValue(row, column.dataIndex); const key = String(column.key || column.dataIndex || 'field'); return value === undefined ? null : <Typography.Text key={key}><strong>{String(column.title)}：</strong>{String(value || '-')}</Typography.Text>; })}{importPreviewMessage(row) ? <Typography.Text type="danger">{importPreviewMessage(row)}</Typography.Text> : null}</Space></Card>)}</div>
        </Space>
      </Card> : null}
    </div>
  );
}
