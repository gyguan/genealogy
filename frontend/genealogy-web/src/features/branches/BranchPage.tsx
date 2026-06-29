import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function BranchPage({ notify, mode = 'create' }: { notify: (data: unknown, error?: boolean) => void; mode?: 'create' | 'query' }) {
  const workspace = useWorkspace();
  const [clanId, setClanId] = useState(workspace.clanId);
  const [branchName, setBranchName] = useState('');
  const [parentId, setParentId] = useState(workspace.branchId);
  const [list, setList] = useState<unknown>();
  const [result, setResult] = useState<unknown>();

  async function createBranch() {
    const data: any = await apiClient.post(`/clans/${clanId}/branches`, {
      branchName,
      parentId: parentId ? Number(parentId) : null
    });
    if (data?.id) workspace.patch({ clanId, branchId: String(data.id) });
    setResult(data);
    notify({ message: '支派创建成功', id: data?.id });
  }

  async function load() {
    const data: any = await apiClient.get(`/clans/${clanId}/branches`);
    setList(data);
    if (!workspace.branchId && Array.isArray(data) && data[0]?.id) workspace.setBranchId(String(data[0].id));
    workspace.setClanId(clanId);
    notify({ message: '支派查询完成' });
  }

  if (mode === 'query') {
    return (
      <Panel title="支派查询" description="按宗族查询支派树，点击表格行可设置当前支派ID。">
        <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
        <Actions><button onClick={load}>查询支派</button></Actions>
        <DataTable
          data={list}
          columns={[
            { key: 'id', title: 'ID' },
            { key: 'branchName', title: '支派名称' },
            { key: 'parentId', title: '父支派ID' },
            { key: 'status', title: '状态' }
          ]}
          onSelect={row => workspace.setBranchId(String(row.id))}
        />
      </Panel>
    );
  }

  return (
    <Panel title="支派创建" description="默认使用顶部工作区宗族ID，创建成功后自动回填支派ID。">
      <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
      <Field label="支派名称"><input value={branchName} onChange={e => setBranchName(e.target.value)} /></Field>
      <Field label="父支派ID"><input value={parentId} onChange={e => setParentId(e.target.value)} /></Field>
      <Actions><button onClick={createBranch}>创建支派</button></Actions>
      <ResultNotice result={result} successText="支派创建成功" />
    </Panel>
  );
}
