import { useState } from 'react';
import { Alert, Tag } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { DataTable } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Modal } from '../../shared/ui/Modal';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

type RelationshipPreset = {
  title: string;
  group: '基础关系' | '收养关系' | '承嗣关系';
  type: string;
  label: string;
  lineage: boolean;
  biological: boolean;
  primary: boolean;
  direction: string;
  tip: string;
  description: string;
};

const relationshipPresets: RelationshipPreset[] = [
  { title: '亲生父亲', group: '基础关系', type: 'parent_child', label: 'father', lineage: true, biological: true, primary: true, direction: '起点=父亲，终点=子女', tip: '用于正常血缘父子/父女世系。', description: '亲生父亲关系，参与世系校验和代次校验。' },
  { title: '亲生母亲', group: '基础关系', type: 'parent_child', label: 'mother', lineage: true, biological: true, primary: true, direction: '起点=母亲，终点=子女', tip: '用于正常血缘母子/母女世系。', description: '亲生母亲关系，参与世系校验和代次校验。' },
  { title: '配偶', group: '基础关系', type: 'spouse', label: 'spouse', lineage: false, biological: false, primary: false, direction: '起点/终点互为配偶', tip: '保存后后端会自动生成反向配偶关系。', description: '配偶关系，非世系关系。' },
  { title: '养父', group: '收养关系', type: 'adoptive', label: 'adoptive_father', lineage: true, biological: false, primary: true, direction: '起点=养父，终点=养子女', tip: '用于记录非血缘但纳入本支派世系的养父关系。', description: '养父关系，非血缘，参与世系循环和代次校验。' },
  { title: '养母', group: '收养关系', type: 'adoptive', label: 'adoptive_mother', lineage: true, biological: false, primary: true, direction: '起点=养母，终点=养子女', tip: '用于记录非血缘但纳入本支派世系的养母关系。', description: '养母关系，非血缘，参与世系循环和代次校验。' },
  { title: '继嗣/承嗣', group: '承嗣关系', type: 'successor', label: 'heir_successor', lineage: true, biological: false, primary: true, direction: '起点=嗣父/被承嗣方，终点=继嗣人/承嗣人', tip: '用于记录承嗣、继承香火、嗣子入谱等关系。', description: '继嗣关系，非血缘，作为世系关系参与循环和代次校验。' },
  { title: '出嗣/出继', group: '承嗣关系', type: 'out_adoption', label: 'out_adopted', lineage: false, biological: false, primary: false, direction: '起点=出嗣人，终点=承接方/入继对象', tip: '用于记录从本支派出继到其他房支或宗族的事实。', description: '出嗣关系，作为事实记录保存，不参与本支派世系循环。' }
];

const relationTypeOptions = [
  { value: 'parent_child', label: '亲子' },
  { value: 'spouse', label: '配偶' },
  { value: 'adoptive', label: '养育/收养' },
  { value: 'successor', label: '继嗣/承嗣' },
  { value: 'out_adoption', label: '出嗣/出继' }
];

function changeText(value?: string) {
  const dict: Record<string, string> = { parent_child: '亲子', spouse: '配偶', adoptive: '收养', successor: '继嗣', out_adoption: '出嗣' };
  return dict[value || ''] || value || '-';
}

export function RelationshipPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [fromPersonId, setFromPersonId] = useState(workspace.personId);
  const [toPersonId, setToPersonId] = useState('');
  const [relationType, setRelationType] = useState('parent_child');
  const [relationLabel, setRelationLabel] = useState('father');
  const [lineageRelation, setLineageRelation] = useState(true);
  const [biological, setBiological] = useState(true);
  const [primary, setPrimary] = useState(true);
  const [description, setDescription] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState('high');
  const [data, setData] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>();

  const body = () => ({ fromPersonId: Number(fromPersonId), toPersonId: Number(toPersonId), relationType, relationLabel, isLineageRelation: lineageRelation, isBiological: biological, isPrimary: primary, description, confidenceLevel });

  function applyPreset(preset: RelationshipPreset) {
    setRelationType(preset.type);
    setRelationLabel(preset.label);
    setLineageRelation(preset.lineage);
    setBiological(preset.biological);
    setPrimary(preset.primary);
    setDescription(preset.description);
    setResult({ message: `已选择关系模板：${preset.title}。${preset.direction}` });
  }

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

  async function check() {
    await run(async () => {
      const res: any = await apiClient.post(`/clans/${workspace.clanId}/relationships/check-conflict`, body());
      setResult({ message: res.conflict ? res.message || '存在关系冲突，请检查后再创建' : '预检通过，可以创建关系' });
      notify({ message: res.conflict ? '关系预检发现冲突' : '关系预检通过' }, Boolean(res.conflict));
    });
  }

  async function create() {
    await run(async () => {
      const res: any = await apiClient.post(`/clans/${workspace.clanId}/relationships`, body());
      if (res?.id) workspace.patch({ relationshipId: String(res.id), personId: toPersonId || fromPersonId });
      setResult({ message: '关系创建成功' });
      setCreateOpen(false);
      notify({ message: '关系创建成功' });
      await list();
    });
  }

  async function list() {
    const res = await apiClient.get(`/persons/${workspace.personId}/relationships`);
    setData(res);
    notify({ message: '关系查询完成' });
  }

  async function detail(id: string) {
    await run(async () => {
      const res: any = await apiClient.get(`/relationships/${id}`);
      setSelected(res);
      workspace.setRelationshipId(String(res?.id || id));
      setDetailOpen(true);
      notify({ message: '关系详情查询完成' });
    });
  }

  async function update() {
    await run(async () => {
      if (!selected?.id) throw new Error('请选择关系');
      const res: any = await apiClient.put(`/relationships/${selected.id}`, {
        relationType: selected.relationType,
        relationLabel: selected.relationLabel,
        isLineageRelation: selected.isLineageRelation !== false,
        isBiological: selected.isBiological === true,
        isPrimary: selected.isPrimary !== false,
        description: selected.description || '',
        confidenceLevel: selected.confidenceLevel || 'high'
      });
      setSelected(res);
      setResult({ message: '关系信息已更新' });
      notify({ message: '关系信息已更新' });
      await list();
    });
  }

  async function remove() {
    await run(async () => {
      if (!selected?.id) throw new Error('请选择关系');
      await apiClient.delete(`/relationships/${selected.id}`);
      setDeleteOpen(false);
      setDetailOpen(false);
      setSelected(undefined);
      setResult({ message: '关系已删除' });
      notify({ message: '关系已删除' });
      await list();
    });
  }

  return (
    <Panel title="关系管理" description="支持亲子、配偶、养父母、继嗣、出嗣等复杂关系；创建前可先做冲突预检。">
      <Alert type="info" showIcon className="member-role-tip" message="复杂关系录入方向" description="亲子/养育/继嗣类关系建议保持“起点=上一代或承接方，终点=下一代或承嗣人”；出嗣关系建议记录“起点=出嗣人，终点=承接方/入继对象”。" />
      <Field label="当前人物"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} /></Field>
      <Actions><button disabled={loading} onClick={() => run(list)}>{loading ? '处理中...' : '查询关系'}</button><button className="secondary" onClick={() => setCreateOpen(true)}>新建关系</button></Actions>
      <DataTable data={data} columns={[{ key: 'fromPersonId', title: '起点人物' }, { key: 'toPersonId', title: '终点人物' }, { key: 'relationType', title: '关系类型', render: row => changeText(row.relationType) }, { key: 'relationLabel', title: '标签' }, { key: 'isLineageRelation', title: '世系', render: row => row.isLineageRelation ? '是' : '否' }, { key: 'isBiological', title: '血缘', render: row => row.isBiological ? '是' : '否' }, { key: 'dataStatus', title: '状态' }]} onSelect={row => detail(String(row.id))} />
      <ResultNotice result={result} />

      <Modal open={createOpen} title="新建关系" onClose={() => setCreateOpen(false)} width={960}>
        <div className="relationship-preset-grid">{relationshipPresets.map(preset => <button key={`${preset.type}-${preset.label}`} type="button" onClick={() => applyPreset(preset)}><strong>{preset.title}</strong><Tag>{preset.group}</Tag><span>{preset.direction}</span><em>{preset.tip}</em></button>)}</div>
        <Field label="关系起点人物"><input value={fromPersonId} onChange={e => setFromPersonId(e.target.value)} placeholder="选择或输入起点人物" /></Field>
        <Field label="关系终点人物"><input value={toPersonId} onChange={e => setToPersonId(e.target.value)} placeholder="选择或输入终点人物" /></Field>
        <Field label="关系类型"><select value={relationType} onChange={e => setRelationType(e.target.value)}>{relationTypeOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="关系标签"><input value={relationLabel} onChange={e => setRelationLabel(e.target.value)} placeholder="如 father / adoptive_father / heir_successor / out_adopted" /></Field>
        <Field label="是否世系关系"><select value={lineageRelation ? 'true' : 'false'} onChange={e => setLineageRelation(e.target.value === 'true')}><option value="true">是</option><option value="false">否</option></select></Field>
        <Field label="是否血缘关系"><select value={biological ? 'true' : 'false'} onChange={e => setBiological(e.target.value === 'true')}><option value="true">是</option><option value="false">否</option></select></Field>
        <Field label="是否主关系"><select value={primary ? 'true' : 'false'} onChange={e => setPrimary(e.target.value === 'true')}><option value="true">是</option><option value="false">否</option></select></Field>
        <Field label="可信度"><select value={confidenceLevel} onChange={e => setConfidenceLevel(e.target.value)}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></Field>
        <Field label="说明"><input value={description} onChange={e => setDescription(e.target.value)} placeholder="记录该复杂关系的来源、场景或备注" /></Field>
        <Actions><button className="secondary" disabled={loading} onClick={check}>冲突预检</button><button disabled={loading} onClick={create}>{loading ? '保存中...' : '保存'}</button><button className="secondary" onClick={() => setCreateOpen(false)}>取消</button></Actions>
      </Modal>

      <Modal open={detailOpen} title="关系详情" onClose={() => setDetailOpen(false)} width={820}>
        <DetailCard title="基础信息" data={selected} fields={[{ label: '关系类型', value: row => changeText(row.relationType) }, { label: '关系标签', value: row => row.relationLabel }, { label: '状态', value: row => row.dataStatus }]} />
        {selected ? <><Field label="关系类型"><select value={selected.relationType || 'parent_child'} onChange={e => setSelected({ ...selected, relationType: e.target.value })}>{relationTypeOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field><Field label="关系标签"><input value={selected.relationLabel || ''} onChange={e => setSelected({ ...selected, relationLabel: e.target.value })} /></Field><Field label="是否世系关系"><select value={selected.isLineageRelation !== false ? 'true' : 'false'} onChange={e => setSelected({ ...selected, isLineageRelation: e.target.value === 'true' })}><option value="true">是</option><option value="false">否</option></select></Field><Field label="是否血缘关系"><select value={selected.isBiological === true ? 'true' : 'false'} onChange={e => setSelected({ ...selected, isBiological: e.target.value === 'true' })}><option value="true">是</option><option value="false">否</option></select></Field><Field label="是否主关系"><select value={selected.isPrimary !== false ? 'true' : 'false'} onChange={e => setSelected({ ...selected, isPrimary: e.target.value === 'true' })}><option value="true">是</option><option value="false">否</option></select></Field><Field label="可信度"><select value={selected.confidenceLevel || 'high'} onChange={e => setSelected({ ...selected, confidenceLevel: e.target.value })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></Field><Field label="描述"><input value={selected.description || ''} onChange={e => setSelected({ ...selected, description: e.target.value })} /></Field><Actions><button disabled={loading} onClick={update}>保存修改</button><button className="danger" onClick={() => setDeleteOpen(true)}>删除关系</button></Actions></> : null}
      </Modal>

      <ConfirmDialog open={deleteOpen} title="删除关系" description="删除关系会影响世系图和亲缘关系查询，请确认后继续。" confirmText="确认删除" danger onConfirm={remove} onClose={() => setDeleteOpen(false)} />
    </Panel>
  );
}
