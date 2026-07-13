import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, Form, InputNumber, Space, Table, Tag, Upload } from 'antd';
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

const defaultMapping = {
  nameIndex: '1',
  genderIndex: '2',
  generationNoIndex: '3',
  generationWordIndex: '4',
  birthDateIndex: '5',
  isLivingIndex: '6'
};

function toZeroBased(value: string) {
  const parsed = Number(value || '1');
  return Math.max(0, Number.isFinite(parsed) ? parsed - 1 : 0);
}

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
  const [mapping, setMapping] = useState(defaultMapping);
  const [autoMapping, setAutoMapping] = useState(true);
  const [confirmDuplicates, setConfirmDuplicates] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const branchSelected = Boolean(branchId);

  useEffect(() => {
    setFile(null);
    setPreview(null);
    setConfirmDuplicates(false);
  }, [branchId]);

  const mappingQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('autoMapping', String(autoMapping));
    Object.entries(mapping).forEach(([key, value]) => {
      params.set(key, String(toZeroBased(value)));
    });
    if (branchId) params.set('branchId', branchId);
    return params.toString();
  }, [mapping, branchId, autoMapping]);

  function patchMapping(key: keyof typeof mapping, value: number | null) {
    setMapping(previous => ({ ...previous, [key]: value === null ? '' : String(value) }));
    setAutoMapping(false);
    setPreview(null);
  }

  function resetAutoMapping() {
    setMapping(defaultMapping);
    setAutoMapping(true);
    setPreview(null);
  }

  async function downloadTemplate() {
    if (loading) return;
    setLoading(true);
    try {
      const blob = await apiClient.download('/imports/templates/persons.csv');
      saveDownloadedBlob(blob, 'person-import-template.csv');
      notify({ message: '人物导入模板已下载' });
    } catch (error) {
      notify({ message: (error as Error).message || '导入模板下载失败' }, true);
    } finally {
      setLoading(false);
    }
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
      notify({ message: '请选择 CSV 或 XLSX 文件' }, true);
      return null;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiClient.upload<ImportPreview>(
        `/clans/${clanId}/imports/persons/preview?${mappingQuery}`,
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
      notify({ message: '请选择 CSV 或 XLSX 文件' }, true);
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
      const separator = mappingQuery ? '&' : '';
      const result = await apiClient.upload<ImportJobResult>(
        `/clans/${clanId}/imports/persons.csv?${mappingQuery}${separator}confirmDuplicates=${confirmDuplicates}`,
        formData
      );
      const failureCount = result.failureCount || 0;
      notify({
        message: failureCount > 0
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
    <div className="person-import-workspace">
      <Card title="人物导入" extra={<Button disabled={loading} onClick={() => void downloadTemplate()}>下载模板</Button>} style={{ marginTop: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert type="info" showIcon message="导入人物默认进入草稿状态；错误行可在导入任务中修正，全部处理完成后再提交审核。" />
          {!branchSelected ? (
            <Alert type="warning" showIcon message="请在本页上方选择本次导入的目标支派，再选择文件并执行导入。" />
          ) : (
            <Alert type="success" showIcon message={`当前目标支派：${branchName || '未命名支派'}。文件中无需填写支派或支派 ID。`} />
          )}
          <Upload {...uploadProps}>
            <Button disabled={!branchSelected}>选择 CSV / XLSX 文件</Button>
          </Upload>
          <Checkbox
            disabled={!branchSelected}
            checked={autoMapping}
            onChange={event => { setAutoMapping(event.target.checked); setPreview(null); }}
          >
            自动识别表头字段；识别失败时使用下方列号兜底
          </Checkbox>
          <Form layout="vertical" className="archive-search-form" disabled={!branchSelected}>
            <Form.Item label="姓名列"><InputNumber min={1} value={Number(mapping.nameIndex || 1)} onChange={value => patchMapping('nameIndex', value)} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="性别列"><InputNumber min={1} value={Number(mapping.genderIndex || 1)} onChange={value => patchMapping('genderIndex', value)} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="代次列"><InputNumber min={1} value={Number(mapping.generationNoIndex || 1)} onChange={value => patchMapping('generationNoIndex', value)} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="字辈列"><InputNumber min={1} value={Number(mapping.generationWordIndex || 1)} onChange={value => patchMapping('generationWordIndex', value)} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="出生日期列"><InputNumber min={1} value={Number(mapping.birthDateIndex || 1)} onChange={value => patchMapping('birthDateIndex', value)} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="是否在世列"><InputNumber min={1} value={Number(mapping.isLivingIndex || 1)} onChange={value => patchMapping('isLivingIndex', value)} style={{ width: '100%' }} /></Form.Item>
          </Form>
          <Checkbox
            disabled={!branchSelected}
            checked={confirmDuplicates}
            onChange={event => setConfirmDuplicates(event.target.checked)}
          >
            我已确认疑似重复人物，仍继续导入
          </Checkbox>
          <Space wrap>
            <Button disabled={!branchSelected} onClick={resetAutoMapping}>恢复自动识别</Button>
            <Button disabled={loading || !branchSelected} onClick={() => void previewFile()}>{loading ? '处理中...' : '预览并查重'}</Button>
            <Button type="primary" disabled={loading || !branchSelected} loading={loading} onClick={() => void upload()}>创建导入批次</Button>
          </Space>
        </Space>
      </Card>

      {preview ? (
        <Card title="导入预览与查重" style={{ marginTop: 16 }}>
          {(preview.errorCount || 0) > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`发现 ${preview.errorCount} 条错误数据。仍可创建导入批次，之后在任务详情中逐行修正。`}
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
