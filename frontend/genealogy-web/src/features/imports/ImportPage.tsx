import { useEffect, useState } from 'react';
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

export function ImportPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [branchId, setBranchId] = useState(workspace.branchId || '');
  const [file, setFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadJobs() {
    if (!workspace.clanId) return;
    const data = await apiClient.get(`/clans/${workspace.clanId}/imports`);
    const rows = toRecordList<ImportJob>(data);
    setJobs(rows);
    if (!selectedJob && rows[0]) setSelectedJob(rows[0]);
  }

  useEffect(() => { void loadJobs(); }, [workspace.clanId]);

  async function upload() {
    if (loading) return;
    if (!workspace.clanId) { notify({ message: '请先选择宗族' }, true); return; }
    if (!file) { notify({ message: '请选择 CSV 或 XLSX 文件' }, true); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const query = branchId ? `?branchId=${branchId}` : '';
      const result = await apiClient.upload<ImportJob>(`/clans/${workspace.clanId}/imports/persons.csv${query}`, formData);
      notify({ message: `导入完成：成功 ${result.successCount || 0} 行，失败 ${result.failureCount || 0} 行` }, Boolean(result.failureCount));
      setSelectedJob(result);
      setFile(null);
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
          <Field label="默认支派ID"><input value={branchId} onChange={e => setBranchId(e.target.value)} placeholder="可空；文件第5列可覆盖" /></Field>
          <Field label="导入文件"><input type="file" accept=".csv,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
        </div>
        <Actions>
          <button disabled={loading} onClick={upload}>{loading ? '导入中...' : '上传并导入'}</button>
          <button className="secondary" onClick={() => void loadJobs()}>刷新导入任务</button>
        </Actions>
        <div className="import-template-tip">
          <strong>模板字段：</strong>姓名, 性别, 代次, 字辈, 支派ID, 出生日期, 是否在世。出生日期格式：yyyy-MM-dd。
        </div>
      </Panel>

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
