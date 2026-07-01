import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable, toRecordList } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';

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
  branchIdIndex: '5',
  birthDateIndex: '6',
  isLivingIndex: '7'
};

function toZeroBased(value: string) {
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

export function ImportPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [branchId, setBranchId] = useState(workspace.branchId || '');
  const [exportBranchId, setExportBranchId] = useState(workspace.branchId || '');
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
    Object.entries(mapping).forEach(([key, value]) => params.set(key, String(toZeroBased(value))));
    if (branchId) params.set('branchId', branchId);
    return params.toString();
  }, [mapping, branchId, autoMapping]);

  function patchMapping(key: keyof typeof mapping, value: string) {
    setMapping(prev => ({ ...prev, [key]: value }));
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
    const data = await apiClient.get(`/clans/${workspace.clanId}/imports`);
    const rows = toRecordList<ImportJob>(data);
    setJobs(rows);
    if (!selectedJob && rows[0]) setSelectedJob(rows[0]);
  }

  useEffect(() => { void loadJobs(); }, [workspace.clanId]);

  function downloadTemplate() {
    const content = '姓名,性别,代次,字辈,支派ID,出生日期,是否在世\n张明远,male,1,明,,1940-01-01,否\n张承志,male,2,承,,1965-05-12,是\n';
    const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' });
    saveBlob(blob, 'person-import-template.csv');
    notify({ message: '导入模板已生成' });
  }

  async function downloadCsv(path: string, filename: string) {
    if (loading) return;
    setLoading(true);
    try {
      const blob = await apiClient.download(path);
      saveBlob(blob, filename);
      notify({ message: `导出完成：${filename}` });
    } catch (error) {
      notify({ message: (error as Error).message || '导出失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function exportBranchPersons() {
    if (!workspace.clanId) { notify({ message: '请先选择宗族' }, true); return; }
    if (!exportBranchId) { notify({ message: '请填写导出支派ID' }, true); return; }
    await downloadCsv(`/clans/${workspace.clanId}/branches/${exportBranchId}/exports/persons.csv`, `branch-${exportBranchId}-persons.csv`);
  }

  async function exportBranchRelations() {
    if (!workspace.clanId) { notify({ message: '请先选择宗族' }, true); return; }
    if (!exportBranchId) { notify({ message: '请填写导出支派ID' }, true); return; }
    await downloadCsv(`/clans/${workspace.clanId}/branches/${exportBranchId}/exports/relations.csv`, `branch-${exportBranchId}-relations.csv`);
  }

  async function previewFile() {
    if (loading) return null;
    if (!workspace.clanId) { notify({ message: '请先选择宗族' }, true); return null; }
    if (!file) { notify({ message: '请选择 CSV 或 XLSX 文件' }, true); return null; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiClient.upload<ImportPreview>(`/clans/${workspace.clanId}/imports/persons/preview?${mappingQuery}`, formData);
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
    if (!workspace.clanId) { notify({ message: '请先选择宗族' }, true); return; }
    if (!file) { notify({ message: '请选择 CSV 或 XLSX 文件' }, true); return; }
    const effectivePreview = preview || await previewFile();
    if (!effectivePreview) return;
    if ((effectivePreview.errorCount || 0) > 0) { notify({ message: '存在错误行，请修正后再导入' }, true); return; }
    if ((effectivePreview.duplicateCount || 0) > 0 && !confirmDuplicates) { notify({ message: '存在疑似重复人物，请勾选确认后再导入' }, true); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const sep = mappingQuery ? '&' : '';
      const result = await apiClient.upload<ImportJob>(`/clans/${workspace.clanId}/imports/persons.csv?${mappingQuery}${sep}confirmDuplicates=${confirmDuplicates}`, formData);
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

  return (
    <div className="import-page">
      <Panel title="人物导入" description="支持 CSV / XLSX 导入。导入人物默认进入 draft 草稿状态，需要审核通过后正式入谱。">
        <div className="wizard-form-grid">
          <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} placeholder="请输入宗族ID" /></Field>
          <Field label="默认支派ID"><input value={branchId} onChange={e => setBranchId(e.target.value)} placeholder="可空；文件映射列可覆盖" /></Field>
          <Field label="导入文件"><input type="file" accept=".csv,.xlsx" onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); }} /></Field>
        </div>
        <label className="import-confirm-line"><input type="checkbox" checked={autoMapping} onChange={e => { setAutoMapping(e.target.checked); setPreview(null); }} /> 自动识别表头字段；识别失败时使用下方列号兜底</label>
        <div className="wizard-form-grid">
          <Field label="姓名列"><input value={mapping.nameIndex} onChange={e => patchMapping('nameIndex', e.target.value)} /></Field>
          <Field label="性别列"><input value={mapping.genderIndex} onChange={e => patchMapping('genderIndex', e.target.value)} /></Field>
          <Field label="代次列"><input value={mapping.generationNoIndex} onChange={e => patchMapping('generationNoIndex', e.target.value)} /></Field>
          <Field label="字辈列"><input value={mapping.generationWordIndex} onChange={e => patchMapping('generationWordIndex', e.target.value)} /></Field>
          <Field label="支派ID列"><input value={mapping.branchIdIndex} onChange={e => patchMapping('branchIdIndex', e.target.value)} /></Field>
          <Field label="出生日期列"><input value={mapping.birthDateIndex} onChange={e => patchMapping('birthDateIndex', e.target.value)} /></Field>
          <Field label="是否在世列"><input value={mapping.isLivingIndex} onChange={e => patchMapping('isLivingIndex', e.target.value)} /></Field>
        </div>
        <label className="import-confirm-line"><input type="checkbox" checked={confirmDuplicates} onChange={e => setConfirmDuplicates(e.target.checked)} /> 我已确认疑似重复人物，仍继续导入</label>
        <Actions>
          <button className="secondary" onClick={downloadTemplate}>下载模板</button>
          <button className="secondary" onClick={resetAutoMapping}>恢复自动识别</button>
          <button className="secondary" disabled={loading} onClick={() => void previewFile()}>{loading ? '处理中...' : '预览并查重'}</button>
          <button disabled={loading} onClick={upload}>{loading ? '导入中...' : '确认导入'}</button>
          <button className="secondary" onClick={() => void loadJobs()}>刷新导入任务</button>
        </Actions>
        <div className="import-template-tip">
          <strong>模板字段：</strong>姓名, 性别, 代次, 字辈, 支派ID, 出生日期, 是否在世。默认会按表头自动识别；手工映射使用从 1 开始的列号。
        </div>
      </Panel>

      <Panel title="人物/关系导出" description="支持全宗族导出，也支持按支派导出当前支派及其下级支派的人物和内部关系。">
        <div className="wizard-form-grid">
          <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} placeholder="请输入宗族ID" /></Field>
          <Field label="导出支派ID"><input value={exportBranchId} onChange={e => setExportBranchId(e.target.value)} placeholder="填写支派ID，导出该支派及下级支派" /></Field>
        </div>
        <Actions>
          <button className="secondary" disabled={loading || !workspace.clanId} onClick={() => void downloadCsv(`/clans/${workspace.clanId}/exports/persons.csv`, 'persons.csv')}>导出全宗族人物</button>
          <button className="secondary" disabled={loading || !workspace.clanId} onClick={() => void downloadCsv(`/clans/${workspace.clanId}/exports/relations.csv`, 'relations.csv')}>导出全宗族关系</button>
          <button disabled={loading || !workspace.clanId || !exportBranchId} onClick={() => void exportBranchPersons()}>按支派导出人物</button>
          <button disabled={loading || !workspace.clanId || !exportBranchId} onClick={() => void exportBranchRelations()}>按支派导出关系</button>
        </Actions>
        <div className="import-template-tip">
          <strong>支派导出规则：</strong>人物导出包含当前支派及所有下级支派；关系导出仅包含起点人物和终点人物都在该支派范围内的关系，避免导出悬挂关系。
        </div>
      </Panel>

      {preview ? (
        <Panel title="导入预览与查重" description={`总计 ${preview.totalCount || 0} 行，有效 ${preview.validCount || 0} 行，疑似重复 ${preview.duplicateCount || 0} 行，错误 ${preview.errorCount || 0} 行。`}>
          <DataTable
            data={preview.rows || []}
            columns={[
              { key: 'rowNo', title: '行号' },
              { key: 'name', title: '姓名' },
              { key: 'gender', title: '性别' },
              { key: 'generationNo', title: '代次' },
              { key: 'generationWord', title: '字辈' },
              { key: 'branchId', title: '支派ID' },
              { key: 'birthDate', title: '出生日期' },
              { key: 'duplicated', title: '查重', render: row => row.errorMessage ? '错误行' : row.duplicated ? `疑似重复(${row.duplicateCount})` : '未重复' },
              { key: 'errorMessage', title: '错误' }
            ]}
            empty="暂无预览数据"
          />
        </Panel>
      ) : null}

      <Panel title="导入任务记录" description="查看历史导入状态、成功失败行数和错误明细。">
        <DataTable
          data={jobs}
          columns={[
            { key: 'id', title: '任务ID' },
            { key: 'importType', title: '类型' },
            { key: 'originalFilename', title: '文件名' },
            { key: 'totalCount', title: '总数' },
            { key: 'successCount', title: '成功' },
            { key: 'failureCount', title: '失败' },
            { key: 'status', title: '状态' },
            { key: 'createdAt', title: '创建时间' }
          ]}
          onSelect={row => setSelectedJob(row as ImportJob)}
          empty="暂无导入任务"
        />
      </Panel>

      {selectedJob ? (
        <Panel title={`错误明细 #${selectedJob.id || '-'}`} description={selectedJob.errorSummary || '当前任务无错误明细。'}>
          <DataTable
            data={selectedJob.errors || []}
            columns={[
              { key: 'rowNo', title: '行号' },
              { key: 'errorMessage', title: '错误原因' },
              { key: 'rawData', title: '原始数据' }
            ]}
            empty="暂无错误行"
          />
        </Panel>
      ) : null}
    </div>
  );
}
