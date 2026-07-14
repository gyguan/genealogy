import { useEffect, useState } from 'react';
import { Alert, Button, Card, Collapse, Empty, Space, Table, Tag, Typography, Upload } from 'antd';
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
};

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

export function RelationshipImportWorkspace({
  notify,
  clanId,
  branchId,
  branchName,
  onBatchCreated
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const branchSelected = Boolean(branchId);

  useEffect(() => {
    setFile(null);
    setPreview(null);
  }, [branchId]);

  async function downloadTemplate(format: TemplateFormat) {
    if (loading) return;
    setLoading(true);
    try {
      const blob = await apiClient.download(`/imports/templates/relationships.${format}`);
      saveDownloadedBlob(blob, `relationship-import-template.${format}`);
      notify({ message: `人物关系导入 ${format.toUpperCase()} 模板已下载` });
    } catch (error) {
      notify({ message: (error as Error).message || '人物关系导入模板下载失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  function query() {
    return new URLSearchParams({ branchId }).toString();
  }

  async function previewFile() {
    if (loading) return null;
    if (!clanId) {
      notify({ message: '请先选择宗族' }, true);
      return null;
    }
    if (!branchId) {
      notify({ message: '请在本页选择导入批次管理支派' }, true);
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
        `/clans/${clanId}/imports/relationships/preview?${query()}`,
        formData
      );
      setPreview(result);
      notify(
        { message: `预览完成：有效 ${result.validCount || 0} 行，重复 ${result.duplicateCount || 0} 行，错误 ${result.errorCount || 0} 行` },
        Boolean(result.errorCount)
      );
      return result;
    } catch (error) {
      notify({ message: (error as Error).message || '人物关系导入预览失败' }, true);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function upload() {
    if (loading) return;
    if (!clanId || !branchId || !file) {
      notify({ message: '请选择宗族、管理支派并上传标准模板' }, true);
      return;
    }
    const effectivePreview = preview || await previewFile();
    if (!effectivePreview) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiClient.upload<ImportJobResult>(
        `/clans/${clanId}/imports/relationships?${query()}`,
        formData
      );
      const failureCount = result.failureCount || 0;
      notify({
        message: failureCount > 0
          ? `关系导入批次已创建：成功 ${result.successCount || 0} 行，待修正 ${failureCount} 行`
          : `关系导入完成：${result.successCount || 0} 行已生成草稿，等待提交审核`
      });
      setFile(null);
      setPreview(null);
      onBatchCreated();
    } catch (error) {
      notify({ message: (error as Error).message || '人物关系导入失败' }, true);
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
      return false;
    },
    onRemove: () => {
      setFile(null);
      setPreview(null);
      return true;
    },
    fileList: file ? [{ uid: file.name, name: file.name, status: 'done' }] : []
  };

  return (
    <div className="relationship-import-workspace">
      <Card
        title="人物关系导入"
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
                  使用人物业务编码建立关系。表头依次为关系主体编码、关系对象编码、关系类型、说明；关系类型支持父子、母子、配偶。导入先生成草稿，重复、自关联、人物未匹配或循环关系可在任务详情中修正。
                </Typography.Paragraph>
              )
            }]}
          />
          {!branchSelected ? <Alert type="warning" showIcon message="请先选择批次管理支派" /> : null}
          {branchSelected ? <Typography.Text type="secondary">批次管理支派：{branchName || '未命名支派'}</Typography.Text> : null}
          <Upload {...uploadProps}>
            <Button disabled={!branchSelected}>上传填写后的模板</Button>
          </Upload>
          <Space wrap>
            <Button disabled={loading || !branchSelected} onClick={() => void previewFile()}>
              {loading ? '处理中...' : '预览并校验'}
            </Button>
            <Button type="primary" disabled={loading || !branchSelected} loading={loading} onClick={() => void upload()}>
              创建导入批次
            </Button>
          </Space>
        </Space>
      </Card>

      {preview ? (
        <Card title="人物关系导入预览" style={{ marginTop: 16 }}>
          {(preview.errorCount || 0) > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`发现 ${preview.errorCount} 条错误或重复关系，可创建批次后逐行修正。`}
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
              { key: 'rowNo', title: '行号', dataIndex: 'rowNo', width: 70 },
              { key: 'fromPersonCode', title: '主体编码', dataIndex: 'fromPersonCode' },
              { key: 'fromPersonName', title: '主体人物', dataIndex: 'fromPersonName' },
              { key: 'toPersonCode', title: '对象编码', dataIndex: 'toPersonCode' },
              { key: 'toPersonName', title: '对象人物', dataIndex: 'toPersonName' },
              { key: 'relationshipType', title: '关系类型', dataIndex: 'relationshipType' },
              {
                key: 'result',
                title: '校验结果',
                render: (_value, row) => row.errorMessage
                  ? <Tag color={row.duplicated ? 'warning' : 'error'}>{row.duplicated ? '重复' : '错误'}</Tag>
                  : <Tag color="success">通过</Tag>
              },
              { key: 'errorMessage', title: '错误原因', dataIndex: 'errorMessage' }
            ]}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      ) : null}
    </div>
  );
}
