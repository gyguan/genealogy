import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function GenerationPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const [clanId, setClanId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [schemeId, setSchemeId] = useState('');
  const [schemeName, setSchemeName] = useState('');
  const [generationNo, setGenerationNo] = useState('');
  const [word, setWord] = useState('');
  const [data, setData] = useState<unknown>();

  async function createScheme() {
    const res = await apiClient.post(`/clans/${clanId}/generation-schemes`, {
      branchId: branchId ? Number(branchId) : null,
      schemeName,
      isDefault: true,
      validationEnabled: true,
      strictMode: false
    });
    setData(res);
    notify(res);
  }

  async function addWord() {
    const res = await apiClient.post(`/generation-schemes/${schemeId}/items`, { generationNo: Number(generationNo), word });
    setData(res);
    notify(res);
  }

  async function listWords() {
    const res = await apiClient.get(`/generation-schemes/${schemeId}/items`);
    setData(res);
    notify(res);
  }

  return (
    <div className="page-grid two">
      <Panel title="字辈方案" description="控制人物代次和字辈校验规则。">
        <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
        <Field label="支派ID"><input value={branchId} onChange={e => setBranchId(e.target.value)} /></Field>
        <Field label="方案名称"><input value={schemeName} onChange={e => setSchemeName(e.target.value)} /></Field>
        <Actions><button onClick={createScheme}>创建方案</button></Actions>
      </Panel>
      <Panel title="字辈明细">
        <Field label="方案ID"><input value={schemeId} onChange={e => setSchemeId(e.target.value)} /></Field>
        <Field label="代次"><input value={generationNo} onChange={e => setGenerationNo(e.target.value)} /></Field>
        <Field label="字辈"><input value={word} onChange={e => setWord(e.target.value)} /></Field>
        <Actions><button onClick={addWord}>追加字辈</button><button className="secondary" onClick={listWords}>查看明细</button></Actions>
        <DataBlock data={data} />
      </Panel>
    </div>
  );
}
