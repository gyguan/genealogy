import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function GenerationPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [schemeId, setSchemeId] = useState('');
  const [schemeName, setSchemeName] = useState('');
  const [generationNo, setGenerationNo] = useState('');
  const [word, setWord] = useState('');
  const [items, setItems] = useState<unknown>();
  const [result, setResult] = useState<unknown>();

  async function createScheme() {
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/generation-schemes`, {
      branchId: workspace.branchId ? Number(workspace.branchId) : null,
      schemeName,
      isDefault: true,
      validationEnabled: true,
      strictMode: false
    });
    if (res?.id) setSchemeId(String(res.id));
    setResult({ message: '字辈方案创建成功', id: res?.id });
    notify({ message: '字辈方案创建成功', id: res?.id });
  }

  async function addWord() {
    const res: any = await apiClient.post(`/generation-schemes/${schemeId}/items`, { generationNo: Number(generationNo), word });
    setResult({ message: '字辈明细已追加', id: res?.id });
    notify({ message: '字辈明细已追加' });
  }

  async function listWords() {
    const res = await apiClient.get(`/generation-schemes/${schemeId}/items`);
    setItems(res);
    notify({ message: '字辈明细查询完成' });
  }

  return (
    <div className="page-grid two">
      <Panel title="字辈方案" description="控制人物代次和字辈校验规则。">
        <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
        <Field label="支派ID"><input value={workspace.branchId} onChange={e => workspace.setBranchId(e.target.value)} /></Field>
        <Field label="方案名称"><input value={schemeName} onChange={e => setSchemeName(e.target.value)} /></Field>
        <Actions><button onClick={createScheme}>创建方案</button></Actions>
        <ResultNotice result={result} />
      </Panel>
      <Panel title="字辈明细">
        <Field label="方案ID"><input value={schemeId} onChange={e => setSchemeId(e.target.value)} /></Field>
        <Field label="代次"><input value={generationNo} onChange={e => setGenerationNo(e.target.value)} /></Field>
        <Field label="字辈"><input value={word} onChange={e => setWord(e.target.value)} /></Field>
        <Actions><button onClick={addWord}>追加字辈</button><button className="secondary" onClick={listWords}>查看明细</button></Actions>
        <DataTable
          data={items}
          columns={[
            { key: 'generationNo', title: '代次' },
            { key: 'word', title: '字辈' },
            { key: 'meaning', title: '释义' }
          ]}
        />
      </Panel>
    </div>
  );
}
