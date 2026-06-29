import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Modal } from '../../shared/ui/Modal';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function RelationshipPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [fromPersonId, setFromPersonId] = useState(workspace.personId);
  const [toPersonId, setToPersonId] = useState('');
  const [relationType, setRelationType] = useState('parent_child');
  const [relationLabel, setRelationLabel] = useState('father');
  const [data, setData] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [result, setResult] = useState<unknown>();

  const body = () => ({
    fromPersonId: Number(fromPersonId),
    toPersonId: Number(toPersonId),
    relationType,
    relationLabel,
    isLineageRelation: relationType !== 'spouse',
    isBiological: relationType === 'parent_child',
    isPrimary: true,
    confidenceLevel: 'high'
  });

  async function check() {
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/relationships/check-conflict`, body());
    setResult({ message: res.conflict ? '存在关系冲突，请检查后再创建' : '预检通过，可以创建关系' });
    notify({ message: res.conflict ? '关系预检发现冲突' : '关系预检通过' });
  }

  async function create() {
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/relationships`, body());
    if (res?.id) workspace.patch({ relationshipId: String(res.id), personId: toPersonId || fromPersonId });
    setResult({ message: '关系创建成功', id: res?.id });
    setCreateOpen(false);
    notify({ message: '关系创建成功', id: res?.id });
    await list();
  }

  async function list() {
    const res = await apiClient.get(`/persons/${workspace.personId}/relationships`);
    setData(res);
    notify({ message: '关系查询完成' });
  }

  async function detail(id: string) {
    const res: any = await apiClient.get(`/relationships/${id}`);
    setSelected(res);
    workspace.setRelationshipId(String(res?.id || id));
    setDetailOpen(true);
    notify({ message: '关系详情查询完成' });
  }

  async function update() {
    if (!selected?.id) throw new Error('请选择关系');
    const res: any = await apiClient.put(`/relationships/${selected.id}`, {
      relationType: selected.relationType,
      relationLabel: selected.relationLabel,
      isLineageRelation: selected.isLineageRelation !== false,
      isBiological: selected.isBiological !== false,
      isPrimary: selected.isPrimary !== false,
      description: selected.description || '',
      confidenceLevel: selected.confidenceLevel || 'high'
    });
    setSelected(res);
    setResult({ message: '关系信息已更新', id: selected.id });
    notify({ message: '关系信息已更新' });
    await list();
  }

  async function remove() {
    if (!selected?.id) throw new Error('请选择关系');
    await apiClient.delete(`/relationships/${selected.id}`);
    setDetailOpen(false);
    setSelected(undefined);
    setResult({ message: '关系已删除' });
    notify({ message: '关系已删除' });
    await list();
  }

  return (
    <Panel title="关系管理" description="查询人物关系，创建和详情维护通过弹框完成。">
      <Field label="人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} /></Field>
      <Actions><button onClick={list}>查询关系</button><button className="secondary" onClick={() => setCreateOpen(true)}>新建关系</button></Actions>
      <DataTable
        data={data}
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'fromPersonId', title: '起点人物' },
          { key: 'toPersonId', title: '终点人物' },
          { key: 'relationType', title: '关系类型' },
          { key: 'relationLabel', title: '标签' },
          { key: 'dataStatus', title: '状态' }
        ]}
        onSelect={row => detail(String(row.id))}
      />
      <ResultNotice result={result} />

      <Modal open={createOpen} title="新建关系" onClose={() => setCreateOpen(false)}>
        <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
        <Field label="关系起点人物ID"><input value={fromPersonId} onChange={e => setFromPersonId(e.target.value)} /></Field>
        <Field label="关系终点人物ID"><input value={toPersonId} onChange={e => setToPersonId(e.target.value)} /></Field>
        <Field label="关系类型"><select value={relationType} onChange={e => setRelationType(e.target.value)}><option value="parent_child">亲子</option><option value="spouse">配偶</option><option value="adoptive">养育/收养</option></select></Field>
        <Field label="关系标签"><input value={relationLabel} onChange={e => setRelationLabel(e.target.value)} /></Field>
        <Actions><button className="secondary" onClick={check}>冲突预检</button><button onClick={create}>保存</button><button className="secondary" onClick={() => setCreateOpen(false)}>取消</button></Actions>
      </Modal>

      <Modal open={detailOpen} title="关系详情" onClose={() => setDetailOpen(false)} width={820}>
        <DetailCard
          title="基础信息"
          data={selected}
          fields={[
            { label: '关系ID', value: row => row.id },
            { label: '起点人物', value: row => row.fromPersonId },
            { label: '终点人物', value: row => row.toPersonId },
            { label: '关系类型', value: row => row.relationType },
            { label: '关系标签', value: row => row.relationLabel },
            { label: '状态', value: row => row.dataStatus }
          ]}
        />
        {selected ? <>
          <Field label="关系类型"><select value={selected.relationType || 'parent_child'} onChange={e => setSelected({ ...selected, relationType: e.target.value })}><option value="parent_child">亲子</option><option value="spouse">配偶</option><option value="adoptive">养育/收养</option></select></Field>
          <Field label="关系标签"><input value={selected.relationLabel || ''} onChange={e => setSelected({ ...selected, relationLabel: e.target.value })} /></Field>
          <Field label="可信度"><select value={selected.confidenceLevel || 'high'} onChange={e => setSelected({ ...selected, confidenceLevel: e.target.value })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></Field>
          <Field label="描述"><input value={selected.description || ''} onChange={e => setSelected({ ...selected, description: e.target.value })} /></Field>
          <Actions><button onClick={update}>保存修改</button><button className="danger" onClick={remove}>删除关系</button></Actions>
        </> : null}
      </Modal>
    </Panel>
  );
}
