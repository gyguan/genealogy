import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Collapse, Empty, Space, Table, Tag, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { apiClient } from '../../shared/api/client';
import { saveDownloadedBlob } from '../../shared/utils/download';

type Props = {
  notify: (data: unknown, error?: boolean) => void;
  clanId: string;
  branchId: string;
  branchName: string;
  onBatchCreated: () => void;
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

function genderText(value?: string) {
  const dict: Record<string, string> = { male: '男', female: '女', unknown: '未知' };
  return dict[value || ''] || value || '-';
}

export function PersonImportWorkspace({
  notify,
  clanId,
  branchId,
  branchName,
  onBatchCreated
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [confirmDuplicates, setConfirmDuplicates] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const branchSelected = Boolean(branchId);

  useEffect(() => {
    setFile(null);
    setPreview(null);
    setConfirmDuplicates(false);
  }, [branchId]);

  async function downloadTemplate(format: TemplateFormat) {
    if (loading) return;
    setLoading(true);
    try {
      const blob = await apiClient.download(`/imports/templates/persons.${format}`);
      saveDownloadedBlob(blob, `person-import-template.${format}`);
      notify({ message: `人物导入 ${format.toUpperCase()} 模板已下载` });
    } catch (error) {
      notify({ message: (error as Error).message || '导入模板下载失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  function requestQuery(includeDuplicateConfirmation = false) {
    const params = new URLSearchParams({ branchId });
    if (includeDuplicateConfirmation) params.set('confirmDuplicates', String(confirmDuplicates));
    return params.toString();
  }

  async function previewFile() {
    if (loading) return null;
    if (!clanId) {
      notify({ message: '请先选择宗族' }, true);
      return null;
    }
    if (!branchId) {
      notify({ message: '请在本页选择目标支派' }, true);
      return null;
    }
    if (!file) {
      notify({ message: '请上传填写后的 CSV 或 XLSX 标准模板' }, true);
      return null;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiClient.upload<ImportPreview>(
        `/clans/${clanId}/imports/persons/preview?${requestQuery()}`,
        formData
      );
      setPreview(result);
      notify(
        { message: `预览完成：有效 ${result.validCount || 0} 行，疑似重复 ${result.duplicateCount || 0} 行，错误 ${result.errorCount || 0} 行` },
        Boolean(result.errorCount)
      );
      return result;
    } catch (error) {
      notify({ message: (error as Error).message || '导入预览失败' }, true);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function upload() {
    if (loading) return;
    if (!clanId) {
      notify({ message: '请先选择宗族' }, true);
      return;
    }
    if (!branchId) {
      notify({ message: '请在本页选择目标支派' }, true);
      return;
    }
    if (!file) {
      notify({ message: '请上传填写后的 CSV 或 XLSX 标准模板' }, true);
      return;
    }

    const effectivePreview = preview || await previewFile();
    if (!effectivePreview) return;
    if ((effectivePreview.duplicateCount || 0) > 0 && !confirmDuplicates) {
      notify({ message: '存在疑似重复人物，请勾选确认后再导入' }, true);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiClient.upload<ImportJobResult>(
        `/clans/${clanId}/imports/persons.csv?${requestQuery(true)}`,
        formData
      );
      const asyncQueued = result.executionMode === 'async'
        || ['queued', 'running', 'retry_wait'].includes(String(result.executionStatus || '').toLowerCase());
      const failureCount = result.failureCount || 0;
      notify({
        message: asyncQueued
          ? '导入批次已创建，文件将在后台分片处理；可在后台执行任务中查看进度、暂停或恢复。'
          : failureCount > 0
            ? `导入批次已创建：成功 ${result.successCount || 0} 行，待修正 ${failureCount} 行`
            : `导入完成：${result.successCount || 0} 行已生成草稿，等待提交审核`
      });
      setPreview(null);
      setFile(null);
      setConfirmDuplicates(false);
      onBatchCreated();
    } catch (error) {
      notify({ message: (error as Error).message || '导入失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  const uploadProps: UploadProps = {
    maxCount: 1,
    accept: '.csv,.xlsx',
    disabled: !branchSelected,
    beforeUpload: nextFile => {
      const filename = nextFile.name.toLowerCase();
      if (!filename.endsWith('.csv') && !filename.endsWith('.xlsx')) {
        notify({ message: '只支持上传系统提供的 CSV 或 XLSX 模板' }, true);
        return Upload.LIST_IGNORE;
      }
      setFile(nextFile);
      setPreview(null);
      setConfirmDuplicates(false);
      return false;
    },
    onRemove: () => {
      setFile(null);
      setPreview(null);
      setConfirmDuplicates(false);
      return true;
    },
    fileList: file ? [{ uid: file.name, name: file.name, status: 'done' }] : []
  };

  return (
    <div className="person-import-workspace">
      <Card
        title="人物导入"
        extra={(
          <Space wrap>
            <Button disabled={loading} onClick={() => void downloadTemplate('csv')}>下载 CSV 模板</Button>
            <Button disabled={loading} onClick={() => void downloadTemplate('xlsx')}>下载 XLSX 模板</Button>
          </Space>
        )}
        style={{ marginTop: 16 }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Collapse
            ghost
            size="small"
            items={[{
              key: 'template-guide',
              label: '模板填写说明',
              children: (
                <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  表头依次为姓名、性别、代次、字辈、出生日期、是否在世，请勿改名或调整顺序。性别填写男/女/未知，是否在世填写是/否，代次填写正整数，日期格式为 yyyy-MM-dd。小批次同步生成草稿，大批次自动进入后台分片处理；错误行可在导入任务中修正。
                </Typography.Paragraph>
              )
            }]}
          />
          {!branchSelected ? <Alert type="warning" showIcon message="请先选择目标支派" /> : null}
          {branchSelected ? <Typography.Text type="secondary">导入到：{branchName || '未命名支派'}</Typography.Text> : null}
          <Upload {...uploadProps}>
            <Button disabled={!branchSelected}>上传填写后的模板</Button>
          </Upload>
          <Checkbox
            disabled={!branchSelected}
            checked={confirmDuplicates}
            onChange={event => setConfirmDuplicates(event.target.checked)}
          >
            我已确认疑似重复人物，仍继续导入
          </Checkbox>
          <Space wrap>
            <Button disabled={loading || !branchSelected} onClick={() => void previewFile()}>
              {loading ? '处理中...' : '预览并查重'}
            </Button>
            <Button type="primary" disabled={loading || !branchSelected} loading={loading} onClick={() => void upload()}>
              创建导入批次
            </Button>
          </Space>
        </Space>
      </Card>

      {preview ? (
        <Card title="导入预览与查重" style={{ marginTop: 16 }}>
          {(preview.errorCount || 0) > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`发现 ${preview.errorCount} 条数据错误，可创建批次后逐行修正。`}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          <Table<PreviewRow>
            size="small"
            bordered
            rowKey={(row, index) => String(row.rowNo || index)}
            dataSource={preview.rows || []}
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无预览数据" /> }}
            columns={[
              { key: 'rowNo', title: '行号', dataIndex: 'rowNo' },
              { key: 'name', title: '姓名', dataIndex: 'name' },
              { key: 'gender', title: '性别', render: (_value, row) => genderText(row.gender) },
              { key: 'generationNo', title: '代次', dataIndex: 'generationNo' },
              { key: 'generationWord', title: '字辈', dataIndex: 'generationWord' },
              { key: 'birthDate', title: '出生日期', dataIndex: 'birthDate' },
              {
                key: 'duplicated',
                title: '查重',
                render: (_value, row) => row.errorMessage
                  ? <Tag color="error">错误行</Tag>
                  : row.duplicated
                    ? <Tag color="warning">疑似重复({row.duplicateCount})</Tag>
                    : <Tag color="success">未重复</Tag>
              },
              { key: 'errorMessage', title: '错误', dataIndex: 'errorMessage' }
            ]}
          />
        </Card>
      ) : null}
    </div>
  );
}
