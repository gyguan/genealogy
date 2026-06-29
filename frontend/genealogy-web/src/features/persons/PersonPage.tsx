import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function PersonPage({ notify, mode = 'create' }: { notify: (data: unknown, error?: boolean) => void; mode?: 'create' | 'query' }) {
  const workspace = useWorkspace();
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [generationNo, setGenerationNo] = useState('');
  const [generationWord, setGenerationWord] = useState('');
  const [data, setData] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
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
    setResult(res);
    notify({ message: '人物创建成功', id: res?.id });
  }

  async function list() {
    const path = workspace.branchId
      ? `/clans/${workspace.clanId}/branches/${workspace.branchId}/persons`
      : `/clans/${workspace.clanId}/persons`;
    const res = await apiClient.get(path);
    setData(res);
    notify({ message: '人物列表查询完成' });
  }

  async function detail(id = workspace.personId) {
    if (!id) throw new Error('请选择人物');
    const res: any = await apiClient.get(`/persons/${id}`);
    setSelected(res);
    workspace.setPersonId(String(res?.id || id));
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
    setSelected(undefined);
    setResult({ message: '人物已删除' });
    notify({ message: '人物已删除' });
    await list();
  }

  if (mode === 'query') {
    return (
      <div className="page-grid two">
        <Panel title="人物查询" description="按宗族或支派查询人物列表，点击表格行可查看详情。">
          <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
          <Field label="支派ID"><input value={workspace.branchId} onChange={e => workspace.setBranchId(e.target.value)} placeholder="可选" /></Field>
          <Field label="人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} /></Field>
          <Actions><button onClick={list}>查询列表</button><button className="secondary" onClick={() => detail()}>查询详情</button></Actions>
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
        </Panel>
        <Panel title="人物详情" description="维护人物基础档案。">
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
          <ResultNotice result={result} />
        </Panel>
      </div>
    );
  }

  return (
    <Panel title="人物创建" description="录入人物档案，创建成功后可继续维护关系、来源和审核。">
      <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
      <Field label="支派ID"><input value={workspace.branchId} onChange={e => workspace.setBranchId(e.target.value)} /></Field>
      <Field label="姓名"><input value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field label="性别"><select value={gender} onChange={e => setGender(e.target.value)}><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field>
      <Field label="代次"><input value={generationNo} onChange={e => setGenerationNo(e.target.value)} /></Field>
      <Field label="字辈"><input value={generationWord} onChange={e => setGenerationWord(e.target.value)} /></Field>
      <Actions><button onClick={create}>创建人物</button></Actions>
      <ResultNotice result={result} successText="人物创建成功" />
    </Panel>
  );
}
