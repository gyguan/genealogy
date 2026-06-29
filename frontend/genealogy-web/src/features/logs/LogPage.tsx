import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function LogPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [clanId, setClanId] = useState(workspace.clanId);
  const [actionType, setActionType] = useState('');
  const [data, setData] = useState<unknown>();
  const [result, setResult] = useState<unknown>();

  function query() {
    const params = new URLSearchParams();
    if (clanId) params.set('clanId', clanId);
    if (actionType) params.set('actionType', actionType);
    return params.toString();
  }

  async function list() {
    const q = query();
    const res: any = await apiClient.get(`/logs/operations${q ? `?${q}` : ''}`);
    setData(res);
    notify({ message: `日志查询完成，共 ${res?.total ?? res?.records?.length ?? 0} 条` });
  }

  async function stats() {
    const q = query();
    const res: any = await apiClient.get(`/logs/operations/stats${q ? `?${q}` : ''}`);
    setResult({ message: `日志总数：${res?.totalCount ?? 0}` });
    notify({ message: '日志统计完成' });
  }

  async function exportCsv() {
    const q = query();
    const blob = await apiClient.download(`/logs/operations/export.csv${q ? `?${q}` : ''}`);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'operation-logs.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    setResult({ message: '日志导出完成' });
    notify({ message: '日志导出完成' });
  }

  return (
    <div className="page-grid two">
      <Panel title="日志审计查询" description="支持按宗族和动作类型查询、统计和导出。">
        <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
        <Field label="动作类型"><input value={actionType} onChange={e => setActionType(e.target.value)} placeholder="person_create" /></Field>
        <Actions><button onClick={list}>查询</button><button className="secondary" onClick={stats}>统计</button><button className="secondary" onClick={exportCsv}>导出CSV</button></Actions>
        <ResultNotice result={result} />
      </Panel>
      <Panel title="审计日志列表">
        <DataTable
          data={data}
          columns={[
            { key: 'id', title: 'ID' },
            { key: 'actionType', title: '动作' },
            { key: 'targetType', title: '对象类型' },
            { key: 'targetId', title: '对象ID' },
            { key: 'actorId', title: '操作者' },
            { key: 'createdAt', title: '时间' }
          ]}
        />
      </Panel>
    </div>
  );
}
