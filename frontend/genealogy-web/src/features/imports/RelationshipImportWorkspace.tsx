import { useEffect, useState } from 'react';
import { Alert, Button, Card, Collapse, Empty, Space, Table, Tag, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { apiClient } from '../../shared/api/client';
import { saveDownloadedBlob } from '../../shared/utils/download';
import type { ImportWorkspaceProgress } from './import-workspace-progress';

const { Dragger } = Upload;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

type Props = {
  notify: (data: unknown, error?: boolean) => void;
  clanId: string;
  branchId: string;
  branchName: string;
  onBatchCreated: () => void;
  onProgressChange?: (progress: ImportWorkspaceProgress) => void;
};

type ImportJobResult = { id?: number; totalCount?: number; successCount?: number; failureCount?: number };
type PreviewRow = {
  rowNo?: number;
  fromPersonCode?: string;
  fromPersonName?: string;
  toPersonCode?: string;
  toPersonName?: string;
  relationshipType?: string;
  description?: string;
  duplicated?: boolean;
  errorMessage?: string;
};
type ImportPreview = { totalCount?: number; validCount?: number; duplicateCount?: number; errorCount?: number; rows?: PreviewRow[] };
type TemplateFormat = 'csv' | 'xlsx';

export function RelationshipImportWorkspace({ notify, clanId, branchId, branchName, onBatchCreated, onProgressChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [templateDownloading, setTemplateDownloading] = useState<TemplateFormat>();
  const [previewing, setPreviewing] = useState(false);
  const [batchCreating, setBatchCreating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const branchSelected = Boolean(branchId);

  function publishProgress(nextFile: File | null, nextPreview: ImportPreview | null, batchCreated = false) {
    onProgressChange?.({ hasFile: Boolean(nextFile), previewReady: Boolean(nextPreview), batchCreated });
  }

  useEffect(() => {
    setFile(null);
    setPreview(null);
    setValidationMessage('');
    publishProgress(null, null);
  }, [branchId]);

  async function downloadTemplate(format: TemplateFormat) {
    if (templateDownloading) return;
    setTemplateDownloading(format);
    try {
      const blob = await apiClient.download(`/imports/templates/relationships.${format}`);
      saveDownloadedBlob(blob, `relationship-import-template.${format}`);
      notify({ message: `人物关系导入 ${format.toUpperCase()} 模板已下载` });
    } catch (error) {
      notify({ message: (error as Error).message || '人物关系导入模板下载失败' }, true);
    } finally {
      setTemplateDownloading(undefined);
    }
  }

  function query() {
    return new URLSearchParams({ branchId }).toString();
  }

  function inputError() {
    if (!clanId) return '请先在应用顶部选择所属宗族。';
    if (!branchId) return '请先选择导入批次管理支派。';
    if (!file) return '请上传填写后的 CSV 或 XLSX 标准模板。';
    return '';
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
      const result = await apiClient.upload<ImportPreview>(`/clans/${clanId}/imports/relationships/preview?${query()}`, formData);
      setPreview(result);
      publishProgress(file, result);
      notify({ message: `预检完成：有效 ${result.validCount || 0} 行，重复 ${result.duplicateCount || 0} 行，错误 ${result.errorCount || 0} 行` });
      return result;
    } catch (error) {
      setValidationMessage((error as Error).message || '人物关系导入预检失败，请检查模板后重试。');
      setPreview(null);
      publishProgress(file, null);
      return null;
    } finally {
      setPreviewing(false);
    }
  }

  async function upload() {
    if (previewing || batchCreating) return;
    const error = inputError();
    if (error) { setValidationMessage(error); return; }
    const effectivePreview = preview || await previewFile();
    if (!effectivePreview) return;
    if ((effectivePreview.errorCount || 0) > 0) {
      setValidationMessage(`存在 ${effectivePreview.errorCount} 条阻断错误，请修正文件并重新预检。`);
      return;
    }
    setBatchCreating(true);
    setValidationMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await apiClient.upload<ImportJobResult>(`/clans/${clanId}/imports/relationships?${query()}`, formData);
      notify({ message: (result.failureCount || 0) > 0 ? `关系导入批次已创建：成功 ${result.successCount || 0} 行，待修正 ${result.failureCount || 0} 行` : `关系导入完成：${result.successCount || 0} 行已生成草稿，等待提交审核` });
      setFile(null);
      setPreview(null);
      publishProgress(null, null, true);
      onBatchCreated();
    } catch (error) {
      setValidationMessage((error as Error).message || '人物关系导入失败，当前文件和预检结果已保留。');
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
      setValidationMessage('');
      publishProgress(nextFile, null);
      return false;
    },
    onRemove: () => { setFile(null); setPreview(null); setValidationMessage(''); publishProgress(null, null); return true; },
    fileList: file ? [{ uid: `${file.name}-${file.lastModified}`, name: file.name, size: file.size, status: 'done' }] : []
  };

  return (
    <div className="relationship-import-workspace">
      <Card title="人物关系导入" extra={<Space wrap><Button loading={templateDownloading === 'csv'} disabled={Boolean(templateDownloading)} onClick={() => void downloadTemplate('csv')}>下载 CSV 模板</Button><Button loading={templateDownloading === 'xlsx'} disabled={Boolean(templateDownloading)} onClick={() => void downloadTemplate('xlsx')}>下载 XLSX 模板</Button></Space>}>
        <Space direction="vertical" size="middle" className="import-workbench-stack">
          <Alert type="info" showIcon message="模板要求" description="支持 CSV、XLSX；最大 20 MB；CSV 使用 UTF-8 编码；请使用当前页面下载的最新模板。" />
          <Collapse ghost size="small" items={[{ key: 'guide', label: '查看字段填写说明', children: <Typography.Paragraph type="secondary" className="import-guide-text">使用人物业务编码建立关系。表头依次为关系主体编码、关系对象编码、关系类型、说明；关系类型支持父子、母子、配偶。</Typography.Paragraph> }]} />
          {!branchSelected ? <Alert type="warning" showIcon message="请先选择批次管理支派" /> : <Typography.Text type="secondary">批次管理支派：{branchName || '未命名支派'}</Typography.Text>}
          {validationMessage ? <Alert type="error" showIcon message={validationMessage} closable onClose={() => setValidationMessage('')} /> : null}
          <Dragger {...uploadProps}><Typography.Text strong>拖拽文件到此处，或点击选择文件</Typography.Text><Typography.Paragraph type="secondary">选择文件后不会自动提交，需先完成数据预检。</Typography.Paragraph></Dragger>
          <Space wrap><Button disabled={!file || !branchSelected || batchCreating} loading={previewing} onClick={() => void previewFile()}>预览并校验</Button><Button type="primary" disabled={!preview || (preview.errorCount || 0) > 0 || previewing || batchCreating} loading={batchCreating} onClick={() => void upload()}>创建导入批次</Button></Space>
        </Space>
      </Card>
      {preview ? <Card title="人物关系导入预检"><Space direction="vertical" size="middle" className="import-workbench-stack">{(preview.errorCount || 0) > 0 ? <Alert type="error" showIcon message={`存在 ${preview.errorCount} 条阻断错误，修正并重新预检后才能创建批次。`} /> : null}<Space wrap><Tag color="success">有效 {preview.validCount || 0}</Tag><Tag color="warning">重复 {preview.duplicateCount || 0}</Tag><Tag color="error">错误 {preview.errorCount || 0}</Tag></Space><Table<PreviewRow> size="middle" rowKey={(row, index) => String(row.rowNo || index)} dataSource={preview.rows || []} pagination={{ pageSize: 20, showSizeChanger: true }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无预检数据" /> }} columns={[{ key: 'rowNo', title: '行号', dataIndex: 'rowNo', width: 70 }, { key: 'fromPersonCode', title: '主体编码', dataIndex: 'fromPersonCode' }, { key: 'fromPersonName', title: '主体人物', dataIndex: 'fromPersonName' }, { key: 'toPersonCode', title: '对象编码', dataIndex: 'toPersonCode' }, { key: 'toPersonName', title: '对象人物', dataIndex: 'toPersonName' }, { key: 'relationshipType', title: '关系类型', dataIndex: 'relationshipType' }, { key: 'result', title: '校验结果', render: (_value, row) => row.errorMessage ? <Tag color={row.duplicated ? 'warning' : 'error'}>{row.duplicated ? '重复' : '错误'}</Tag> : <Tag color="success">有效</Tag> }, { key: 'errorMessage', title: '问题说明', dataIndex: 'errorMessage' }]} scroll={{ x: 900 }} /></Space></Card> : null}
    </div>
  );
}
