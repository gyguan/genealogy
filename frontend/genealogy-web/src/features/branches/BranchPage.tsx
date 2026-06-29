import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function BranchPage({ notify, mode = 'create' }: { notify: (data: unknown, error?: boolean) => void; mode?: 'create' | 'query' }) {
  const workspace = useWorkspace();
  const [clanId, setClanId] = useState(workspace.clanId);
  const [branchName, setBranchName] = useState('');
  const [parentId, setParentId] = useState(workspace.branchId);
  const [list, setList] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
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

  async function detail(id: string) {
    const data: any = await apiClient.get(`/branches/${id}`);
    setSelected(data);
    workspace.setBranchId(String(data?.id || id));
    notify({ message: '支派详情查询完成' });
  }

  async function update() {
    if (!selected?.id) throw new Error('请选择支派');
    const data = await apiClient.put(`/branches/${selected.id}`, {
      branchName: selected.branchName,
      parentId: selected.parentId || null,
      description: selected.description || ''
    });
    setSelected(data);
    setResult({ message: '支派信息已更新', id: selected.id });
    notify({ message: '支派信息已更新' });
    await load();
  }

  async function remove() {
    if (!selected?.id) throw new Error('请选择支派');
    await apiClient.delete(`/branches/${selected.id}`);
    setSelected(undefined);
    setResult({ message: '支派已删除' });
    notify({ message: '支派已删除' });
    await load();
  }

  if (mode === 'query') {
    return (
      <div className="page-grid two">
        <Panel title="支派查询" description="按宗族查询支派树，点击表格行可查看详情。">
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
            onSelect={row => detail(String(row.id))}
          />
        </Panel>
        <Panel title="支派详情" description="维护支派名称、父支派和描述信息。">
          <DetailCard
            title="基础信息"
            data={selected}
            fields={[
              { label: '支派ID', value: row => row.id },
              { label: '支派名称', value: row => row.branchName },
              { label: '父支派ID', value: row => row.parentId },
              { label: '状态', value: row => row.status }
            ]}
          />
          {selected ? <>
            <Field label="支派名称"><input value={selected.branchName || ''} onChange={e => setSelected({ ...selected, branchName: e.target.value })} /></Field>
            <Field label="父支派ID"><input value={selected.parentId || ''} onChange={e => setSelected({ ...selected, parentId: e.target.value })} /></Field>
            <Field label="描述"><input value={selected.description || ''} onChange={e => setSelected({ ...selected, description: e.target.value })} /></Field>
            <Actions><button onClick={update}>保存修改</button><button className="danger" onClick={remove}>删除支派</button></Actions>
          </> : null}
          <ResultNotice result={result} />
        </Panel>
      </div>
    );
  }

  return (
    <Panel title="支派创建" description="新增宗族下的支派节点。">
      <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
      <Field label="支派名称"><input value={branchName} onChange={e => setBranchName(e.target.value)} /></Field>
      <Field label="父支派ID"><input value={parentId} onChange={e => setParentId(e.target.value)} /></Field>
      <Actions><button onClick={createBranch}>创建支派</button></Actions>
      <ResultNotice result={result} successText="支派创建成功" />
    </Panel>
  );
}
