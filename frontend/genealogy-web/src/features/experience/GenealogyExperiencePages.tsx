import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Avatar, Button, Card, Descriptions, Drawer, Empty, Form, Input, Modal, Select, Segmented, Space, Switch, Tag, Tooltip, Typography, theme } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';

type PersonView = { id: string; name: string; generation: string; word: string; years: string; branch: string; status: string; avatar: string; relation: string; x: number; y: number; raw?: any };
type SourceView = { id?: string; title: string; category: string; owner: string; confidence: string; status: string; bind: string; raw?: any };
type TaskView = { id?: string; title: string; type: string; user: string; time: string; status: string; raw?: any };
type PersonForm = { name: string; gender: string; generationNo: string; generationWord: string; branchId: string; isLiving: boolean };
type CreateMode = 'person' | 'father' | 'mother' | 'spouse' | 'child' | null;
type TreeViewMode = 'family' | 'branch' | 'compact';

type ExperienceData = ReturnType<typeof useExperienceData>;

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  pending_review: '待审核',
  reviewing: '审核中',
  official: '正式',
  active: '正式',
  approved: '已通过',
  reviewed: '已复核',
  rejected: '已驳回',
  archived: '已归档'
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  genealogy_book: '族谱原文',
  photo: '照片资料',
  local_chronicle: '地方志',
  oral_record: '口述记录',
  tombstone: '墓志/碑刻',
  archive: '档案资料',
  other: '其他'
};

const SOURCE_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待复核',
  pending_review: '待复核',
  reviewed: '已复核',
  approved: '已复核',
  official: '正式',
  rejected: '已驳回',
  archived: '已归档'
};

const RELATION_TYPE_LABELS: Record<string, string> = {
  father: '父亲',
  mother: '母亲',
  parent_child: '亲子',
  child: '子女',
  spouse: '配偶',
  husband: '丈夫',
  wife: '妻子',
  adopted_in: '继入',
  adopted_out: '出嗣'
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  person: '人物',
  relationship: '关系',
  source: '来源',
  branch: '支派',
  generation_scheme: '字辈方案',
  clan: '宗族'
};

const CONFIDENCE_LABELS: Record<string, string> = { high: '高', medium: '中', low: '低' };
const GENDER_OPTIONS = [{ value: 'male', label: '男' }, { value: 'female', label: '女' }, { value: 'unknown', label: '未知' }];
const SOURCE_TYPE_OPTIONS = Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

function rows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.nodes)) return data.nodes;
  return [];
}

function firstChar(name?: string) { return (name || '谱').slice(0, 1); }
function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}
function dateText(row: any) {
  const birth = row.birthDate || row.birthYear || row.birthDateText || '';
  const death = row.deathDate || row.deathYear || row.deathDateText || '';
  return birth || death ? `${birth || '?'}-${death || ''}` : '-';
}
function statusText(value?: string) {
  const status = String(value || '').trim().toLowerCase();
  return STATUS_LABELS[status] || value || '已记录';
}
function statusColor(value?: string) {
  const status = String(value || '').trim().toLowerCase();
  if (['official', 'active', 'approved', 'reviewed'].includes(status)) return 'success';
  if (['pending', 'pending_review', 'reviewing'].includes(status)) return 'processing';
  if (status === 'rejected') return 'error';
  return 'default';
}
function StatusTag({ value }: { value?: string }) {
  return <Tag color={statusColor(value)}>{statusText(value)}</Tag>;
}
function mapStatus(row: any) { return row.status || row.dataStatus || row.verificationStatus || row.reviewStatus || '已记录'; }
function sourceTypeText(value?: string) {
  const type = String(value || '').trim().toLowerCase();
  return SOURCE_TYPE_LABELS[type] || value || '资料来源待维护';
}
function sourceStatusText(value?: string) {
  const status = String(value || '').trim().toLowerCase();
  return SOURCE_STATUS_LABELS[status] || value || '待复核';
}
function sourceStatusColor(value?: string) {
  const status = String(value || '').trim().toLowerCase();
  if (['reviewed', 'approved', 'official'].includes(status)) return 'success';
  if (['pending', 'pending_review'].includes(status)) return 'processing';
  if (status === 'rejected') return 'error';
  return 'default';
}
function confidenceText(value?: string) {
  const text = String(value || '').trim().toLowerCase();
  return CONFIDENCE_LABELS[text] || value || '待评估';
}
function businessSourceTitle(source: SourceView) { return source.title || '未命名资料'; }
function businessPersonLabel(person?: PersonView) {
  if (!person) return '未选择绑定对象';
  return `${person.name} · ${person.branch} · ${person.generation}`;
}
function branchName(row: any) { return row.branchName || row.name || '未命名支派'; }
function relationTypeText(value?: string) {
  const type = String(value || '').trim().toLowerCase();
  return RELATION_TYPE_LABELS[type] || value || '亲属关系';
}
function targetTypeText(value?: string) {
  const type = String(value || '').trim().toLowerCase();
  return TARGET_TYPE_LABELS[type] || value || '审核对象';
}

function normalizePeople(rawRows: any[], branches: any[], treeNodes: any[] = []): PersonView[] {
  const sourceRows = treeNodes.length ? treeNodes : rawRows;
  return sourceRows.map((row, index) => {
    const id = String(row.id || row.personId || row.targetId || index + 1);
    const name = row.name || row.personName || row.displayName || `未命名人物${index + 1}`;
    const branchId = String(row.branchId || row.branch?.id || '');
    const branch = branches.find(item => String(item.id) === branchId)?.branchName || row.branchName || row.branch || '未归属支派';
    const generationNo = row.generationNo || row.generation || row.generationNumber;
    const xPositions = [44, 30, 58, 35, 62, 20, 76, 44, 50, 28, 70];
    const yPositions = [12, 40, 40, 72, 72, 72, 72, 92, 92, 92, 92];
    return { id, name, generation: generationNo ? `${generationNo}世` : row.generationName || '-', word: row.generationWord || row.word || '-', years: dateText(row), branch, status: mapStatus(row), avatar: firstChar(name), relation: relationTypeText(row.relationLabel || row.relationType || (index === 0 ? '中心人物' : '亲属')), x: Number(row.x ?? xPositions[index % xPositions.length]), y: Number(row.y ?? yPositions[index % yPositions.length]), raw: row };
  });
}

function normalizeSources(rawRows: any[]): SourceView[] {
  return rawRows.map((row, index) => ({ id: String(row.id || index + 1), title: row.sourceName || row.title || row.name || `资料${index + 1}`, category: sourceTypeText(row.sourceType || row.category), owner: row.createdByName || row.owner || row.creatorName || '族谱资料库', confidence: confidenceText(row.confidenceLevel || row.confidence), status: sourceStatusText(row.verificationStatus || row.status), bind: row.bindingCount ? `已绑定 ${row.bindingCount} 条` : '暂无绑定记录', raw: row }));
}

function normalizeTasks(rawRows: any[]): TaskView[] {
  return rawRows.map((row, index) => ({ id: String(row.id || row.taskId || index + 1), title: row.title || row.targetName || `${targetTypeText(row.targetType)}审核事项${index + 1}`, type: targetTypeText(row.targetType || row.taskType), user: row.submitterName || row.createdByName || '提交人待维护', time: row.createdAt || row.submitTime || '-', status: statusText(row.status), raw: row }));
}

function defaultPersonForm(data: ExperienceData, mode: CreateMode): PersonForm {
  const selected = data.selectedPerson;
  const selectedGeneration = Number(selected?.raw?.generationNo || selected?.raw?.generation || '') || 0;
  const branchId = String(selected?.raw?.branchId || data.workspace.branchId || data.branches[0]?.id || '');
  let generationNo = '';
  if (mode === 'father' || mode === 'mother') generationNo = selectedGeneration ? String(selectedGeneration - 1) : '';
  if (mode === 'child') generationNo = selectedGeneration ? String(selectedGeneration + 1) : '';
  if (mode === 'person' || mode === 'spouse') generationNo = selectedGeneration ? String(selectedGeneration) : '';
  return { name: '', gender: mode === 'mother' ? 'female' : 'male', generationNo, generationWord: '', branchId, isLiving: true };
}

function relationTitle(mode: CreateMode) {
  switch (mode) {
    case 'father': return '添加父亲';
    case 'mother': return '添加母亲';
    case 'spouse': return '添加配偶';
    case 'child': return '添加子女';
    default: return '新增人物';
  }
}

function Badge({ children }: { children: string }) {
  const cls = children.includes('待') || children.includes('异常') || children.includes('冲突') ? 'xp-badge xp-badge--warn' : children.includes('草稿') || children.includes('线索') ? 'xp-badge xp-badge--draft' : 'xp-badge';
  return <span className={cls}>{children}</span>;
}
function SectionHeader({ eyebrow, title, desc, action, onAction }: { eyebrow: string; title: string; desc: string; action?: string; onAction?: () => void }) {
  return <div className="xp-section-header"><div><span>{eyebrow}</span><h2>{title}</h2><p>{desc}</p></div>{action ? <Button type="primary" onClick={onAction}>{action}</Button> : null}</div>;
}
function EmptyGuide({ text }: { text: string }) { return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} />; }

function useExperienceData() {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [rawPersons, setRawPersons] = useState<any[]>([]);
  const [treeNodes, setTreeNodes] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [rawSources, setRawSources] = useState<any[]>([]);
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [logTotal, setLogTotal] = useState<number | string>('-');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try { return await fn(); } catch (error) { setMessage(`${label}暂不可用：${(error as Error).message}`); return fallback; }
  }

  async function loadBase() {
    setLoading(true);
    try {
      const clanRows = rows(await safe('宗族列表', () => apiClient.get('/clans'), []));
      setClans(clanRows);
      const nextClanId = workspace.clanId || String(clanRows[0]?.id || '');
      if (nextClanId && !workspace.clanId) workspace.setClanId(nextClanId);
      if (!nextClanId) { setBranches([]); setRawPersons([]); setRawSources([]); setTasks([]); setTreeNodes([]); setRelationships([]); setLogTotal('-'); setMessage('暂无宗族数据，请进入“基础数据管理”创建宗族并登录后再查看产品化页面。'); return; }
      const [branchRes, personRes, sourceRes, taskRes, logRes] = await Promise.all([
        safe('支派列表', () => apiClient.get(`/clans/${nextClanId}/branches`), []),
        safe('人物列表', () => apiClient.get(`/clans/${nextClanId}/persons`), []),
        safe('来源资料', () => apiClient.get(`/clans/${nextClanId}/sources`), []),
        safe('审核任务', () => apiClient.get(`/clans/${nextClanId}/review-tasks/pending`), []),
        safe('日志统计', () => apiClient.get(`/logs/operations/stats?clanId=${nextClanId}`), null)
      ]);
      const personRows = rows(personRes);
      setBranches(rows(branchRes));
      setRawPersons(personRows);
      setRawSources(rows(sourceRes));
      setTasks(normalizeTasks(rows(taskRes)));
      setLogTotal((logRes as any)?.totalCount ?? (logRes as any)?.total ?? '-');
      if (!workspace.personId && personRows[0]?.id) workspace.setPersonId(String(personRows[0].id));
      if (!personRows.length) setMessage('当前宗族暂无人物数据，请点击“新增人物”创建第一位族人。');
    } finally { setLoading(false); }
  }

  async function loadPersonContext(personId = workspace.personId) {
    if (!personId) { setRelationships([]); setTreeNodes([]); return; }
    setLoading(true);
    try {
      const [relationRes, treeRes] = await Promise.all([
        safe('亲属关系', () => apiClient.get(`/persons/${personId}/relationships`), []),
        safe('世系图谱', () => apiClient.get(`/tree/person/${personId}/family`), null)
      ]);
      setRelationships(rows(relationRes));
      setTreeNodes(rows((treeRes as any)?.nodes ? treeRes : null));
    } finally { setLoading(false); }
  }

  async function refreshAll() { await loadBase(); if (workspace.personId) await loadPersonContext(workspace.personId); }
  async function createPersonRecord(form: PersonForm, selectCreated = true) {
    const clanId = workspace.clanId || String(clans[0]?.id || '');
    if (!clanId) { setMessage('请先进入基础数据管理创建宗族。'); return null; }
    const payload = { branchId: form.branchId ? Number(form.branchId) : null, name: form.name.trim(), gender: form.gender, generationNo: form.generationNo ? Number(form.generationNo) : null, generationWord: form.generationWord || '', isLiving: form.isLiving, privacyLevel: 'clan_only' };
    if (!payload.name) { setMessage('请输入姓名。'); return null; }
    const created: any = await apiClient.post(`/clans/${clanId}/persons`, payload);
    if (created?.id && selectCreated) workspace.setPersonId(String(created.id));
    setMessage('人物创建成功');
    await loadBase();
    return created;
  }

  async function createRelative(mode: Exclude<CreateMode, null | 'person'>, form: PersonForm) {
    const base = selectedPerson;
    const clanId = workspace.clanId || String(clans[0]?.id || '');
    if (!base?.id) { setMessage('请先选择中心人物。'); return; }
    if (!clanId) { setMessage('请先进入基础数据管理创建宗族。'); return; }
    const created = await createPersonRecord(form, false);
    if (!created?.id) return;
    const baseGender = base.raw?.gender || base.raw?.sex || 'male';
    const relationPayload = mode === 'spouse'
      ? { fromPersonId: Number(base.id), toPersonId: Number(created.id), relationType: 'spouse', relationLabel: 'spouse', isLineageRelation: false, isBiological: false, isPrimary: true, confidenceLevel: 'high' }
      : mode === 'child'
        ? { fromPersonId: Number(base.id), toPersonId: Number(created.id), relationType: 'parent_child', relationLabel: baseGender === 'female' ? 'mother' : 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' }
        : { fromPersonId: Number(created.id), toPersonId: Number(base.id), relationType: 'parent_child', relationLabel: mode === 'mother' ? 'mother' : 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' };
    const relationship: any = await apiClient.post(`/clans/${clanId}/relationships`, relationPayload);
    if (relationship?.id) workspace.setRelationshipId(String(relationship.id));
    workspace.setPersonId(String(created.id));
    setMessage(`${relationTitle(mode)}成功`);
    await refreshAll();
  }

  async function createSource(sourceName: string, sourceType: string) {
    const clanId = workspace.clanId || String(clans[0]?.id || '');
    if (!clanId) { setMessage('请先进入基础数据管理创建宗族。'); return null; }
    if (!sourceName.trim()) { setMessage('请输入资料名称。'); return null; }
    const created: any = await apiClient.post(`/clans/${clanId}/sources`, { sourceName: sourceName.trim(), sourceType });
    if (created?.id) workspace.setSourceId(String(created.id));
    setMessage('来源资料创建成功');
    await loadBase();
    return created;
  }

  async function submitPersonReview(personId: string) { await apiClient.post(`/persons/${personId}/submit-review`, { diffSummary: '产品化页面提交人物审核' }); setMessage('人物已提交审核'); await loadBase(); }
  async function approveTask(taskId: string) { await apiClient.post(`/review-tasks/${taskId}/approve`, { comment: '同意入谱' }); setMessage('审核已通过'); await loadBase(); }
  async function rejectTask(taskId: string) { await apiClient.post(`/review-tasks/${taskId}/reject`, { comment: '请补充资料后重新提交' }); setMessage('审核已驳回'); await loadBase(); }
  async function checkRelationshipConflict(fromPersonId: string, toPersonId: string) {
    if (!workspace.clanId || !fromPersonId || !toPersonId) { setMessage('请先选择宗族和两位人物'); return; }
    const result: any = await apiClient.post(`/clans/${workspace.clanId}/relationships/check-conflict`, { fromPersonId: Number(fromPersonId), toPersonId: Number(toPersonId), relationType: 'parent_child', relationLabel: 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' });
    setMessage(result?.conflict ? '发现关系冲突，请进入修谱工作台处理' : '关系预检通过');
  }

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { if (workspace.personId) void loadPersonContext(workspace.personId); }, [workspace.personId]);
  const people = useMemo(() => normalizePeople(rawPersons, branches, treeNodes), [rawPersons, branches, treeNodes]);
  const sources = useMemo(() => normalizeSources(rawSources), [rawSources]);
  const selectedPerson = people.find(item => item.id === workspace.personId) || people[0];
  const activeClan = clans.find(item => String(item.id) === workspace.clanId) || clans[0];
  return { workspace, clans, branches, people, relationships, sources, tasks, logTotal, selectedPerson, activeClan, loading, message, setMessage, refreshAll, createPersonRecord, createRelative, createSource, submitPersonReview, approveTask, rejectTask, checkRelationshipConflict };
}

function buildRelatives(person: PersonView | undefined, relationships: any[], people: PersonView[]) {
  if (!person) return [];
  return relationships.slice(0, 8).map(row => {
    const otherId = String(row.fromPersonId) === person.id ? String(row.toPersonId) : String(row.fromPersonId);
    const other = people.find(item => item.id === otherId);
    return { type: relationTypeText(row.relationLabel || row.relationType), name: other?.name || '亲属待维护', status: row.dataStatus || row.status || '已记录' };
  });
}

function buildEvents(person?: PersonView) {
  if (!person) return [];
  const raw = person.raw || {};
  const list = [];
  if (raw.birthDate || raw.birthYear) list.push({ year: String(raw.birthDate || raw.birthYear), title: `${person.name}出生`, detail: raw.birthPlace || '出生地待补充。' });
  if (raw.deathDate || raw.deathYear) list.push({ year: String(raw.deathDate || raw.deathYear), title: `${person.name}逝世`, detail: raw.tombPlace || '墓葬信息待补充。' });
  if (person.word && person.word !== '-') list.push({ year: person.generation, title: '字辈校验', detail: `${person.name}使用“${person.word}”字辈。` });
  return list;
}

function relationshipLines(data: ExperienceData) {
  return data.relationships.map((row, index) => {
    const from = data.people.find(person => person.id === String(row.fromPersonId));
    const to = data.people.find(person => person.id === String(row.toPersonId));
    if (!from || !to) return null;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return { key: `${from.id}-${to.id}-${index}`, from, to, label: relationTypeText(row.relationLabel || row.relationType), length: Math.max(6, Math.sqrt(dx * dx + dy * dy)), angle: Math.atan2(dy, dx) * 180 / Math.PI };
  }).filter(Boolean) as { key: string; from: PersonView; to: PersonView; label: string; length: number; angle: number }[];
}

function CreatePersonModal({ data, mode, onClose }: { data: ExperienceData; mode: CreateMode; onClose: () => void }) {
  const [form, setForm] = useState<PersonForm>(() => defaultPersonForm(data, mode));
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (mode) setForm(defaultPersonForm(data, mode)); }, [mode, data.selectedPerson?.id, data.workspace.clanId, data.workspace.branchId, data.branches.length]);
  function patch(key: keyof PersonForm, value: string | boolean) { setForm(prev => ({ ...prev, [key]: value })); }
  async function submit() {
    if (!mode || saving) return;
    setSaving(true);
    try { if (mode === 'person') await data.createPersonRecord(form, true); else await data.createRelative(mode, form); onClose(); }
    catch (error) { data.setMessage((error as Error).message || '创建失败，请检查输入。'); }
    finally { setSaving(false); }
  }
  return (
    <Modal open={Boolean(mode)} title={relationTitle(mode)} onCancel={onClose} footer={<Space><Button type="primary" loading={saving} onClick={() => void submit()}>{saving ? '保存中...' : '保存'}</Button><Button onClick={onClose}>取消</Button></Space>} width={620} destroyOnClose>
      <Form layout="vertical">
        <Form.Item label="姓名" required><Input value={form.name} onChange={e => patch('name', e.target.value)} placeholder="请输入姓名" /></Form.Item>
        <Form.Item label="性别"><Select value={form.gender} onChange={value => patch('gender', value)} options={GENDER_OPTIONS} /></Form.Item>
        <Form.Item label="支派"><Select showSearch optionFilterProp="label" value={form.branchId} onChange={value => patch('branchId', value)} options={[{ value: '', label: '暂不归属支派' }, ...data.branches.map(branch => ({ value: String(branch.id), label: branchName(branch) }))]} /></Form.Item>
        <Form.Item label="代次"><Input value={form.generationNo} onChange={e => patch('generationNo', e.target.value)} placeholder="例如：20" /></Form.Item>
        <Form.Item label="字辈"><Input value={form.generationWord} onChange={e => patch('generationWord', e.target.value)} placeholder="例如：家" /></Form.Item>
        <Form.Item label="是否在世"><Switch checked={form.isLiving} checkedChildren="在世" unCheckedChildren="已故" onChange={checked => patch('isLiving', checked)} /></Form.Item>
      </Form>
    </Modal>
  );
}

function CreateSourceModal({ data, open, onClose }: { data: ExperienceData; open: boolean; onClose: () => void }) {
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('genealogy_book');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setSourceName(''); setSourceType('genealogy_book'); } }, [open]);
  async function submit() {
    if (saving) return;
    setSaving(true);
    try { const created = await data.createSource(sourceName, sourceType); if (created) onClose(); }
    catch (error) { data.setMessage((error as Error).message || '资料创建失败，请检查输入。'); }
    finally { setSaving(false); }
  }
  return (
    <Modal open={open} title="新增来源资料" onCancel={onClose} footer={<Space><Button type="primary" loading={saving} onClick={() => void submit()}>{saving ? '保存中...' : '保存'}</Button><Button onClick={onClose}>取消</Button></Space>} width={620} destroyOnClose>
      <Form layout="vertical">
        <Form.Item label="资料名称" required><Input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="例如：民国二十三年张氏族谱影印本" /></Form.Item>
        <Form.Item label="资料类型"><Select value={sourceType} onChange={setSourceType} options={SOURCE_TYPE_OPTIONS} /></Form.Item>
      </Form>
    </Modal>
  );
}

function PersonSidePanel({ data, onCreate, onOpenDetail }: { data: ExperienceData; onCreate: (mode: CreateMode) => void; onOpenDetail: () => void }) {
  const person = data.selectedPerson;
  const relatives = buildRelatives(person, data.relationships, data.people);
  if (!person) return <Card className="xp-person-panel"><EmptyGuide text="暂无人物数据。请点击“新增人物”创建第一位族人。" /></Card>;
  return <Card className="xp-person-panel" title="中心人物" extra={<StatusTag value={person.status} />}><Space direction="vertical" size="middle" style={{ width: '100%' }}><Space align="center"><Avatar size={56}>{person.avatar}</Avatar><div><Typography.Title level={4} style={{ margin: 0 }}>{person.name}</Typography.Title><Typography.Text type="secondary">{person.branch} · {person.generation} · {person.word}字辈</Typography.Text></div></Space><Descriptions size="small" column={1} bordered><Descriptions.Item label="生卒">{person.years}</Descriptions.Item><Descriptions.Item label="关系">{person.relation}</Descriptions.Item><Descriptions.Item label="支派">{person.branch}</Descriptions.Item></Descriptions><Space wrap><Button type="primary" onClick={onOpenDetail}>查看详情</Button><Button onClick={() => onCreate('father')}>添加父亲</Button><Button onClick={() => onCreate('mother')}>添加母亲</Button><Button onClick={() => onCreate('spouse')}>添加配偶</Button><Button onClick={() => onCreate('child')}>添加子女</Button><Button onClick={() => data.submitPersonReview(person.id)}>提交审核</Button></Space><Card size="small" title="亲属关系">{relatives.length ? <Space direction="vertical" size="small" style={{ width: '100%' }}>{relatives.map(item => <Space key={`${item.type}-${item.name}`} style={{ justifyContent: 'space-between', width: '100%' }}><span>{item.type}：{item.name}</span><StatusTag value={item.status} /></Space>)}</Space> : <EmptyGuide text="暂无亲属关系，请添加父母、配偶或子女。" />}</Card></Space></Card>;
}

function PersonDetailDrawer({ data, open, onClose, onCreate }: { data: ExperienceData; open: boolean; onClose: () => void; onCreate: (mode: CreateMode) => void }) {
  const person = data.selectedPerson;
  const relatives = buildRelatives(person, data.relationships, data.people);
  const events = buildEvents(person);
  return <Drawer title={person ? `${person.name} · 人物详情` : '人物详情'} width={520} open={open} onClose={onClose}>{person ? <Space direction="vertical" size="middle" style={{ width: '100%' }}><Card size="small"><Space align="center"><Avatar size={64}>{person.avatar}</Avatar><div><Typography.Title level={4} style={{ margin: 0 }}>{person.name}</Typography.Title><Typography.Text type="secondary">{person.branch} · {person.generation} · {person.word}字辈</Typography.Text><br /><StatusTag value={person.status} /></div></Space></Card><Descriptions size="small" column={1} bordered><Descriptions.Item label="所属支派">{person.branch}</Descriptions.Item><Descriptions.Item label="代次字辈">{person.generation} · {person.word}</Descriptions.Item><Descriptions.Item label="生卒信息">{person.years}</Descriptions.Item><Descriptions.Item label="关系摘要">{person.relation}</Descriptions.Item></Descriptions><Card size="small" title="亲属关系">{relatives.length ? <Space direction="vertical" size="small" style={{ width: '100%' }}>{relatives.map(item => <Space key={`${item.type}-${item.name}`} style={{ justifyContent: 'space-between', width: '100%' }}><span>{item.type}：{item.name}</span><StatusTag value={item.status} /></Space>)}</Space> : <EmptyGuide text="暂无后端返回的亲属关系。" />}</Card><Card size="small" title="生命事件">{events.length ? <Space direction="vertical" size="small" style={{ width: '100%' }}>{events.map(item => <div key={`${item.year}-${item.title}`}><Typography.Text strong>{item.title}</Typography.Text><br /><Typography.Text type="secondary">{item.year} · {item.detail}</Typography.Text></div>)}</Space> : <EmptyGuide text="暂无后端返回的生命事件。" />}</Card><Space wrap><Button onClick={() => onCreate('father')}>添加父亲</Button><Button onClick={() => onCreate('mother')}>添加母亲</Button><Button onClick={() => onCreate('spouse')}>添加配偶</Button><Button onClick={() => onCreate('child')}>添加子女</Button></Space></Space> : <EmptyGuide text="暂无人物详情。" />}</Drawer>;
}

function TreeCanvas({ data, onCreate, onInspectPerson }: { data: ExperienceData; onCreate: (mode: CreateMode) => void; onInspectPerson: () => void }) {
  const { token } = theme.useToken();
  const [scale, setScale] = useState(100);
  const [viewMode, setViewMode] = useState<TreeViewMode>('family');
  const lines = useMemo(() => relationshipLines(data), [data.relationships, data.people]);
  const canvasStyle: CSSProperties = { background: token.colorBgContainer, borderColor: token.colorBorderSecondary, borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary };
  return <Card className="xp-tree-canvas" bodyStyle={{ padding: 0 }} style={canvasStyle}><div className="xp-tree-toolbar" style={{ padding: token.paddingSM, borderBottom: `1px solid ${token.colorBorderSecondary}` }}><Space wrap style={{ justifyContent: 'space-between', width: '100%' }}><Space wrap><Typography.Text strong>{data.activeClan?.clanName || '族谱'}世系图</Typography.Text><Select showSearch optionFilterProp="label" style={{ width: 220 }} value={data.workspace.personId || data.selectedPerson?.id || ''} onChange={value => data.workspace.setPersonId(value)} options={[{ value: '', label: '请选择中心人物' }, ...data.people.map(person => ({ value: person.id, label: businessPersonLabel(person) }))]} /><Segmented value={viewMode} onChange={value => setViewMode(value as TreeViewMode)} options={[{ label: '亲属', value: 'family' }, { label: '支派', value: 'branch' }, { label: '紧凑', value: 'compact' }]} /></Space><Space wrap><Tooltip title="缩小图谱"><Button onClick={() => setScale(value => Math.max(70, value - 10))}>-</Button></Tooltip><Tooltip title="当前缩放"><Button>{scale}%</Button></Tooltip><Tooltip title="放大图谱"><Button onClick={() => setScale(value => Math.min(140, value + 10))}>+</Button></Tooltip><Tooltip title="查看中心人物详情"><Button type="primary" onClick={onInspectPerson} disabled={!data.selectedPerson}>人物详情</Button></Tooltip><Button onClick={() => onCreate(data.selectedPerson ? 'child' : 'person')}>{data.selectedPerson ? '新增亲属' : '新增人物'}</Button></Space></Space></div><div className="xp-tree-area" style={{ transform: `scale(${scale / 100})`, transformOrigin: 'center top', minHeight: viewMode === 'compact' ? 420 : 520 }}>{data.people.length ? <>{lines.map(line => { const lineStyle: CSSProperties = { left: `${line.from.x}%`, top: `${line.from.y}%`, width: `${line.length}%`, transform: `rotate(${line.angle}deg)`, background: token.colorBorder, transformOrigin: 'left center' }; return <Tooltip key={line.key} title={`${line.from.name} → ${line.to.name}：${line.label}`}><i className="xp-tree-line" style={lineStyle} /></Tooltip>; })}{!lines.length ? <div style={{ position: 'absolute', left: 24, top: 24 }}><Tag>暂无后端关系线数据</Tag></div> : null}{data.people.map(person => { const active = data.workspace.personId === person.id; const nodeStyle: CSSProperties = { left: `${person.x}%`, top: `${person.y}%`, borderColor: active ? token.colorPrimary : token.colorBorder, boxShadow: active ? token.boxShadowSecondary : token.boxShadowTertiary, borderRadius: token.borderRadiusLG, background: token.colorBgContainer }; return <Tooltip key={person.id} title={`${person.name} · ${person.branch} · ${person.generation}`}><button className={`xp-node ${active ? 'active' : ''}`} style={nodeStyle} onClick={() => { data.workspace.setPersonId(person.id); onInspectPerson(); }}><Avatar size={34}>{person.avatar}</Avatar><strong>{person.name}</strong><em>{viewMode === 'branch' ? person.branch : person.generation}</em><StatusTag value={person.status} /></button></Tooltip>; })}</> : <EmptyGuide text="暂无世系图数据。请先新增人物，再基于后端关系数据展示图谱。" />}</div></Card>;
}

function ExperienceNotice({ message, loading }: { message: string; loading: boolean }) { return message || loading ? <div className="xp-inline-notice">{loading ? '正在加载真实族谱数据...' : message}</div> : null; }

export function GenealogyHomePage() { const data = useExperienceData(); const [createMode, setCreateMode] = useState<CreateMode>(null); const hints = [{ title: '待审核任务', desc: `当前共有 ${data.tasks.length} 条任务需要处理。`, level: data.tasks.length ? '待处理' : '已完成', action: '进入审核中心' }, { title: '资料绑定情况', desc: `资料库中已有 ${data.sources.length} 条来源。`, level: data.sources.length ? '资料库' : '待补充', action: '查看资料' }, { title: '关系校验建议', desc: data.people.length >= 2 ? `可对 ${data.people[0].name} 与 ${data.people[1].name} 做亲子关系预检。` : '新增人物后可进行关系预检。', level: '待校验', action: '关系预检' }]; return <div className="xp-page"><section className="xp-hero"><div><span>{data.activeClan?.clanName || '族谱首页'}</span><h1>围绕族谱本身协作修谱，而不是围绕表格录数据</h1><p>首页聚合家族概览、最近更新、待审核、智能线索和快速进入世系图。</p></div><div className="xp-hero-actions"><Button onClick={data.refreshAll}>刷新数据</Button><Button type="primary" onClick={() => setCreateMode(data.selectedPerson ? 'child' : 'person')}>{data.selectedPerson ? '新增亲属' : '新增人物'}</Button></div></section><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-dashboard-grid">{[['族人', data.people.length, '来自人物接口'], ['支派', data.branches.length, '来自支派接口'], ['待审核', data.tasks.length, '来自审核接口'], ['资料', data.sources.length, '来自来源接口'], ['日志', data.logTotal, '来自审计统计']].map(item => <div className="xp-stat" key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong><p>{item[2]}</p></div>)}</section><section className="xp-main-layout"><div className="xp-card xp-card--wide"><SectionHeader eyebrow="Family Tree" title="最近维护的世系图" desc="点击人物节点即可查看档案、亲属和来源。" /><TreeCanvas data={data} onCreate={setCreateMode} onInspectPerson={() => data.selectedPerson && data.setMessage(`已选中人物：${data.selectedPerson.name}`)} /></div><div className="xp-stack"><div className="xp-card"><SectionHeader eyebrow="Hints" title="智能线索" desc="基于真实数据生成待办提示。" />{hints.map(item => <div className="xp-hint" key={item.title}><Badge>{item.level}</Badge><strong>{item.title}</strong><p>{item.desc}</p><button className="link-button" onClick={() => data.setMessage(item.desc)}>{item.action}</button></div>)}</div><div className="xp-card"><SectionHeader eyebrow="Tasks" title="待办审核" desc="按紧急程度处理入谱变更。" />{data.tasks.length ? data.tasks.map(item => <div className="xp-task" key={item.id || item.title}><strong>{item.title}</strong><p>{item.type} · {item.user} · {item.time}</p><Badge>{item.status}</Badge></div>) : <EmptyGuide text="暂无待审核任务。" />}</div></div></section><CreatePersonModal data={data} mode={createMode} onClose={() => setCreateMode(null)} /></div>; }
export function GenealogyTreeProductPage() { const data = useExperienceData(); const [createMode, setCreateMode] = useState<CreateMode>(null); const [detailOpen, setDetailOpen] = useState(false); return <div className="xp-page"><SectionHeader eyebrow="Tree" title="世系图谱" desc="以族谱树为核心查看档案、亲属关系和后端返回的关系线。" action={data.selectedPerson ? '新增亲属' : '新增人物'} onAction={() => setCreateMode(data.selectedPerson ? 'child' : 'person')} /><ExperienceNotice message={data.message} loading={data.loading} /><div className="xp-tree-layout"><TreeCanvas data={data} onCreate={setCreateMode} onInspectPerson={() => setDetailOpen(true)} /><PersonSidePanel data={data} onCreate={setCreateMode} onOpenDetail={() => setDetailOpen(true)} /></div><PersonDetailDrawer data={data} open={detailOpen} onClose={() => setDetailOpen(false)} onCreate={setCreateMode} /><CreatePersonModal data={data} mode={createMode} onClose={() => setCreateMode(null)} /></div>; }
export function PersonArchiveProductPage() { const data = useExperienceData(); const [createMode, setCreateMode] = useState<CreateMode>(null); const selected = data.selectedPerson; const events = buildEvents(selected); const completeness = selected ? Math.min(96, 38 + ['name', 'gender', 'generationNo', 'generationWord', 'branchId'].filter(key => selected.raw?.[key]).length * 10 + data.relationships.length * 4 + data.sources.length * 2) : 0; return <div className="xp-page"><SectionHeader eyebrow="Person" title="人物档案" desc="人物档案聚合基本信息、生命事件、亲属关系、来源证据、照片附件和审核状态。" action="新增人物" onAction={() => setCreateMode('person')} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-person-layout"><PersonSidePanel data={data} onCreate={setCreateMode} onOpenDetail={() => data.setMessage('请进入世系图谱查看抽屉详情。')} /><main className="xp-card xp-card--wide">{selected ? <><h3>{selected.name} 的资料完整度</h3><div className="xp-completion"><div style={{ width: `${completeness}%` }} /></div><div className="xp-checklist">{['基本信息已填写', '亲属关系已建立', '至少绑定一条来源', '照片或附件已上传', '通过审核后正式入谱'].map((item, index) => <div key={item}><span>{index < Math.ceil(completeness / 22) ? '✓' : '○'}</span><strong>{item}</strong></div>)}</div><h3>生命事件时间线</h3><div className="xp-timeline xp-timeline--wide">{events.length ? events.map(item => <div key={`${item.year}-${item.title}`}><span>{item.year}</span><strong>{item.title}</strong><p>{item.detail}</p></div>) : <EmptyGuide text="暂无生命事件。" />}</div></> : <EmptyGuide text="暂无人物档案，请点击右上角“新增人物”。" />}</main></section><CreatePersonModal data={data} mode={createMode} onClose={() => setCreateMode(null)} /></div>; }
export function SourceLibraryProductPage() { const data = useExperienceData(); const [sourceOpen, setSourceOpen] = useState(false); const [keyword, setKeyword] = useState(''); const [sourceType, setSourceType] = useState(''); const [bindPersonId, setBindPersonId] = useState(data.workspace.personId || ''); const selectedPerson = data.people.find(person => person.id === bindPersonId) || data.selectedPerson; const filteredSources = useMemo(() => data.sources.filter(source => { const keywordText = keyword.trim().toLowerCase(); const matchesKeyword = !keywordText || [source.title, source.category, source.owner, source.status, source.bind].some(value => String(value || '').toLowerCase().includes(keywordText)); const matchesType = !sourceType || source.category === sourceType; return matchesKeyword && matchesType; }), [data.sources, keyword, sourceType]); const sourceTypeOptions = useMemo(() => Array.from(new Set(data.sources.map(source => source.category).filter(Boolean))).map(type => ({ value: type, label: type })), [data.sources]); function selectSource(source: SourceView) { if (source.id) data.workspace.setSourceId(source.id); data.setMessage(`已选择来源资料“${businessSourceTitle(source)}”，可绑定到${businessPersonLabel(selectedPerson)}。`); } function bindCandidate(source: SourceView) { if (!selectedPerson) { data.setMessage('请先选择人物作为来源绑定对象。'); return; } if (source.id) data.workspace.setSourceId(source.id); data.workspace.setPersonId(selectedPerson.id); data.setMessage(`已选择“${businessSourceTitle(source)}”作为“${selectedPerson.name}”的来源绑定候选，请到来源绑定流程完成提交。`); } return <div className="xp-page"><SectionHeader eyebrow="Evidence" title="来源资料库" desc="把族谱原文、地方志、墓志照片、口述记录、证件资料统一作为证据管理。" action="新增资料" onAction={() => setSourceOpen(true)} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-source-layout"><Card className="xp-card xp-card--wide" title="来源资料检索" extra={<Button onClick={data.refreshAll}>刷新资料</Button>}><Space direction="vertical" size="middle" style={{ width: '100%' }}><Space wrap style={{ width: '100%' }}><Input.Search style={{ width: 320 }} value={keyword} onChange={event => setKeyword(event.target.value)} onSearch={setKeyword} placeholder="搜索资料题名、姓氏、堂号、地域、年代" allowClear /><Select style={{ width: 180 }} value={sourceType} onChange={setSourceType} options={[{ value: '', label: '全部资料类型' }, ...sourceTypeOptions]} /><Select showSearch optionFilterProp="label" style={{ width: 280 }} value={bindPersonId || selectedPerson?.id || ''} onChange={value => setBindPersonId(value)} options={[{ value: '', label: '请选择绑定对象' }, ...data.people.map(person => ({ value: person.id, label: businessPersonLabel(person) }))]} /></Space>{filteredSources.length ? filteredSources.map(source => <Card key={source.id || source.title} size="small" className="xp-source-row" hoverable onClick={() => selectSource(source)}><Space direction="vertical" size="small" style={{ width: '100%' }}><Space wrap style={{ justifyContent: 'space-between', width: '100%' }}><strong>{businessSourceTitle(source)}</strong><Space wrap><Tag>{source.category}</Tag><Tag color={sourceStatusColor(source.raw?.verificationStatus || source.raw?.status)}>{source.status}</Tag></Space></Space><span>{source.owner} · {source.bind} · 可信度：{source.confidence}</span><Space wrap><Button type="link" onClick={event => { event.stopPropagation(); selectSource(source); }}>查看资料</Button><Button type="link" onClick={event => { event.stopPropagation(); bindCandidate(source); }}>作为绑定候选</Button></Space></Space></Card>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无来源资料，请点击右上角“新增资料”。" />}</Space></Card><Card className="xp-card" title="资料绑定对象"><Space direction="vertical" size="middle" style={{ width: '100%' }}><Tag color="processing">{businessPersonLabel(selectedPerson)}</Tag><span>来源绑定对象通过人物姓名、支派、代次选择，避免展示技术字段。</span><div>{['题名 / 卷册 / 页码', '姓氏 / 堂号 / 地域', '版本年代 / 收藏机构', 'OCR转写 / 原图对照', '可信度与引用记录'].map(item => <div className="xp-mini-item" key={item}>{item}</div>)}</div></Space></Card></section><CreateSourceModal data={data} open={sourceOpen} onClose={() => setSourceOpen(false)} /></div>; }
export function EditingWorkspaceProductPage() { const data = useExperienceData(); const first = data.people[0]; const second = data.people[1]; const hints = [{ title: '疑似重复人物', desc: data.people.length > 1 ? `${first.name} 与 ${second.name} 可进一步检查是否存在重复或关系冲突。` : '人物数量不足，暂无法分析重复。', level: '待处理', action: '检查关系' }, { title: '资料补齐', desc: `当前资料库有 ${data.sources.length} 条来源，可继续绑定到人物档案。`, level: '待补充', action: '查看资料' }, { title: '字辈校验', desc: '基于人物代次和字辈字段做一致性检查。', level: '待校验', action: '查看校验' }]; return <div className="xp-page"><SectionHeader eyebrow="Workspace" title="修谱工作台" desc="把批量导入、重复合并、缺失补齐、字辈校验、关系冲突集中成编辑工作流。" action="刷新工作台" onAction={data.refreshAll} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-board">{hints.map(item => <div className="xp-board-card" key={item.title}><Badge>{item.level}</Badge><h3>{item.title}</h3><p>{item.desc}</p><button onClick={() => item.title.includes('重复') && first && second ? data.checkRelationshipConflict(first.id, second.id) : data.setMessage(item.desc)}>{item.action}</button></div>)}<div className="xp-board-card"><Badge>导入</Badge><h3>CSV 族谱导入</h3><p>真实导入能力已在基础数据管理的导入导出中接入。</p><button onClick={() => data.setMessage('请进入基础数据管理 > 导入导出执行 CSV 预校验和导入')}>去导入</button></div></section></div>; }
export function ReviewCenterProductPage() { const data = useExperienceData(); return <div className="xp-page"><SectionHeader eyebrow="Review" title="审核中心" desc="按人物变更、关系变更、来源复核、支派变更、字辈方案变更组织审核任务。" action="刷新审核" onAction={data.refreshAll} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-card xp-card--wide">{data.tasks.length ? data.tasks.map(item => <div className="xp-review-row" key={item.id || item.title}><div><strong>{item.title}</strong><p>{item.type} · 提交人：{item.user} · {item.time}</p></div><Badge>{item.status}</Badge><div className="xp-row-actions"><button onClick={() => data.setMessage('审核差异详情后续接入 review-task detail')}>查看差异</button><button className="secondary" onClick={() => item.id && data.approveTask(item.id)}>通过</button><button className="ghost" onClick={() => item.id && data.rejectTask(item.id)}>驳回</button></div></div>) : <EmptyGuide text="当前没有待审核任务。" />}</section></div>; }
export function CultureProductPage() { const data = useExperienceData(); const { token } = theme.useToken(); const cultureCards = [{ title: '堂号', value: display(data.activeClan?.hallName, '待维护'), desc: data.activeClan?.hallName ? '来自宗族基础信息。' : '后端暂未返回堂号信息。' }, { title: '郡望', value: display(data.activeClan?.commandery, '待维护'), desc: data.activeClan?.commandery ? '来自宗族基础信息。' : '后端暂未返回郡望信息。' }, { title: '祖籍/发源地', value: display(data.activeClan?.originPlace, '待维护'), desc: data.activeClan?.originPlace ? '可作为迁徙脉络起点。' : '后端暂未返回祖籍或发源地。' }, { title: '家训家风', value: display(data.activeClan?.familyInstruction || data.activeClan?.familyMotto || data.activeClan?.clanMotto, '待维护'), desc: data.activeClan?.familyInstruction || data.activeClan?.familyMotto || data.activeClan?.clanMotto ? '来自宗族文化字段。' : '后端暂未返回家训内容，不在前端补造。' }]; const migrationBranches = data.branches.filter(branch => branch.migrationFrom || branch.migrationTo); const cultureSources = data.sources.slice(0, 6); return <div className="xp-page"><SectionHeader eyebrow="Culture" title="宗族文化" desc="沉淀姓氏源流、堂号、家训、谱序、凡例、迁徙路线、祠堂和纪念活动。" action="刷新文化资料" onAction={data.refreshAll} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-culture-grid">{cultureCards.map(item => <Card key={item.title} className="xp-culture-card" style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }}><Space direction="vertical" size="small"><Tag>{item.title}</Tag><Typography.Title level={4} style={{ margin: 0 }}>{item.value}</Typography.Title><Typography.Text type="secondary">{item.desc}</Typography.Text></Space></Card>)}</section><Card className="xp-card xp-card--wide" title="迁徙路线" style={{ marginTop: 16 }}>{migrationBranches.length ? <Space direction="vertical" size="small" style={{ width: '100%' }}>{migrationBranches.map(branch => <Card key={branch.id || branch.branchName} size="small"><Space wrap><Tag>{branchName(branch)}</Tag><span>{display(branch.migrationFrom, '迁出地待维护')} → {display(branch.migrationTo, '迁入地待维护')}</span></Space><Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>{display(branch.description, '暂无支派迁徙说明。')}</Typography.Paragraph></Card>)}</Space> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无迁徙脉络，请在支派管理中维护迁徙信息。" />}</Card><Card className="xp-card xp-card--wide" title="文化资料" style={{ marginTop: 16 }}>{cultureSources.length ? <Space direction="vertical" size="small" style={{ width: '100%' }}>{cultureSources.map(source => <Card key={source.id || source.title} size="small"><Space wrap style={{ justifyContent: 'space-between', width: '100%' }}><Typography.Text strong>{source.title}</Typography.Text><Space><Tag>{source.category}</Tag><Tag color={sourceStatusColor(source.raw?.verificationStatus || source.raw?.status)}>{source.status}</Tag></Space></Space><Typography.Text type="secondary">{source.owner} · {source.bind} · 可信度：{source.confidence}</Typography.Text></Card>)}</Space> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文化资料，可在来源资料库中补充族谱原文、地方志、照片和口述记录。" />}</Card></div>; }
