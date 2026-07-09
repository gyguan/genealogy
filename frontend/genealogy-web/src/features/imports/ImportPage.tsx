import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, Form, InputNumber, Space, Table, Tag, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { genderText, importStatusColor, importStatusText } from '../../shared/dictionaries';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { importService } from '../../shared/services/importService';
import { toRecordList } from '../../shared/utils/records';

type Props = { notify: (data: unknown, error?: boolean) => void };

type ImportJob = {
  id?: number;
  clanId?: number;
  branchId?: number;
  importType?: string;
  originalFilename?: string;
  totalCount?: number;
  successCount?: number;
  failureCount?: number;
  status?: string;
  errorSummary?: string;
  createdAt?: string;
  errors?: { rowNo?: number; errorMessage?: string; rawData?: string }[];
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
  branchIdIndex: '',
  birthDateIndex: '5',
  isLivingIndex: '6'
};

function toZeroBased(value: string, allowEmpty = false) {
  if (allowEmpty && !String(value || '').trim()) return -1;
  const parsed = Number(value || '1');
  return Math.max(0, Number.isFinite(parsed) ? parsed - 1 : 0);
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importTypeText(value?: string) {
  const type = String(value || '').toLowerCase();
  const dict: Record<string, string> = { persons: '人物导入', person: '人物导入', relationships: '关系导入', relationship: '关系导入' };
  return dict[type] || value || '导入任务';
}

export function ImportPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [branchId] = useState(workspace.branchId || '');
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState(defaultMapping);
  const [autoMapping, setAutoMapping] = useState(true);
  const [confirmDuplicates, setConfirmDuplicates] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [loading, setLoading] = useState(false);

  const mappingQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('autoMapping', String(autoMapping));
    Object.entries(mapping).forEach(([key, value]) => params.set(key, String(toZeroBased(value, key === 'branchIdIndex'))));
    if (branchId) params.set('branchId', branchId);
    return params.toString();
  }, [mapping, branchId, autoMapping]);

  function patchMapping(key: keyof typeof mapping, value: number | null) {
    setMapping(prev => ({ ...prev, [key]: value === null ? '' : String(value) }));
    setAutoMapping(false);
    setPreview(null);
  }

  function resetAutoMapping() {
    setMapping(defaultMapping);
    setAutoMapping(true);
    setPreview(null);
  }

  async function loadJobs() {
    if (!workspace.clanId) return;
    const data = await importService.listJobs(workspace.clanId);
    const rows = toRecordList<ImportJob>(data);
    setJobs(rows);
    if (!selectedJob && rows[0]) setSelectedJob(rows[0]);
  }

  useEffect(() => { void loadJobs(); }, [workspace.clanId]);

  function downloadTemplate() {
    const content = '姓名,性别,代次,字辈,出生日期,是否在世\n张明远,male,1,明,1940-01-01,否\n张承志,male,2,承,1965-05-12,是\n';
    const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' });
    saveBlob(blob, 'person-import-template.csv');
    notify({ message: '导入模板已生成' });
  }

  async function downloadCsv(loader: () => Promise<Blob>, filename: string) {
    if (loading) return;
    setLoading(true);
    try {
      const blob = await loader();
      saveBlob(blob, filename);
      notify({ message: `导出完成：${filename}` });
    } catch (error) {
      notify({ message: (error as Error).message || '导出失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function exportCurrentBranch(pathType: 'persons' | 'relations' | 'booklet') {
    if (!workspace.clanId) { notify({ message: '请先在宗族管理中选择宗族' }, true); return; }
    if (!workspace.branchId) { notify({ message: '请先在支派管理中选择支派' }, true); return; }
    const loader = pathType === 'booklet'
      ? () => importService.downloadBranchBooklet(workspace.clanId, workspace.branchId)
      : pathType === 'persons'
        ? () => importService.downloadBranchPersons(workspace.clanId, workspace.branchId)
        : () => importService.downloadBranchRelations(workspace.clanId, workspace.branchId);
    const filename = pathType === 'booklet' ? 'branch-booklet.html' : `branch-${pathType}.csv`;
    await downloadCsv(loader, filename);
  }

  async function previewFile() {
    if (loading) return null;
    if (!workspace.clanId) { notify({ message: '请先在宗族管理中选择宗族' }, true); return null; }
    if (!file) { notify({ message: '请选择 CSV 或 XLSX 文件' }, true); return null; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await importService.previewPersons(workspace.clanId, mappingQuery, formData) as ImportPreview;
      setPreview(result);
      notify({ message: `预览完成：有效 ${result.validCount || 0} 行，疑似重复 ${result.duplicateCount || 0} 行，错误 ${result.errorCount || 0} 行` }, Boolean(result.errorCount));
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
    if (!workspace.clanId) { notify({ message: '请先在宗族管理中选择宗族' }, true); return; }
    if (!file) { notify({ message: '请选择 CSV 或 XLSX 文件' }, true); return; }
    const effectivePreview = preview || await previewFile();
    if (!effectivePreview) return;
    if ((effectivePreview.errorCount || 0) > 0) { notify({ message: '存在错误行，请修正后再导入' }, true); return; }
    if ((effectivePreview.duplicateCount || 0) > 0 && !confirmDuplicates) { notify({ message: '存在疑似重复人物，请勾选确认后再导入' }, true); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await importService.importPersons(workspace.clanId, mappingQuery, confirmDuplicates, formData) as ImportJob;
      notify({ message: `导入完成：成功 ${result.successCount || 0} 行，失败 ${result.failureCount || 0} 行` }, Boolean(result.failureCount));
      setSelectedJob(result);
      setPreview(null);
      setFile(null);
      setConfirmDuplicates(false);
      await loadJobs();
    } catch (error) {
      notify({ message: (error as Error).message || '导入失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  const uploadProps: UploadProps = {
    maxCount: 1,
    accept: '.csv,.xlsx',
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
    <div className="import-page">
      <Card title="人物导入" extra={<Button disabled={loading} onClick={downloadTemplate}>下载模板</Button>}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert type="info" showIcon message="导入人物默认进入草稿状态，需要审核通过后正式入谱。" />
          <Upload {...uploadProps}>
            <Button>选择 CSV / XLSX 文件</Button>
          </Upload>
          <Checkbox checked={autoMapping} onChange={e => { setAutoMapping(e.target.checked); setPreview(null); }}>
            自动识别表头字段；识别失败时使用下方列号兜底
          </Checkbox>
          <Form layout="vertical" className="archive-search-form">
            <Form.Item label="姓名列"><InputNumber min={1} value={Number(mapping.nameIndex || 1)} onChange={value => patchMapping('nameIndex', value)} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="性别列"><InputNumber min={1} value={Number(mapping.genderIndex || 1)} onChange={value => patchMapping('genderIndex', value)} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="代次列"><InputNumber min={1} value={Number(mapping.generationNoIndex || 1)} onChange={value => patchMapping('generationNoIndex', value)} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="字辈列"><InputNumber min={1} value={Number(mapping.generationWordIndex || 1)} onChange={value => patchMapping('generationWordIndex', value)} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="出生日期列"><InputNumber min={1} value={Number(mapping.birthDateIndex || 1)} onChange={value => patchMapping('birthDateIndex', value)} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="是否在世列"><InputNumber min={1} value={Number(mapping.isLivingIndex || 1)} onChange={value => patchMapping('isLivingIndex', value)} style={{ width: '100%' }} /></Form.Item>
          </Form>
          <Checkbox checked={confirmDuplicates} onChange={e => setConfirmDuplicates(e.target.checked)}>
            我已确认疑似重复人物，仍继续导入
          </Checkbox>
          <Space wrap>
            <Button onClick={resetAutoMapping}>恢复自动识别</Button>
            <Button disabled={loading} onClick={() => void previewFile()}>{loading ? '处理中...' : '预览并查重'}</Button>
            <Button type="primary" disabled={loading} loading={loading} onClick={() => void upload()}>确认导入</Button>
            <Button onClick={() => void loadJobs()}>刷新导入任务</Button>
          </Space>
          <Alert type="warning" showIcon message="支派不在文件中填写系统 ID；需要按支派导入时，请先在支派管理中选择支派作为当前支派。" />
        </Space>
      </Card>

      <Card title="人物/关系/成册导出" style={{ marginTop: 16 }}>
        <Space wrap>
          <Button disabled={loading || !workspace.clanId} onClick={() => void downloadCsv(() => importService.downloadClanPersons(workspace.clanId), 'persons.csv')}>导出全宗族人物</Button>
          <Button disabled={loading || !workspace.clanId} onClick={() => void downloadCsv(() => importService.downloadClanRelations(workspace.clanId), 'relations.csv')}>导出全宗族关系</Button>
          <Button disabled={loading || !workspace.clanId} onClick={() => void downloadCsv(() => importService.downloadClanBooklet(workspace.clanId), 'clan-booklet.html')}>导出全宗族成册</Button>
          <Button disabled={loading || !workspace.clanId || !workspace.branchId} onClick={() => void exportCurrentBranch('persons')}>按当前支派导出人物</Button>
          <Button disabled={loading || !workspace.clanId || !workspace.branchId} onClick={() => void exportCurrentBranch('relations')}>按当前支派导出关系</Button>
          <Button type="primary" disabled={loading || !workspace.clanId || !workspace.branchId} onClick={() => void exportCurrentBranch('booklet')}>按当前支派导出成册</Button>
        </Space>
      </Card>

      {preview ? (
        <Card title="导入预览与查重" style={{ marginTop: 16 }}>
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
              { key: 'duplicated', title: '查重', render: (_value, row) => row.errorMessage ? <Tag color="error">错误行</Tag> : row.duplicated ? <Tag color="warning">疑似重复({row.duplicateCount})</Tag> : <Tag color="success">未重复</Tag> },
              { key: 'errorMessage', title: '错误', dataIndex: 'errorMessage' }
            ]}
          />
        </Card>
      ) : null}

      <Card title="导入任务记录" style={{ marginTop: 16 }}>
        <Table<ImportJob>
          size="small"
          bordered
          rowKey={(row, index) => String(row.id || index)}
          dataSource={jobs}
          pagination={false}
          onRow={row => ({ onClick: () => setSelectedJob(row), style: { cursor: 'pointer' } })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无导入任务" /> }}
          columns={[
            { key: 'importType', title: '导入类型', render: (_value, row) => importTypeText(row.importType) },
            { key: 'originalFilename', title: '文件名', dataIndex: 'originalFilename' },
            { key: 'totalCount', title: '总数', dataIndex: 'totalCount' },
            { key: 'successCount', title: '成功', dataIndex: 'successCount' },
            { key: 'failureCount', title: '失败', dataIndex: 'failureCount' },
            { key: 'status', title: '状态', render: (_value, row) => <Tag color={importStatusColor(row.status)}>{importStatusText(row.status)}</Tag> },
            { key: 'createdAt', title: '创建时间', dataIndex: 'createdAt' }
          ]}
        />
      </Card>

      {selectedJob ? (
        <Card title="错误明细" style={{ marginTop: 16 }}>
          <Alert type="info" showIcon message={selectedJob.errorSummary || '当前任务无错误明细。'} style={{ marginBottom: 12 }} />
          <Table
            size="small"
            bordered
            rowKey={(row: any, index) => String(row.rowNo || index)}
            dataSource={selectedJob.errors || []}
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无错误明细" /> }}
            columns={[{ key: 'rowNo', title: '行号', dataIndex: 'rowNo' }, { key: 'errorMessage', title: '错误原因', dataIndex: 'errorMessage' }, { key: 'rawData', title: '原始数据', dataIndex: 'rawData' }]}
          />
        </Card>
      ) : null}
    </div>
  );
}
