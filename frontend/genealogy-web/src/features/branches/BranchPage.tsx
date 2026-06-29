import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { DataTable } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Modal } from '../../shared/ui/Modal';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function BranchPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [clanId, setClanId] = useState(workspace.clanId);
  const [branchName, setBranchName] = useState('');
  const [parentId, setParentId] = useState(workspace.branchId);
  const [list, setList] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>();

  async function run(action: () => Promise<void>) {
    if (loading) return;
    setLoading(true);
    try {
      await action();
    } catch (error) {
      notify({ message: (error as Error).message || '操作失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function createBranch() {
    await run(async () => {
      const data: any = await apiClient.post(`/clans/${clanId}/branches`, {
        branchName,
        parentId: parentId ? Number(parentId) : null
      });
      if (data?.id) workspace.patch({ clanId, branchId: String(data.id) });
      setResult({ message: '支派创建成功', id: data?.id });
      setCreateOpen(false);
      notify({ message: '支派创建成功', id: data?.id });
      await load();
    });
  }

  async function load() {
    const data: any = await apiClient.get(`/clans/${clanId}/branches`);
    setList(data);
    if (!workspace.branchId && Array.isArray(data) && data[0]?.id) workspace.setBranchId(String(data[0].id));
    workspace.setClanId(clanId);
    notify({ message: '支派查询完成' });
  }

  async function detail(id: string) {
    await run(async () => {
      const data: any = await apiClient.get(`/branches/${id}`);
      setSelected(data);
      workspace.setBranchId(String(data?.id || id));
      setDetailOpen(true);
      notify({ message: '支派详情查询完成' });
    });
  }

  async function update() {
    await run(async () => {
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
    });
  }

  async function remove() {
    await run(async () => {
      if (!selected?.id) throw new Error('请选择支派');
      await apiClient.delete(`/branches/${selected.id}`);
      setDeleteOpen(false);
      setDetailOpen(false);
      setSelected(undefined);
      setResult({ message: '支派已删除' });
      notify({ message: '支派已删除' });
      await load();
    });
  }

  return (
    <Panel title="支派管理" description="按宗族查询支派树，新增和详情维护通过弹框完成。">
      <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
      <Actions><button disabled={loading} onClick={() => run(load)}>{loading ? '处理中...' : '查询支派'}</button><button className="secondary" onClick={() => setCreateOpen(true)}>新建支派</button></Actions>
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
      <ResultNotice result={result} />

      <Modal open={createOpen} title="新建支派" onClose={() => setCreateOpen(false)}>
        <Field label="支派名称"><input value={branchName} onChange={e => setBranchName(e.target.value)} /></Field>
        <Field label="父支派ID"><input value={parentId} onChange={e => setParentId(e.target.value)} /></Field>
        <Actions><button disabled={loading} onClick={createBranch}>{loading ? '保存中...' : '保存'}</button><button className="secondary" onClick={() => setCreateOpen(false)}>取消</button></Actions>
      </Modal>

      <Modal open={detailOpen} title="支派详情" onClose={() => setDetailOpen(false)}>
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
          <Actions><button disabled={loading} onClick={update}>保存修改</button><button className="danger" onClick={() => setDeleteOpen(true)}>删除支派</button></Actions>
        </> : null}
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="删除支派"
        description="删除支派可能影响该支派下的人物归属和后续查询，请确认后继续。"
        confirmText="确认删除"
        danger
        onConfirm={remove}
        onClose={() => setDeleteOpen(false)}
      />
    </Panel>
  );
}
