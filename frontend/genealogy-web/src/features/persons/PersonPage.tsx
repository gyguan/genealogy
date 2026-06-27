import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function PersonPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [name, setName] = useState('');
  const [generationNo, setGenerationNo] = useState('');
  const [generationWord, setGenerationWord] = useState('');
  const [data, setData] = useState<unknown>();

  async function create() {
    const payload = {
      branchId: workspace.branchId ? Number(workspace.branchId) : null,
      name,
      gender: 'male',
      generationNo: generationNo ? Number(generationNo) : null,
      generationWord,
      isLiving: true,
      privacyLevel: 'clan_only'
    };
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/persons`, payload);
    if (res?.id) workspace.setPersonId(String(res.id));
    setData(res);
    notify(res);
  }

  async function list() {
    const res = await apiClient.get(`/clans/${workspace.clanId}/persons`);
    setData(res);
    notify(res);
  }

  async function detail() {
    const res = await apiClient.get(`/persons/${workspace.personId}`);
    setData(res);
    notify(res);
  }

  return (
    <div className="page-grid two">
      <Panel title="人物档案" description="录入人物并验证字辈、支派、隐私脱敏等规则。宗族/支派 ID 来自工作台上下文。">
        <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
        <Field label="当前支派ID"><input value={workspace.branchId} onChange={e => workspace.setBranchId(e.target.value)} /></Field>
        <Field label="姓名"><input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="代次"><input value={generationNo} onChange={e => setGenerationNo(e.target.value)} /></Field>
        <Field label="字辈"><input value={generationWord} onChange={e => setGenerationWord(e.target.value)} /></Field>
        <Actions><button onClick={create}>创建人物</button><button className="secondary" onClick={list}>查询列表</button></Actions>
      </Panel>
      <Panel title="人物查询" description="人物ID 与工作台上下文同步。">
        <Field label="当前人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} /></Field>
        <Actions><button onClick={detail}>查询详情</button></Actions>
        <DataBlock data={data} />
      </Panel>
    </div>
  );
}
