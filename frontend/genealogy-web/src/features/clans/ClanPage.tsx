import { useState } from 'react';
import { apiClient, PageResponse } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function ClanPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [form, setForm] = useState({ clanName: '', surname: '', clanCode: '', hallName: '', originPlace: '' });
  const [list, setList] = useState<PageResponse<any> | null>(null);

  function set(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })); }

  async function create() {
    const data: any = await apiClient.post('/clans', form);
    if (data?.id) workspace.setClanId(String(data.id));
    notify(data);
    await load();
  }

  async function load() {
    const data = await apiClient.get<PageResponse<any>>('/clans');
    setList(data);
    const first = data.records?.[0];
    if (!workspace.clanId && first?.id) workspace.setClanId(String(first.id));
    notify(data);
  }

  return (
    <div className="page-grid two">
      <Panel title="创建宗族" description="宗族是所有人物、支派和审核数据的根范围。创建成功后会自动写入顶部工作区。">
        <Field label="宗族名称"><input value={form.clanName} onChange={e => set('clanName', e.target.value)} /></Field>
        <Field label="姓氏"><input value={form.surname} onChange={e => set('surname', e.target.value)} /></Field>
        <Field label="编码"><input value={form.clanCode} onChange={e => set('clanCode', e.target.value)} /></Field>
        <Field label="堂号"><input value={form.hallName} onChange={e => set('hallName', e.target.value)} /></Field>
        <Field label="发源地"><input value={form.originPlace} onChange={e => set('originPlace', e.target.value)} /></Field>
        <Actions><button onClick={create}>创建宗族</button><button className="secondary" onClick={load}>刷新列表</button></Actions>
      </Panel>
      <Panel title="宗族列表" description="点击列表刷新后，如工作区没有宗族ID，会自动取第一条记录。">
        <DataBlock data={list} />
      </Panel>
    </div>
  );
}
