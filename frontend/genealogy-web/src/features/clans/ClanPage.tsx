import { useState } from 'react';
import { apiClient, PageResponse } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function ClanPage({ notify, mode = 'create' }: { notify: (data: unknown, error?: boolean) => void; mode?: 'create' | 'query' }) {
  const workspace = useWorkspace();
  const [form, setForm] = useState({ clanName: '', surname: '', clanCode: '', hallName: '', originPlace: '' });
  const [list, setList] = useState<PageResponse<any> | null>(null);
  const [result, setResult] = useState<unknown>();

  function set(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })); }

  async function create() {
    const data: any = await apiClient.post('/clans', form);
    if (data?.id) workspace.setClanId(String(data.id));
    setResult(data);
    notify({ message: '宗族创建成功', id: data?.id });
  }

  async function load() {
    const data = await apiClient.get<PageResponse<any>>('/clans');
    setList(data);
    const first = data.records?.[0];
    if (!workspace.clanId && first?.id) workspace.setClanId(String(first.id));
    notify({ message: `已查询到 ${data.records?.length || 0} 个宗族` });
  }

  if (mode === 'query') {
    return (
      <Panel title="宗族查询" description="查询当前用户可访问的宗族列表。点击表格行可设置当前工作区宗族ID。">
        <Actions><button onClick={load}>查询宗族</button></Actions>
        <DataTable
          data={list}
          columns={[
            { key: 'id', title: 'ID' },
            { key: 'clanName', title: '宗族名称' },
            { key: 'surname', title: '姓氏' },
            { key: 'clanCode', title: '编码' },
            { key: 'hallName', title: '堂号' }
          ]}
          onSelect={row => workspace.setClanId(String(row.id))}
        />
      </Panel>
    );
  }

  return (
    <Panel title="宗族创建" description="宗族是所有人物、支派和审核数据的根范围。创建成功后会自动写入顶部工作区。">
      <Field label="宗族名称"><input value={form.clanName} onChange={e => set('clanName', e.target.value)} /></Field>
      <Field label="姓氏"><input value={form.surname} onChange={e => set('surname', e.target.value)} /></Field>
      <Field label="编码"><input value={form.clanCode} onChange={e => set('clanCode', e.target.value)} /></Field>
      <Field label="堂号"><input value={form.hallName} onChange={e => set('hallName', e.target.value)} /></Field>
      <Field label="发源地"><input value={form.originPlace} onChange={e => set('originPlace', e.target.value)} /></Field>
      <Actions><button onClick={create}>创建宗族</button></Actions>
      <ResultNotice result={result} successText="宗族创建成功" />
    </Panel>
  );
}
