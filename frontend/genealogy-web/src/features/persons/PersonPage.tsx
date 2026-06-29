import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Modal } from '../../shared/ui/Modal';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function PersonPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [generationNo, setGenerationNo] = useState('');
  const [generationWord, setGenerationWord] = useState('');
  const [data, setData] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [result, setResult] = useState<unknown>();

  async function create() {
    const payload = {
      branchId: workspace.branchId ? Number(workspace.branchId) : null,
      name,
      gender,
      generationNo: generationNo ? Number(generationNo) : null,
      generationWord,
      isLiving: true,
      privacyLevel: 'clan_only'
    };
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/persons`, payload);
    if (res?.id) workspace.setPersonId(String(res.id));
    setResult({ message: '人物创建成功', id: res?.id });
    setCreateOpen(false);
    notify({ message: '人物创建成功', id: res?.id });
    await list();
  }

  async function list() {
    const path = workspace.branchId
      ? `/clans/${workspace.clanId}/branches/${workspace.branchId}/persons`
      : `/clans/${workspace.clanId}/persons`;
    const res = await apiClient.get(path);
    setData(res);
    notify({ message: '人物列表查询完成' });
  }

  async function detail(id: string) {
    const res: any = await apiClient.get(`/persons/${id}`);
    setSelected(res);
    workspace.setPersonId(String(res?.id || id));
    setDetailOpen(true);
    notify({ message: '人物详情查询完成' });
  }

  async function update() {
    if (!selected?.id) throw new Error('请选择人物');
    const res: any = await apiClient.put(`/persons/${selected.id}`, {
      branchId: selected.branchId || null,
      name: selected.name,
      gender: selected.gender,
      generationNo: selected.generationNo || null,
      generationWord: selected.generationWord || '',
      isLiving: selected.isLiving !== false,
      privacyLevel: selected.privacyLevel || 'clan_only'
    });
    setSelected(res);
    setResult({ message: '人物信息已更新', id: selected.id });
    notify({ message: '人物信息已更新' });
    await list();
  }

  async function remove() {
    if (!selected?.id) throw new Error('请选择人物');
    await apiClient.delete(`/persons/${selected.id}`);
    setDetailOpen(false);
    setSelected(undefined);
    setResult({ message: '人物已删除' });
    notify({ message: '人物已删除' });
    await list();
  }

  return (
    <Panel title="人物管理" description="按宗族或支派查询人物，创建和详情维护通过弹框完成。">
      <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
      <Field label="支派ID"><input value={workspace.branchId} onChange={e => workspace.setBranchId(e.target.value)} placeholder="可选" /></Field>
      <Actions><button onClick={list}>查询人物</button><button className="secondary" onClick={() => setCreateOpen(true)}>新建人物</button></Actions>
      <DataTable
        data={data}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: '姓名' },
          { key: 'gender', title: '性别' },
          { key: 'generationNo', title: '代次' },
          { key: 'generationWord', title: '字辈' },
          { key: 'dataStatus', title: '状态' }
        ]}
        onSelect={row => detail(String(row.id || row.personId))}
      />
      <ResultNotice result={result} />

      <Modal open={createOpen} title="新建人物" onClose={() => setCreateOpen(false)}>
        <Field label="姓名"><input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="性别"><select value={gender} onChange={e => setGender(e.target.value)}><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field>
        <Field label="代次"><input value={generationNo} onChange={e => setGenerationNo(e.target.value)} /></Field>
        <Field label="字辈"><input value={generationWord} onChange={e => setGenerationWord(e.target.value)} /></Field>
        <Actions><button onClick={create}>保存</button><button className="secondary" onClick={() => setCreateOpen(false)}>取消</button></Actions>
      </Modal>

      <Modal open={detailOpen} title="人物详情" onClose={() => setDetailOpen(false)} width={820}>
        <DetailCard
          title="基础信息"
          data={selected}
          fields={[
            { label: '人物ID', value: row => row.id },
            { label: '姓名', value: row => row.name },
            { label: '性别', value: row => row.gender },
            { label: '支派ID', value: row => row.branchId },
            { label: '代次', value: row => row.generationNo },
            { label: '字辈', value: row => row.generationWord },
            { label: '状态', value: row => row.dataStatus }
          ]}
        />
        {selected ? <>
          <Field label="姓名"><input value={selected.name || ''} onChange={e => setSelected({ ...selected, name: e.target.value })} /></Field>
          <Field label="性别"><select value={selected.gender || 'unknown'} onChange={e => setSelected({ ...selected, gender: e.target.value })}><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field>
          <Field label="支派ID"><input value={selected.branchId || ''} onChange={e => setSelected({ ...selected, branchId: e.target.value })} /></Field>
          <Field label="代次"><input value={selected.generationNo || ''} onChange={e => setSelected({ ...selected, generationNo: e.target.value })} /></Field>
          <Field label="字辈"><input value={selected.generationWord || ''} onChange={e => setSelected({ ...selected, generationWord: e.target.value })} /></Field>
          <Actions><button onClick={update}>保存修改</button><button className="danger" onClick={remove}>删除人物</button></Actions>
        </> : null}
      </Modal>
    </Panel>
  );
}
