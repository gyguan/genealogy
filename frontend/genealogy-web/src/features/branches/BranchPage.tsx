import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { DataTable, toRecordList } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Modal } from '../../shared/ui/Modal';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

import { feedback } from '../../shared/ui/OperationFeedback';

function optionalNumber(value: unknown) {
  const text = String(value ?? '').trim();
  return text ? Number(text) : null;
}

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function BranchPage({}: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [branchName, setBranchName] = useState('');
  const [parentId, setParentId] = useState(workspace.branchId);
  const [list, setList] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>();

  const branches = toRecordList<any>(list);

  function branchNameById(id: unknown) {
    const target = String(id ?? '');
    if (!target) return '-';
    return display(branches.find(branch => String(branch.id) === target)?.branchName, '上级支派');
  }

  async function run(action: () => Promise<void>) {
    if (loading) return;
    setLoading(true);
    try {
      await action();
    } catch (error) {
      feedback.from({ message: (error as Error).message || '操作失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function createBranch() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请先选择宗族');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/branches`, {
        branchName,
        parentId: optionalNumber(parentId),
        managerMemberId: null
      });
      if (data?.id) workspace.patch({ branchId: String(data.id) });
      setResult({ message: '支派创建成功' });
      setCreateOpen(false);
      setBranchName('');
      setParentId('');
      feedback.from({ message: '支派创建成功' });
      await load();
    });
  }

  async function load() {
    if (!workspace.clanId) throw new Error('请先选择宗族');
    const data: any = await apiClient.get(`/clans/${workspace.clanId}/branches`);
    setList(data);
    if (!workspace.branchId && Array.isArray(data) && data[0]?.id) workspace.setBranchId(String(data[0].id));
    feedback.from({ message: '支派查询完成' });
  }

  async function detail(id: string) {
    await run(async () => {
      const data: any = await apiClient.get(`/branches/${id}`);
      setSelected(data);
      workspace.setBranchId(String(data?.id || id));
      setDetailOpen(true);
      feedback.from({ message: '支派详情查询完成' });
    });
  }

  async function update() {
    await run(async () => {
      if (!selected?.id) throw new Error('请选择支派');
      const data = await apiClient.put(`/branches/${selected.id}`, {
        branchName: selected.branchName,
        parentId: optionalNumber(selected.parentId),
        sortOrder: selected.sortOrder ?? 0,
        founderPersonId: optionalNumber(selected.founderPersonId),
        migrationFrom: selected.migrationFrom || '',
        migrationTo: selected.migrationTo || '',
        managerMemberId: optionalNumber(selected.managerMemberId),
        description: selected.description || '',
        status: selected.status || 'active'
      });
      setSelected(data);
      setResult({ message: '支派信息已更新' });
      feedback.from({ message: '支派信息已更新' });
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
      feedback.from({ message: '支派已删除' });
      await load();
    });
  }

  return (
    <Panel title="支派管理" description="按当前宗族查询支派树，可维护支派层级、迁徙信息和基础描述。">
      <Actions><button disabled={loading || !workspace.clanId} onClick={() => run(load)}>{loading ? '处理中...' : '查询支派'}</button><button className="secondary" disabled={!workspace.clanId} onClick={() => setCreateOpen(true)}>新建支派</button></Actions>
      <DataTable
        data={list}
        columns={[
          { key: 'branchName', title: '支派名称' },
          { key: 'parentId', title: '上级支派', render: row => branchNameById(row.parentId) },
          { key: 'status', title: '状态' }
        ]}
        onSelect={row => detail(String(row.id))}
      />
      <ResultNotice result={result} />

      <Modal open={createOpen} title="新建支派" onClose={() => setCreateOpen(false)}>
        <Field label="支派名称"><input value={branchName} onChange={e => setBranchName(e.target.value)} /></Field>
        <Field label="上级支派">
          <select value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">根支派</option>
            {branches.map(branch => <option key={branch.id} value={String(branch.id)}>{display(branch.branchName, '未命名支派')}</option>)}
          </select>
        </Field>
        <Actions><button disabled={loading} onClick={createBranch}>{loading ? '保存中...' : '保存'}</button><button className="secondary" onClick={() => setCreateOpen(false)}>取消</button></Actions>
      </Modal>

      <Modal open={detailOpen} title="支派详情" onClose={() => setDetailOpen(false)}>
        <DetailCard
          title="基础信息"
          data={selected}
          fields={[
            { label: '支派名称', value: row => row.branchName },
            { label: '上级支派', value: row => branchNameById(row.parentId) },
            { label: '状态', value: row => row.status }
          ]}
        />
        {selected ? <>
          <Field label="支派名称"><input value={selected.branchName || ''} onChange={e => setSelected({ ...selected, branchName: e.target.value })} /></Field>
          <Field label="上级支派">
            <select value={selected.parentId || ''} onChange={e => setSelected({ ...selected, parentId: e.target.value })}>
              <option value="">根支派</option>
              {branches.filter(branch => String(branch.id) !== String(selected.id)).map(branch => <option key={branch.id} value={String(branch.id)}>{display(branch.branchName, '未命名支派')}</option>)}
            </select>
          </Field>
          <Field label="排序"><input value={selected.sortOrder ?? 0} onChange={e => setSelected({ ...selected, sortOrder: Number(e.target.value || 0) })} /></Field>
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