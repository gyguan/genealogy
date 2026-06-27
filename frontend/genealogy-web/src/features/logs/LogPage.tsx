import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function LogPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const [clanId, setClanId] = useState('');
  const [actionType, setActionType] = useState('');
  const [data, setData] = useState<unknown>();

  function query() {
    const params = new URLSearchParams();
    if (clanId) params.set('clanId', clanId);
    if (actionType) params.set('actionType', actionType);
    return params.toString();
  }

  async function list() {
    const q = query();
    const res = await apiClient.get(`/logs/operations${q ? `?${q}` : ''}`);
    setData(res);
    notify(res);
  }

  async function stats() {
    const q = query();
    const res = await apiClient.get(`/logs/operations/stats${q ? `?${q}` : ''}`);
    setData(res);
    notify(res);
  }

  async function exportCsv() {
    const q = query();
    const blob = await apiClient.download(`/logs/operations/export.csv${q ? `?${q}` : ''}`);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'operation-logs.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    notify('日志导出完成');
  }

  return (
    <div className="page-grid two">
      <Panel title="日志审计" description="支持查询、统计和导出，适合管理员审计。">
        <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
        <Field label="动作类型"><input value={actionType} onChange={e => setActionType(e.target.value)} placeholder="person_create" /></Field>
        <Actions><button onClick={list}>查询</button><button className="secondary" onClick={stats}>统计</button><button className="secondary" onClick={exportCsv}>导出CSV</button></Actions>
      </Panel>
      <Panel title="审计数据"><DataBlock data={data} /></Panel>
    </div>
  );
}
