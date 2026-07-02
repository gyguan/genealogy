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

  function requireSelectedScheme() {
    if (!schemeId) {
      notify({ message: '请先创建或选择字辈方案，方案ID由系统自动生成' }, true);
      return false;
    }
    return true;
  }

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
    setResult({ message: '字辈方案创建成功，方案ID由系统自动生成', id: res?.id });
    notify({ message: '字辈方案创建成功，方案ID由系统自动生成', id: res?.id });
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
    if (!requireSelectedScheme()) return;
    const res: any = await apiClient.post(`/generation-schemes/${schemeId}/items`, { generationNo: Number(generationNo), word });
    setResult({ message: '字辈明细已追加', id: res?.id });
    notify({ message: '字辈明细已追加', id: res?.id });
    await listWords();
  }

  async function listWords() {
    if (!requireSelectedScheme()) return;
    const res = await apiClient.get(`/generation-schemes/${schemeId}/items`);
    setItems(res);
    notify({ message: '字辈明细查询完成' });
  }

  async function queryWord() {
    if (!requireSelectedScheme()) return;
    const res = await apiClient.get(`/generation-schemes/${schemeId}/items/${generationNo}`);
    setItems([res]);
    notify({ message: '字辈查询完成' });
  }

  return (
    <div className="page-grid two">
      <Panel title="字辈方案" description="创建和查询宗族字辈方案，方案ID由系统自动生成。">
        <Field label="字辈方案名称"><input value={schemeName} onChange={e => setSchemeName(e.target.value)} placeholder="例如：黄氏宗族总派语" /></Field>
        <Actions><button onClick={createScheme}>创建方案</button><button className="secondary" onClick={listSchemes}>查询方案</button></Actions>
        <DataTable
          data={schemes}
          columns={[
            { key: 'id', title: '系统生成ID' },
            { key: 'schemeName', title: '字辈方案名称' },
            { key: 'status', title: '状态' }
          ]}
          onSelect={selectScheme}
        />
        <ResultNotice result={result} />
      </Panel>
      <Panel title="字辈明细" description="先创建或选择字辈方案，再维护该方案下的代次与字辈。">
        <DetailCard
          title="当前字辈方案"
          data={selectedScheme}
          fields={[
            { label: '系统生成ID', value: row => row.id },
            { label: '字辈方案名称', value: row => row.schemeName },
            { label: '状态', value: row => row.status }
          ]}
        />
        <Field label="当前方案"><input value={schemeId ? `系统生成ID：${schemeId}` : '创建或选择方案后自动生成'} disabled readOnly /></Field>
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
