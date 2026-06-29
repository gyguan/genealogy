import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function LogPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [filters, setFilters] = useState({
    clanId: workspace.clanId,
    actorId: '',
    actionType: '',
    targetType: '',
    targetId: '',
    keyword: '',
    startTime: '',
    endTime: '',
    pageSize: '20'
  });
  const [data, setData] = useState<unknown>();
  const [result, setResult] = useState<unknown>();

  function set(key: keyof typeof filters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function query() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
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
      <Panel title="日志审计查询" description="支持按宗族、操作者、对象、动作和时间范围查询。">
        <Field label="宗族ID"><input value={filters.clanId} onChange={e => set('clanId', e.target.value)} /></Field>
        <Field label="操作者ID"><input value={filters.actorId} onChange={e => set('actorId', e.target.value)} /></Field>
        <Field label="动作类型"><input value={filters.actionType} onChange={e => set('actionType', e.target.value)} placeholder="person_create" /></Field>
        <Field label="对象类型"><input value={filters.targetType} onChange={e => set('targetType', e.target.value)} placeholder="person" /></Field>
        <Field label="对象ID"><input value={filters.targetId} onChange={e => set('targetId', e.target.value)} /></Field>
        <Field label="关键词"><input value={filters.keyword} onChange={e => set('keyword', e.target.value)} /></Field>
        <Field label="开始时间"><input value={filters.startTime} onChange={e => set('startTime', e.target.value)} placeholder="2026-06-01T00:00:00" /></Field>
        <Field label="结束时间"><input value={filters.endTime} onChange={e => set('endTime', e.target.value)} placeholder="2026-06-30T23:59:59" /></Field>
        <Field label="每页数量"><input value={filters.pageSize} onChange={e => set('pageSize', e.target.value)} /></Field>
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
            { key: 'summary', title: '摘要' },
            { key: 'createdAt', title: '时间' }
          ]}
        />
      </Panel>
    </div>
  );
}
