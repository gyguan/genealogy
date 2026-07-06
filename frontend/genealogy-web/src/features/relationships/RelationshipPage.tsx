import { useEffect, useMemo, useState } from 'react';
import { Alert, Tag } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { DataTable, toRecordList } from '../../shared/ui/DataTable';
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

type PersonOption = {
  id: string;
  name: string;
  genealogyName?: string;
  generationNo?: string | number;
  generationWord?: string;
  branchName?: string;
};

const relationshipPresets: RelationshipPreset[] = [
  { title: '亲生父亲', group: '基础关系', type: 'parent_child', label: 'father', lineage: true, biological: true, primary: true, direction: '父亲 → 子女', tip: '用于正常血缘父子/父女世系。', description: '亲生父亲关系，参与世系校验和代次校验。' },
  { title: '亲生母亲', group: '基础关系', type: 'parent_child', label: 'mother', lineage: true, biological: true, primary: true, direction: '母亲 → 子女', tip: '用于正常血缘母子/母女世系。', description: '亲生母亲关系，参与世系校验和代次校验。' },
  { title: '配偶', group: '基础关系', type: 'spouse', label: 'spouse', lineage: false, biological: false, primary: false, direction: '双方互为配偶', tip: '保存后后端会自动生成反向配偶关系。', description: '配偶关系，非世系关系。' },
  { title: '养父', group: '收养关系', type: 'adoptive', label: 'adoptive_father', lineage: true, biological: false, primary: true, direction: '养父 → 养子女', tip: '用于记录非血缘但纳入本支派世系的养父关系。', description: '养父关系，非血缘，参与世系循环和代次校验。' },
  { title: '养母', group: '收养关系', type: 'adoptive', label: 'adoptive_mother', lineage: true, biological: false, primary: true, direction: '养母 → 养子女', tip: '用于记录非血缘但纳入本支派世系的养母关系。', description: '养母关系，非血缘，参与世系循环和代次校验。' },
  { title: '继嗣/承嗣', group: '承嗣关系', type: 'successor', label: 'heir_successor', lineage: true, biological: false, primary: true, direction: '承接方 → 继嗣人', tip: '用于记录承嗣、继承香火、嗣子入谱等关系。', description: '继嗣关系，非血缘，作为世系关系参与循环和代次校验。' },
  { title: '出嗣/出继', group: '承嗣关系', type: 'out_adoption', label: 'out_adopted', lineage: false, biological: false, primary: false, direction: '出嗣人 → 入继对象', tip: '用于记录从本支派出继到其他房支或宗族的事实。', description: '出嗣关系，作为事实记录保存，不参与本支派世系循环。' }
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

function relationLabelText(value?: string) {
  const dict: Record<string, string> = {
    father: '父亲',
    mother: '母亲',
    spouse: '配偶',
    child: '子女',
    adoptive_father: '养父',
    adoptive_mother: '养母',
    heir_successor: '继嗣',
    out_adopted: '出嗣'
  };
  return dict[value || ''] || value || '-';
}

function personOption(row: any): PersonOption {
  return {
    id: String(row.id || row.personId || ''),
    name: row.name || row.personName || row.displayName || '未命名人物',
    genealogyName: row.genealogyName,
    generationNo: row.generationNo,
    generationWord: row.generationWord,
    branchName: row.branchName || row.branch?.branchName
  };
}

function personLabel(person?: PersonOption) {
  if (!person) return '未选择人物';
  const tags = [person.genealogyName, person.generationNo ? `第${person.generationNo}世` : '', person.generationWord ? `${person.generationWord}字辈` : '', person.branchName].filter(Boolean);
  return tags.length ? `${person.name}（${tags.join(' · ')}）` : person.name;
}

function relationshipPersonId(row: any, side: 'from' | 'to') {
  return String(side === 'from' ? row.fromPersonId || row.sourcePersonId || '' : row.toPersonId || row.targetPersonId || '');
}

export function RelationshipPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [people, setPeople] = useState<PersonOption[]>([]);
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

  const peopleMap = useMemo(() => new Map(people.map(person => [person.id, person])), [people]);
  const currentPerson = peopleMap.get(String(workspace.personId || fromPersonId));

  useEffect(() => {
    if (!workspace.clanId) return;
    void loadPeople();
  }, [workspace.clanId]);

  useEffect(() => {
    setFromPersonId(workspace.personId || '');
  }, [workspace.personId]);

  const body = () => ({ fromPersonId: Number(fromPersonId), toPersonId: Number(toPersonId), relationType, relationLabel, isLineageRelation: lineageRelation, isBiological: biological, isPrimary: primary, description, confidenceLevel });

  async function loadPeople() {
    const res = await apiClient.get(`/clans/${workspace.clanId}/persons`).catch(() => []);
    setPeople(toRecordList<any>(res).map(personOption).filter(person => person.id));
  }

  function relationshipPersonName(row: any, side: 'from' | 'to') {
    return personLabel(peopleMap.get(relationshipPersonId(row, side)));
  }

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
      if (!fromPersonId || !toPersonId) throw new Error('请选择关系两端的人物');
      const res: any = await apiClient.post(`/clans/${workspace.clanId}/relationships/check-conflict`, body());
      setResult({ message: res.conflict ? res.message || '存在关系冲突，请检查后再创建' : '预检通过，可以创建关系' });
      notify({ message: res.conflict ? '关系预检发现冲突' : '关系预检通过' }, Boolean(res.conflict));
    });
  }

  async function create() {
    await run(async () => {
      if (!fromPersonId || !toPersonId) throw new Error('请选择关系两端的人物');
      const res: any = await apiClient.post(`/clans/${workspace.clanId}/relationships`, body());
      if (res?.id) workspace.patch({ relationshipId: String(res.id), personId: toPersonId || fromPersonId });
      setResult({ message: '关系创建成功' });
      setCreateOpen(false);
      notify({ message: '关系创建成功' });
      await list();
    });
  }

  async function list() {
    if (!workspace.personId) throw new Error('请选择当前人物');
    await loadPeople();
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
      <Alert type="info" showIcon className="member-role-tip" message="复杂关系录入方向" description="亲子/养育/继嗣类关系建议按长幼、承接关系选择人物；出嗣关系建议记录出嗣人与入继对象。" />
      <Field label="当前人物"><select value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)}><option value="">请选择当前人物</option>{people.map(person => <option key={person.id} value={person.id}>{personLabel(person)}</option>)}</select></Field>
      <Actions><button disabled={loading || !workspace.personId} onClick={() => run(list)}>{loading ? '处理中...' : '查询关系'}</button><button className="secondary" disabled={!workspace.clanId} onClick={() => setCreateOpen(true)}>新建关系</button><button className="secondary" disabled={loading || !workspace.clanId} onClick={() => run(loadPeople)}>刷新人物</button></Actions>
      <DataTable data={data} columns={[{ key: 'fromPersonName', title: '关系起点人物', render: row => relationshipPersonName(row, 'from') }, { key: 'toPersonName', title: '关系终点人物', render: row => relationshipPersonName(row, 'to') }, { key: 'relationType', title: '关系类型', render: row => changeText(row.relationType) }, { key: 'relationLabel', title: '关系标签', render: row => relationLabelText(row.relationLabel) }, { key: 'isLineageRelation', title: '世系', render: row => row.isLineageRelation ? '是' : '否' }, { key: 'isBiological', title: '血缘', render: row => row.isBiological ? '是' : '否' }, { key: 'dataStatus', title: '状态' }]} onSelect={row => detail(String(row.id))} />
      <ResultNotice result={result} />

      <Modal open={createOpen} title="新建关系" onClose={() => setCreateOpen(false)} width={960}>
        <div className="relationship-preset-grid">{relationshipPresets.map(preset => <button key={`${preset.type}-${preset.label}`} type="button" onClick={() => applyPreset(preset)}><strong>{preset.title}</strong><Tag>{preset.group}</Tag><span>{preset.direction}</span><em>{preset.tip}</em></button>)}</div>
        <Field label="关系起点人物"><select value={fromPersonId} onChange={e => setFromPersonId(e.target.value)}><option value="">请选择起点人物</option>{people.map(person => <option key={person.id} value={person.id}>{personLabel(person)}</option>)}</select></Field>
        <Field label="关系终点人物"><select value={toPersonId} onChange={e => setToPersonId(e.target.value)}><option value="">请选择终点人物</option>{people.map(person => <option key={person.id} value={person.id}>{personLabel(person)}</option>)}</select></Field>
        <Field label="关系类型"><select value={relationType} onChange={e => setRelationType(e.target.value)}>{relationTypeOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="关系标签"><input value={relationLabelText(relationLabel)} onChange={e => setRelationLabel(e.target.value)} placeholder="例如：父亲、养父、继嗣" /></Field>
        <Field label="是否世系关系"><select value={lineageRelation ? 'true' : 'false'} onChange={e => setLineageRelation(e.target.value === 'true')}><option value="true">是</option><option value="false">否</option></select></Field>
        <Field label="是否血缘关系"><select value={biological ? 'true' : 'false'} onChange={e => setBiological(e.target.value === 'true')}><option value="true">是</option><option value="false">否</option></select></Field>
        <Field label="是否主关系"><select value={primary ? 'true' : 'false'} onChange={e => setPrimary(e.target.value === 'true')}><option value="true">是</option><option value="false">否</option></select></Field>
        <Field label="可信度"><select value={confidenceLevel} onChange={e => setConfidenceLevel(e.target.value)}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></Field>
        <Field label="说明"><input value={description} onChange={e => setDescription(e.target.value)} placeholder="记录该复杂关系的来源、场景或备注" /></Field>
        <Actions><button className="secondary" disabled={loading} onClick={check}>冲突预检</button><button disabled={loading} onClick={create}>{loading ? '保存中...' : '保存'}</button><button className="secondary" onClick={() => setCreateOpen(false)}>取消</button></Actions>
      </Modal>

      <Modal open={detailOpen} title="关系详情" onClose={() => setDetailOpen(false)} width={820}>
        <DetailCard title="基础信息" data={selected} fields={[{ label: '关系起点人物', value: row => relationshipPersonName(row, 'from') }, { label: '关系终点人物', value: row => relationshipPersonName(row, 'to') }, { label: '关系类型', value: row => changeText(row.relationType) }, { label: '关系标签', value: row => relationLabelText(row.relationLabel) }, { label: '状态', value: row => row.dataStatus }]} />
        {selected ? <><Field label="关系类型"><select value={selected.relationType || 'parent_child'} onChange={e => setSelected({ ...selected, relationType: e.target.value })}>{relationTypeOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field><Field label="关系标签"><input value={relationLabelText(selected.relationLabel) || ''} onChange={e => setSelected({ ...selected, relationLabel: e.target.value })} /></Field><Field label="是否世系关系"><select value={selected.isLineageRelation !== false ? 'true' : 'false'} onChange={e => setSelected({ ...selected, isLineageRelation: e.target.value === 'true' })}><option value="true">是</option><option value="false">否</option></select></Field><Field label="是否血缘关系"><select value={selected.isBiological === true ? 'true' : 'false'} onChange={e => setSelected({ ...selected, isBiological: e.target.value === 'true' })}><option value="true">是</option><option value="false">否</option></select></Field><Field label="是否主关系"><select value={selected.isPrimary !== false ? 'true' : 'false'} onChange={e => setSelected({ ...selected, isPrimary: e.target.value === 'true' })}><option value="true">是</option><option value="false">否</option></select></Field><Field label="可信度"><select value={selected.confidenceLevel || 'high'} onChange={e => setSelected({ ...selected, confidenceLevel: e.target.value })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></Field><Field label="描述"><input value={selected.description || ''} onChange={e => setSelected({ ...selected, description: e.target.value })} /></Field><Actions><button disabled={loading} onClick={update}>保存修改</button><button className="danger" onClick={() => setDeleteOpen(true)}>删除关系</button></Actions></> : null}
      </Modal>

      <ConfirmDialog open={deleteOpen} title="删除关系" description="删除关系会影响世系图和亲缘关系查询，请确认后继续。" confirmText="确认删除" danger onConfirm={remove} onClose={() => setDeleteOpen(false)} />
    </Panel>
  );
}