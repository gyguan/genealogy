import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function PersonPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const [clanId, setClanId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [name, setName] = useState('');
  const [generationNo, setGenerationNo] = useState('');
  const [generationWord, setGenerationWord] = useState('');
  const [personId, setPersonId] = useState('');
  const [data, setData] = useState<unknown>();

  async function create() {
    const payload = {
      branchId: branchId ? Number(branchId) : null,
      name,
      gender: 'male',
      generationNo: generationNo ? Number(generationNo) : null,
      generationWord,
      isLiving: true,
      privacyLevel: 'clan_only'
    };
    const res = await apiClient.post(`/clans/${clanId}/persons`, payload);
    notify(res);
  }

  async function list() {
    const res = await apiClient.get(`/clans/${clanId}/persons`);
    setData(res);
    notify(res);
  }

  async function detail() {
    const res = await apiClient.get(`/persons/${personId}`);
    setData(res);
    notify(res);
  }

  return (
    <div className="page-grid two">
      <Panel title="人物档案" description="录入人物并验证字辈、支派、隐私脱敏等规则。">
        <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
        <Field label="支派ID"><input value={branchId} onChange={e => setBranchId(e.target.value)} /></Field>
        <Field label="姓名"><input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="代次"><input value={generationNo} onChange={e => setGenerationNo(e.target.value)} /></Field>
        <Field label="字辈"><input value={generationWord} onChange={e => setGenerationWord(e.target.value)} /></Field>
        <Actions><button onClick={create}>创建人物</button><button className="secondary" onClick={list}>查询列表</button></Actions>
      </Panel>
      <Panel title="人物查询" description="可输入人物ID查看单个人物详情。">
        <Field label="人物ID"><input value={personId} onChange={e => setPersonId(e.target.value)} /></Field>
        <Actions><button onClick={detail}>查询详情</button></Actions>
        <DataBlock data={data} />
      </Panel>
    </div>
  );
}
