import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Collapse, Empty, Segmented, Space, Table, Tag, Typography, Upload } from 'antd';
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

type ImportJobResult = {
  id?: number;
  totalCount?: number;
  successCount?: number;
  failureCount?: number;
  status?: string;
  executionMode?: string;
  executionStatus?: string;
};

type PreviewRow = {
  rowNo?: number;
  name?: string;
  gender?: string;
  generationNo?: number;
  generationWord?: string;
  branchId?: number;
  birthDate?: string;
  isLiving?: boolean;
  duplicated?: boolean;
  duplicateCount?: number;
  errorMessage?: string;
  rawData?: string;
};

type ImportPreview = {
  totalCount?: number;
  validCount?: number;
  duplicateCount?: number;
  errorCount?: number;
  rows?: PreviewRow[];
};

type TemplateFormat = 'csv' | 'xlsx';
type PreviewFilter = 'all' | 'valid' | 'warning' | 'duplicate' | 'error';

function genderText(value?: string) {
  const dict: Record<string, string> = { male: '男', female: '女', unknown: '未知' };
  return dict[value || ''] || value || '-';
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function PersonImportWorkspace({
  notify,
  clanId,
  branchId,
  branchName,
  onBatchCreated,
  onProgressChange
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [confirmDuplicates, setConfirmDuplicates] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [templateDownloading, setTemplateDownloading] = useState<TemplateFormat>();
  const [previewing, setPreviewing] = useState(false);
  const [batchCreating, setBatchCreating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('all');
  const branchSelected = Boolean(branchId);

  function publishProgress(nextFile: File | null, nextPreview: ImportPreview | null, batchCreated = false) {
    onProgressChange?.({
      hasFile: Boolean(nextFile),
      previewReady: Boolean(nextPreview),
      batchCreated
    });
  }

  useEffect(() => {
    setFile(null);
    setPreview(null);
    setConfirmDuplicates(false);
    setValidationMessage('');
    setPreviewFilter('all');
    publishProgress(null, null);
  }, [branchId]);

  const warningCount = Math.max(
    0,
    Number(preview?.totalCount || 0)
      - Number(preview?.validCount || 0)
      - Number(preview?.duplicateCount || 0)
      - Number(preview?.errorCount || 0)
  );

  const filteredRows = useMemo(() => {
    const rows = preview?.rows || [];
    if (previewFilter === 'all') return rows;
    if (previewFilter === 'error') return rows.filter(row => Boolean(row.errorMessage) && !row.duplicated);
    if (previewFilter === 'duplicate') return rows.filter(row => Boolean(row.duplicated));
    if (previewFilter === 'valid') return rows.filter(row => !row.errorMessage && !row.duplicated);
    return rows.filter(row => !row.errorMessage && !row.duplicated && Boolean(row.rawData));
  }, [preview, previewFilter]);

  async function downloadTemplate(format: TemplateFormat) {
    if (templateDownloading) return;
    setTemplateDownloading(format);
    try {
      const blob = await apiClient.download(`/imports/templates/persons.${format}`);
      saveDownloadedBlob(blob, `person-import-template.${format}`);
      notify({ message: `人物导入 ${format.toUpperCase()} 模板已下载` });
    } catch (error) {
      notify({ message: (error as Error).message || '导入模板下载失败' }, true);
    } finally {
      setTemplateDownloading(undefined);
    }
  }

  function requestQuery(includeDuplicateConfirmation = false) {
    const params = new URLSearchParams({ branchId });
    if (includeDuplicateConfirmation) params.set('confirmDuplicates', String(confirmDuplicates));
    return params.toString();
  }

  function validateCurrentInput() {
    if (!clanId) return '请先在应用顶部选择所属宗族。';
    if (!branchId) return '请先在本页选择目标支派。';
    if (!file) return '请上传填写后的 CSV 或 XLSX 标准模板。';
    return '';
  }

  async function previewFile() {
    if (previewing || batchCreating) return null;
    const inputError = validateCurrentInput();
    if (inputError) {
      setValidationMessage(inputError);
      return null;
    }

    setPreviewing(true);
    setValidationMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await apiClient.upload<ImportPreview>(
        `/clans/${clanId}/imports/persons/preview?${requestQuery()}`,
        formData
      );
      setPreview(result);
      setConfirmDuplicates(false);
      setPreviewFilter((result.errorCount || 0) > 0 ? 'error' : (result.duplicateCount || 0) > 0 ? 'duplicate' : 'all');
      publishProgress(file, result);
      notify({ message: `预检完成：有效 ${result.validCount || 0} 行，疑似重复 ${result.duplicateCount || 0} 行，错误 ${result.errorCount || 0} 行` });
      return result;
    } catch (error) {
      setValidationMessage((error as Error).message || '导入预检失败，请检查模板后重试。');
      setPreview(null);
      publishProgress(file, null);
      return null;
    } finally {
      setPreviewing(false);
    }
  }

  async function upload() {
    if (batchCreating || previewing) return;
    const inputError = validateCurrentInput();
    if (inputError) {
      setValidationMessage(inputError);
      return;
    }

    const effectivePreview = preview || await previewFile();
    if (!effectivePreview) return;
    if ((effectivePreview.errorCount || 0) > 0) {
      setValidationMessage(`存在 ${effectivePreview.errorCount} 条阻断错误，请修正文件并重新预检后再创建批次。`);
      return;
    }
    if ((effectivePreview.duplicateCount || 0) > 0 && !confirmDuplicates) {
      setValidationMessage('存在疑似重复人物，请核对重复明细并勾选确认后再创建批次。');
      return;
    }

    setBatchCreating(true);
    setValidationMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await apiClient.upload<ImportJobResult>(
        `/clans/${clanId}/imports/persons.csv?${requestQuery(true)}`,
        formData
      );
      const asyncQueued = result.executionMode === 'async'
        || ['queued', 'running', 'retry_wait'].includes(String(result.executionStatus || '').toLowerCase());
      const failureCount = result.failureCount || 0;
      notify({
        message: asyncQueued
          ? '导入批次已创建，可在“执行任务”中查看后台进度。'
          : failureCount > 0
            ? `导入批次已创建：成功 ${result.successCount || 0} 行，待修正 ${failureCount} 行`
            : `导入完成：${result.successCount || 0} 行已生成草稿，等待提交审核`
      });
      setPreview(null);
      setFile(null);
      setConfirmDuplicates(false);
      setPreviewFilter('all');
      publishProgress(null, null, true);
      onBatchCreated();
    } catch (error) {
      setValidationMessage((error as Error).message || '创建导入批次失败，当前文件和预检结果已保留。');
    } finally {
      setBatchCreating(false);
    }
  }

  function downloadErrorRows() {
    const rows = (preview?.rows || []).filter(row => row.errorMessage);
    if (!rows.length) return;
    const header = ['行号', '姓名', '性别', '代次', '字辈', '出生日期', '错误原因'];
    const content = [
      header.map(csvCell).join(','),
      ...rows.map(row => [row.rowNo, row.name, genderText(row.gender), row.generationNo, row.generationWord, row.birthDate, row.errorMessage].map(csvCell).join(','))
    ].join('\n');
    saveDownloadedBlob(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }), 'person-import-errors.csv');
  }

  const uploadProps: UploadProps = {
    maxCount: 1,
    accept: '.csv,.xlsx',
    disabled: !branchSelected || previewing || batchCreating,
    beforeUpload: nextFile => {
      const filename = nextFile.name.toLowerCase();
      if (!filename.endsWith('.csv') && !filename.endsWith('.xlsx')) {
        setValidationMessage('只支持上传系统提供的 CSV 或 XLSX 模板。');
        return Upload.LIST_IGNORE;
      }
      if (nextFile.size <= 0) {
        setValidationMessage('文件内容为空，请重新选择。');
        return Upload.LIST_IGNORE;
      }
      if (nextFile.size > MAX_FILE_SIZE) {
        setValidationMessage('文件不能超过 20 MB，请拆分后重新上传。');
        return Upload.LIST_IGNORE;
      }
      setFile(nextFile);
      setPreview(null);
      setConfirmDuplicates(false);
      setPreviewFilter('all');
      setValidationMessage('');
      publishProgress(nextFile, null);
      return false;
    },
    onRemove: () => {
      setFile(null);
      setPreview(null);
      setConfirmDuplicates(false);
      setPreviewFilter('all');
      setValidationMessage('');
      publishProgress(null, null);
      return true;
    },
    fileList: file ? [{ uid: `${file.name}-${file.lastModified}`, name: file.name, size: file.size, status: 'done' }] : []
  };

  return (
    <div className="person-import-workspace">
      <Card
        title="人物导入"
        extra={(
          <Space wrap>
            <Button loading={templateDownloading === 'csv'} disabled={Boolean(templateDownloading)} onClick={() => void downloadTemplate('csv')}>下载 CSV 模板</Button>
            <Button loading={templateDownloading === 'xlsx'} disabled={Boolean(templateDownloading)} onClick={() => void downloadTemplate('xlsx')}>下载 XLSX 模板</Button>
          </Space>
        )}
      >
        <Space direction="vertical" size="middle" className="import-workbench-stack">
          <Alert
            type="info"
            showIcon
            message="模板要求"
            description="支持 CSV、XLSX；最大 20 MB；CSV 使用 UTF-8 编码；请使用当前页面下载的最新模板。"
          />
          <Collapse
            ghost
            size="small"
            items={[{
              key: 'template-guide',
              label: '查看字段填写说明',
              children: (
                <Typography.Paragraph type="secondary" className="import-guide-text">
                  表头依次为姓名、性别、代次、字辈、出生日期、是否在世，请勿改名或调整顺序。性别填写男/女/未知，是否在世填写是/否，代次填写正整数，日期格式为 yyyy-MM-dd。
                </Typography.Paragraph>
              )
            }]}
          />
          {!branchSelected ? <Alert type="warning" showIcon message="请先选择目标支派" /> : null}
          {branchSelected ? <Typography.Text type="secondary">导入到：{branchName || '未命名支派'}</Typography.Text> : null}
          {validationMessage ? <Alert type="error" showIcon message={validationMessage} closable onClose={() => setValidationMessage('')} /> : null}

          <Dragger {...uploadProps} className="import-upload-dragger">
            <Typography.Text strong>拖拽文件到此处，或点击选择文件</Typography.Text>
            <Typography.Paragraph type="secondary">选择文件后不会自动提交，需先完成数据预检。</Typography.Paragraph>
          </Dragger>

          <Space wrap>
            <Button disabled={previewing || batchCreating || !branchSelected || !file} loading={previewing} onClick={() => void previewFile()}>
              预览并查重
            </Button>
            <Button
              type="primary"
              disabled={batchCreating || previewing || !branchSelected || !file || !preview || (preview.errorCount || 0) > 0 || ((preview.duplicateCount || 0) > 0 && !confirmDuplicates)}
              loading={batchCreating}
              onClick={() => void upload()}
            >
              创建导入批次
            </Button>
          </Space>
        </Space>
      </Card>

      {preview ? (
        <Card
          title="导入预检结果"
          extra={(preview.errorCount || 0) > 0 ? <Button onClick={downloadErrorRows}>下载错误明细</Button> : null}
        >
          <Space direction="vertical" size="middle" className="import-workbench-stack">
            <Segmented
              value={previewFilter}
              onChange={value => setPreviewFilter(value as PreviewFilter)}
              options={[
                { value: 'all', label: `全部 ${preview.totalCount || 0}` },
                { value: 'valid', label: `有效 ${preview.validCount || 0}` },
                { value: 'warning', label: `警告 ${warningCount}` },
                { value: 'duplicate', label: `疑似重复 ${preview.duplicateCount || 0}` },
                { value: 'error', label: `错误 ${preview.errorCount || 0}` }
              ]}
            />

            {(preview.errorCount || 0) > 0 ? (
              <Alert type="error" showIcon message={`存在 ${preview.errorCount} 条阻断错误，修正并重新预检后才能创建批次。`} />
            ) : null}

            {(preview.duplicateCount || 0) > 0 ? (
              <Checkbox checked={confirmDuplicates} onChange={event => { setConfirmDuplicates(event.target.checked); setValidationMessage(''); }}>
                我已核对疑似重复人物，确认仍继续创建导入批次
              </Checkbox>
            ) : null}

            <Table<PreviewRow>
              size="middle"
              rowKey={(row, index) => String(row.rowNo || index)}
              dataSource={filteredRows}
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: total => `共 ${total} 条` }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前分类暂无数据" /> }}
              columns={[
                { key: 'rowNo', title: '行号', dataIndex: 'rowNo', width: 72 },
                { key: 'name', title: '姓名', dataIndex: 'name' },
                { key: 'gender', title: '性别', render: (_value, row) => genderText(row.gender) },
                { key: 'generationNo', title: '代次', dataIndex: 'generationNo' },
                { key: 'generationWord', title: '字辈', dataIndex: 'generationWord' },
                { key: 'birthDate', title: '出生日期', dataIndex: 'birthDate' },
                {
                  key: 'result',
                  title: '预检结果',
                  render: (_value, row) => row.errorMessage
                    ? <Tag color={row.duplicated ? 'warning' : 'error'}>{row.duplicated ? `疑似重复 ${row.duplicateCount || ''}` : '错误'}</Tag>
                    : <Tag color="success">有效</Tag>
                },
                { key: 'errorMessage', title: '问题说明', dataIndex: 'errorMessage', ellipsis: { showTitle: false }, render: value => value ? <Typography.Text type="danger" ellipsis={{ tooltip: value }}>{value}</Typography.Text> : '-' }
              ]}
              scroll={{ x: 900 }}
            />
          </Space>
        </Card>
      ) : null}
    </div>
  );
}
