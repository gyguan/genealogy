import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function BranchPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const [clanId, setClanId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [parentId, setParentId] = useState('');
  const [list, setList] = useState<unknown>();

  async function create() {
    const data = await apiClient.post(`/clans/${clanId}/branches`, {
      branchName,
      parentId: parentId ? Number(parentId) : null
    });
    notify(data);
    await load();
  }

  async function load() {
    const data = await apiClient.get(`/clans/${clanId}/branches`);
    setList(data);
    notify(data);
  }

  return (
    <div className="page-grid two">
      <Panel title="支派维护" description="支派用于控制族谱分支、人物归属和支派范围权限。">
        <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
        <Field label="支派名称"><input value={branchName} onChange={e => setBranchName(e.target.value)} /></Field>
        <Field label="父支派ID"><input value={parentId} onChange={e => setParentId(e.target.value)} /></Field>
        <Actions><button onClick={create}>创建支派</button><button className="secondary" onClick={load}>查询支派</button></Actions>
      </Panel>
      <Panel title="支派树数据"><DataBlock data={list} /></Panel>
    </div>
  );
}
