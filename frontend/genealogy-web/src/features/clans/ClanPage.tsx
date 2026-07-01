import { useState } from 'react';
import { apiClient, PageResponse } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { DataTable } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Modal } from '../../shared/ui/Modal';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function ClanPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [form, setForm] = useState({ clanName: '', surname: '', hallName: '', originPlace: '' });
  const [list, setList] = useState<PageResponse<any> | null>(null);
  const [selected, setSelected] = useState<any>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>();

  function set(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })); }

  async function run(action: () => Promise<void>) {
    if (loading) return;
    setLoading(true);
    try {
      await action();
    } catch (error) {
      notify({ message: (error as Error).message || '操作失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    await run(async () => {
      const data: any = await apiClient.post('/clans', form);
      if (data?.id) workspace.setClanId(String(data.id));
      setResult({ message: '宗族创建成功，编码已自动生成' });
      setCreateOpen(false);
      notify({ message: '宗族创建成功，编码已自动生成' });
      await load();
    });
  }

  async function load() {
    const data = await apiClient.get<PageResponse<any>>('/clans');
    setList(data);
    const first = data.records?.[0];
    if (!workspace.clanId && first?.id) workspace.setClanId(String(first.id));
    notify({ message: `已查询到 ${data.records?.length || 0} 个宗族` });
  }

  async function detail(id: string) {
    await run(async () => {
      const data = await apiClient.get(`/clans/${id}`);
      setSelected(data);
      workspace.setClanId(String((data as any)?.id || id));
      setDetailOpen(true);
      notify({ message: '宗族详情查询完成' });
    });
  }

  async function update() {
    await run(async () => {
      if (!selected?.id) throw new Error('请选择宗族');
      const data = await apiClient.put(`/clans/${selected.id}`, {
        clanName: selected.clanName,
        surname: selected.surname,
        clanCode: selected.clanCode,
        hallName: selected.hallName,
        originPlace: selected.originPlace
      });
      setSelected(data);
      setResult({ message: '宗族信息已更新' });
      notify({ message: '宗族信息已更新' });
      await load();
    });
  }

  async function remove() {
    await run(async () => {
      if (!selected?.id) throw new Error('请选择宗族');
      await apiClient.delete(`/clans/${selected.id}`);
      setDeleteOpen(false);
      setDetailOpen(false);
      setSelected(undefined);
      setResult({ message: '宗族已删除' });
      notify({ message: '宗族已删除' });
      await load();
    });
  }

  return (
    <Panel title="宗族管理" description="查询宗族列表，新增和详情维护通过弹框完成。宗族编码由系统自动生成。">
      <Actions><button disabled={loading} onClick={() => run(load)}>{loading ? '处理中...' : '查询宗族'}</button><button className="secondary" onClick={() => setCreateOpen(true)}>新建宗族</button></Actions>
      <DataTable
        data={list}
        columns={[
          { key: 'clanName', title: '宗族名称' },
          { key: 'surname', title: '姓氏' },
          { key: 'clanCode', title: '系统编码' },
          { key: 'hallName', title: '堂号' }
        ]}
        onSelect={row => detail(String(row.id))}
      />
      <ResultNotice result={result} />

      <Modal open={createOpen} title="新建宗族" onClose={() => setCreateOpen(false)}>
        <Field label="宗族名称"><input value={form.clanName} onChange={e => set('clanName', e.target.value)} /></Field>
        <Field label="姓氏"><input value={form.surname} onChange={e => set('surname', e.target.value)} /></Field>
        <Field label="系统编码"><input value="保存后自动生成" disabled /></Field>
        <Field label="堂号"><input value={form.hallName} onChange={e => set('hallName', e.target.value)} /></Field>
        <Field label="发源地"><input value={form.originPlace} onChange={e => set('originPlace', e.target.value)} /></Field>
        <Actions><button disabled={loading} onClick={create}>{loading ? '保存中...' : '保存'}</button><button className="secondary" onClick={() => setCreateOpen(false)}>取消</button></Actions>
      </Modal>

      <Modal open={detailOpen} title="宗族详情" onClose={() => setDetailOpen(false)}>
        <DetailCard
          title="基础信息"
          data={selected}
          fields={[
            { label: '宗族名称', value: row => row.clanName },
            { label: '姓氏', value: row => row.surname },
            { label: '系统编码', value: row => row.clanCode },
            { label: '堂号', value: row => row.hallName },
            { label: '发源地', value: row => row.originPlace }
          ]}
        />
        {selected ? <>
          <Field label="宗族名称"><input value={selected.clanName || ''} onChange={e => setSelected({ ...selected, clanName: e.target.value })} /></Field>
          <Field label="堂号"><input value={selected.hallName || ''} onChange={e => setSelected({ ...selected, hallName: e.target.value })} /></Field>
          <Field label="发源地"><input value={selected.originPlace || ''} onChange={e => setSelected({ ...selected, originPlace: e.target.value })} /></Field>
          <Actions><button disabled={loading} onClick={update}>保存修改</button><button className="danger" onClick={() => setDeleteOpen(true)}>删除宗族</button></Actions>
        </> : null}
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="删除宗族"
        description="删除宗族会影响其下支派、人物和关系数据，请确认已经完成备份或核对。"
        confirmText="确认删除"
        danger
        onConfirm={remove}
        onClose={() => setDeleteOpen(false)}
      />
    </Panel>
  );
}