import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function BranchPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [clanId, setClanId] = useState(workspace.clanId);
  const [branchName, setBranchName] = useState('');
  const [parentId, setParentId] = useState(workspace.branchId);
  const [list, setList] = useState<unknown>();

  async function createBranch() {
    const data: any = await apiClient.post(`/clans/${clanId}/branches`, {
      branchName,
      parentId: parentId ? Number(parentId) : null
    });
    if (data?.id) workspace.patch({ clanId, branchId: String(data.id) });
    notify(data);
    await load();
  }

  async function load() {
    const data: any = await apiClient.get(`/clans/${clanId}/branches`);
    setList(data);
    if (!workspace.branchId && Array.isArray(data) && data[0]?.id) workspace.setBranchId(String(data[0].id));
    workspace.setClanId(clanId);
    notify(data);
  }

  return (
    <div className="page-grid two">
      <Panel title="支派维护" description="默认使用顶部工作区宗族ID，创建成功后自动回填支派ID。">
        <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
        <Field label="支派名称"><input value={branchName} onChange={e => setBranchName(e.target.value)} /></Field>
        <Field label="父支派ID"><input value={parentId} onChange={e => setParentId(e.target.value)} /></Field>
        <Actions><button onClick={createBranch}>创建支派</button><button className="secondary" onClick={load}>查询支派</button></Actions>
      </Panel>
      <Panel title="支派树数据"><DataBlock data={list} /></Panel>
    </div>
  );
}
