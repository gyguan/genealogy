import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function PersonPage({ notify, mode = 'create' }: { notify: (data: unknown, error?: boolean) => void; mode?: 'create' | 'query' }) {
  const workspace = useWorkspace();
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [generationNo, setGenerationNo] = useState('');
  const [generationWord, setGenerationWord] = useState('');
  const [data, setData] = useState<unknown>();
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
    const res = await apiClient.get(`/clans/${workspace.clanId}/persons`);
    setData(res);
    notify({ message: '人物列表查询完成' });
  }

  async function detail() {
    const res = await apiClient.get(`/persons/${workspace.personId}`);
    setData(res);
    notify({ message: '人物详情查询完成' });
  }

  if (mode === 'query') {
    return (
      <Panel title="人物查询" description="查询人物列表或人物详情。点击列表行可选中人物。">
        <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
        <Field label="人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} /></Field>
        <Actions><button onClick={list}>查询列表</button><button className="secondary" onClick={detail}>查询详情</button></Actions>
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
          onSelect={row => workspace.setPersonId(String(row.id || row.personId))}
        />
      </Panel>
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
