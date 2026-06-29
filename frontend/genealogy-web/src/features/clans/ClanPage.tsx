import { useState } from 'react';
import { apiClient, PageResponse } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function ClanPage({ notify, mode = 'create' }: { notify: (data: unknown, error?: boolean) => void; mode?: 'create' | 'query' }) {
  const workspace = useWorkspace();
  const [form, setForm] = useState({ clanName: '', surname: '', clanCode: '', hallName: '', originPlace: '' });
  const [list, setList] = useState<PageResponse<any> | null>(null);
  const [selected, setSelected] = useState<any>();
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

  async function detail(id = workspace.clanId) {
    if (!id) throw new Error('请选择宗族');
    const data = await apiClient.get(`/clans/${id}`);
    setSelected(data);
    workspace.setClanId(String((data as any)?.id || id));
    notify({ message: '宗族详情查询完成' });
  }

  async function update() {
    if (!selected?.id) throw new Error('请选择宗族');
    const data = await apiClient.put(`/clans/${selected.id}`, {
      clanName: selected.clanName,
      surname: selected.surname,
      clanCode: selected.clanCode,
      hallName: selected.hallName,
      originPlace: selected.originPlace
    });
    setSelected(data);
    setResult({ message: '宗族信息已更新', id: selected.id });
    notify({ message: '宗族信息已更新' });
    await load();
  }

  async function remove() {
    if (!selected?.id) throw new Error('请选择宗族');
    await apiClient.delete(`/clans/${selected.id}`);
    setSelected(undefined);
    setResult({ message: '宗族已删除' });
    notify({ message: '宗族已删除' });
    await load();
  }

  if (mode === 'query') {
    return (
      <div className="page-grid two">
        <Panel title="宗族查询" description="查询当前用户可访问的宗族列表。点击表格行可查看详情。">
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
            onSelect={row => detail(String(row.id))}
          />
        </Panel>
        <Panel title="宗族详情" description="维护宗族基础信息。">
          <DetailCard
            title="基础信息"
            data={selected}
            fields={[
              { label: '宗族ID', value: row => row.id },
              { label: '宗族名称', value: row => row.clanName },
              { label: '姓氏', value: row => row.surname },
              { label: '编码', value: row => row.clanCode },
              { label: '堂号', value: row => row.hallName },
              { label: '发源地', value: row => row.originPlace }
            ]}
          />
          {selected ? <>
            <Field label="宗族名称"><input value={selected.clanName || ''} onChange={e => setSelected({ ...selected, clanName: e.target.value })} /></Field>
            <Field label="堂号"><input value={selected.hallName || ''} onChange={e => setSelected({ ...selected, hallName: e.target.value })} /></Field>
            <Field label="发源地"><input value={selected.originPlace || ''} onChange={e => setSelected({ ...selected, originPlace: e.target.value })} /></Field>
            <Actions><button onClick={update}>保存修改</button><button className="danger" onClick={remove}>删除宗族</button></Actions>
          </> : null}
          <ResultNotice result={result} />
        </Panel>
      </div>
    );
  }

  return (
    <Panel title="宗族创建" description="宗族是所有人物、支派和审核数据的根范围。">
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
