import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function GenerationPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [schemeId, setSchemeId] = useState('');
  const [schemeName, setSchemeName] = useState('');
  const [generationNo, setGenerationNo] = useState('');
  const [word, setWord] = useState('');
  const [schemes, setSchemes] = useState<unknown>();
  const [selectedScheme, setSelectedScheme] = useState<any>();
  const [items, setItems] = useState<unknown>();
  const [result, setResult] = useState<unknown>();

  async function createScheme() {
    if (!workspace.clanId) throw new Error('请先选择宗族');
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/generation-schemes`, {
      branchId: workspace.branchId ? Number(workspace.branchId) : null,
      schemeName,
      isDefault: true,
      validationEnabled: true,
      strictMode: false
    });
    if (res?.id) {
      setSchemeId(String(res.id));
      setSelectedScheme(res);
    }
    setResult({ message: '字辈方案创建成功' });
    notify({ message: '字辈方案创建成功' });
  }

  async function listSchemes() {
    if (!workspace.clanId) throw new Error('请先选择宗族');
    const res = await apiClient.get(`/clans/${workspace.clanId}/generation-schemes`);
    setSchemes(res);
    notify({ message: '字辈方案查询完成' });
  }

  async function selectScheme(row: any) {
    setSelectedScheme(row);
    setSchemeId(String(row.id));
    const res = await apiClient.get(`/generation-schemes/${row.id}/items`);
    setItems(res);
  }

  async function addWord() {
    if (!schemeId) throw new Error('请先选择字辈方案');
    const res: any = await apiClient.post(`/generation-schemes/${schemeId}/items`, { generationNo: Number(generationNo), word });
    setResult({ message: '字辈明细已追加' });
    notify({ message: '字辈明细已追加' });
    await listWords();
  }

  async function listWords() {
    if (!schemeId) throw new Error('请先选择字辈方案');
    const res = await apiClient.get(`/generation-schemes/${schemeId}/items`);
    setItems(res);
    notify({ message: '字辈明细查询完成' });
  }

  async function queryWord() {
    if (!schemeId) throw new Error('请先选择字辈方案');
    const res = await apiClient.get(`/generation-schemes/${schemeId}/items/${generationNo}`);
    setItems([res]);
    notify({ message: '字辈查询完成' });
  }

  return (
    <div className="page-grid two">
      <Panel title="字辈方案" description="创建和查询当前宗族下的字辈方案。">
        <Field label="方案名称"><input value={schemeName} onChange={e => setSchemeName(e.target.value)} /></Field>
        <Actions><button onClick={createScheme}>创建方案</button><button className="secondary" onClick={listSchemes}>查询方案</button></Actions>
        <DataTable
          data={schemes}
          columns={[
            { key: 'schemeName', title: '方案名称' },
            { key: 'status', title: '状态' }
          ]}
          onSelect={selectScheme}
        />
        <ResultNotice result={result} />
      </Panel>
      <Panel title="字辈明细" description="选择方案后维护代次与字辈。">
        <DetailCard
          title="方案信息"
          data={selectedScheme}
          fields={[
            { label: '方案名称', value: row => row.schemeName },
            { label: '状态', value: row => row.status }
          ]}
        />
        <Field label="代次"><input value={generationNo} onChange={e => setGenerationNo(e.target.value)} /></Field>
        <Field label="字辈"><input value={word} onChange={e => setWord(e.target.value)} /></Field>
        <Actions><button disabled={!schemeId} onClick={addWord}>追加字辈</button><button className="secondary" disabled={!schemeId} onClick={listWords}>查看明细</button><button className="secondary" disabled={!schemeId} onClick={queryWord}>按代次查询</button></Actions>
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