import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Form, Input, Modal, Select, Space, Switch } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { TreeCanvas } from './TreeCanvas';
import { PersonDetailDrawer, PersonSidePanel } from './PersonDetailDrawer';
import { SourceLibraryProductPage as SourceLibraryProductPageView } from './SourceLibraryProductPage';
import { CultureProductPage as CultureProductPageView } from './CultureProductPage';
import { GENDER_OPTIONS, confidenceText, relationTypeText, sourceStatusText, sourceTypeText, statusText, targetTypeText } from './dictionaries';
import type { CreateMode, ExperienceData, PersonForm, PersonView, SourceView, TaskView } from './types';

function rows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.nodes)) return data.nodes;
  return [];
}

function firstChar(name?: string) { return (name || '谱').slice(0, 1); }
function dateText(row: any) {
  const birth = row.birthDate || row.birthYear || row.birthDateText || '';
  const death = row.deathDate || row.deathYear || row.deathDateText || '';
  return birth || death ? `${birth || '?'}-${death || ''}` : '-';
}
function mapStatus(row: any) { return row.status || row.dataStatus || row.verificationStatus || row.reviewStatus || '已记录'; }
function branchName(row: any) { return row.branchName || row.name || '未命名支派'; }

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
    return {
      id,
      name,
      generation: generationNo ? `${generationNo}世` : row.generationName || '-',
      word: row.generationWord || row.word || '-',
      years: dateText(row),
      branch,
      status: mapStatus(row),
      avatar: firstChar(name),
      relation: relationTypeText(row.relationLabel || row.relationType || (index === 0 ? '中心人物' : '亲属')),
      x: Number(row.x ?? xPositions[index % xPositions.length]),
      y: Number(row.y ?? yPositions[index % yPositions.length]),
      raw: row
    };
  });
}

function normalizeSources(rawRows: any[]): SourceView[] {
  return rawRows.map((row, index) => ({
    id: String(row.id || index + 1),
    title: row.sourceName || row.title || row.name || `资料${index + 1}`,
    category: sourceTypeText(row.sourceType || row.category),
    owner: row.createdByName || row.owner || row.creatorName || '族谱资料库',
    confidence: confidenceText(row.confidenceLevel || row.confidence),
    status: sourceStatusText(row.verificationStatus || row.status),
    bind: row.bindingCount ? `已绑定 ${row.bindingCount} 条` : '暂无绑定记录',
    raw: row
  }));
}

function normalizeTasks(rawRows: any[]): TaskView[] {
  return rawRows.map((row, index) => ({
    id: String(row.id || row.taskId || index + 1),
    title: row.title || row.targetName || `${targetTypeText(row.targetType)}审核事项${index + 1}`,
    type: targetTypeText(row.targetType || row.taskType),
    user: row.submitterName || row.createdByName || '提交人待维护',
    time: row.createdAt || row.submitTime || '-',
    status: statusText(row.status),
    raw: row
  }));
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
function ExperienceNotice({ message, loading }: { message: string; loading: boolean }) { return message || loading ? <div className="xp-inline-notice">{loading ? '正在加载真实族谱数据...' : message}</div> : null; }

function useExperienceData(): ExperienceData {
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
  async function checkRelationshipConflict(fromPersonId: string, toPersonId: string) { if (!workspace.clanId || !fromPersonId || !toPersonId) { setMessage('请先选择宗族和两位人物'); return; } const result: any = await apiClient.post(`/clans/${workspace.clanId}/relationships/check-conflict`, { fromPersonId: Number(fromPersonId), toPersonId: Number(toPersonId), relationType: 'parent_child', relationLabel: 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' }); setMessage(result?.conflict ? '发现关系冲突，请进入修谱工作台处理' : '关系预检通过'); }

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { if (workspace.personId) void loadPersonContext(workspace.personId); }, [workspace.personId]);
  const people = useMemo(() => normalizePeople(rawPersons, branches, treeNodes), [rawPersons, branches, treeNodes]);
  const sources = useMemo(() => normalizeSources(rawSources), [rawSources]);
  const selectedPerson = people.find(item => item.id === workspace.personId) || people[0];
  const activeClan = clans.find(item => String(item.id) === workspace.clanId) || clans[0];
  return { workspace, clans, branches, people, relationships, sources, tasks, logTotal, selectedPerson, activeClan, loading, message, setMessage, refreshAll, createPersonRecord, createRelative, createSource, submitPersonReview, approveTask, rejectTask, checkRelationshipConflict };
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

function CreatePersonModal({ data, mode, onClose }: { data: ExperienceData; mode: CreateMode; onClose: () => void }) {
  const [form, setForm] = useState<PersonForm>(() => defaultPersonForm(data, mode));
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (mode) setForm(defaultPersonForm(data, mode)); }, [mode, data.selectedPerson?.id, data.workspace.clanId, data.workspace.branchId, data.branches.length]);
  function patch(key: keyof PersonForm, value: string | boolean) { setForm(prev => ({ ...prev, [key]: value })); }
  async function submit() { if (!mode || saving) return; setSaving(true); try { if (mode === 'person') await data.createPersonRecord(form, true); else await data.createRelative(mode, form); onClose(); } catch (error) { data.setMessage((error as Error).message || '创建失败，请检查输入。'); } finally { setSaving(false); } }
  return <Modal open={Boolean(mode)} title={relationTitle(mode)} onCancel={onClose} footer={<Space><Button type="primary" loading={saving} onClick={() => void submit()}>{saving ? '保存中...' : '保存'}</Button><Button onClick={onClose}>取消</Button></Space>} width={620} destroyOnClose><Form layout="vertical"><Form.Item label="姓名" required><Input value={form.name} onChange={e => patch('name', e.target.value)} placeholder="请输入姓名" /></Form.Item><Form.Item label="性别"><Select value={form.gender} onChange={value => patch('gender', value)} options={GENDER_OPTIONS} /></Form.Item><Form.Item label="支派"><Select showSearch optionFilterProp="label" value={form.branchId} onChange={value => patch('branchId', value)} options={[{ value: '', label: '暂不归属支派' }, ...data.branches.map(branch => ({ value: String(branch.id), label: branchName(branch) }))]} /></Form.Item><Form.Item label="代次"><Input value={form.generationNo} onChange={e => patch('generationNo', e.target.value)} placeholder="例如：20" /></Form.Item><Form.Item label="字辈"><Input value={form.generationWord} onChange={e => patch('generationWord', e.target.value)} placeholder="例如：家" /></Form.Item><Form.Item label="是否在世"><Switch checked={form.isLiving} checkedChildren="在世" unCheckedChildren="已故" onChange={checked => patch('isLiving', checked)} /></Form.Item></Form></Modal>;
}

export function GenealogyHomePage() { const data = useExperienceData(); const [createMode, setCreateMode] = useState<CreateMode>(null); const hints = [{ title: '待审核任务', desc: `当前共有 ${data.tasks.length} 条任务需要处理。`, level: data.tasks.length ? '待处理' : '已完成', action: '进入审核中心' }, { title: '资料绑定情况', desc: `资料库中已有 ${data.sources.length} 条来源。`, level: data.sources.length ? '资料库' : '待补充', action: '查看资料' }, { title: '关系校验建议', desc: data.people.length >= 2 ? `可对 ${data.people[0].name} 与 ${data.people[1].name} 做亲子关系预检。` : '新增人物后可进行关系预检。', level: '待校验', action: '关系预检' }]; return <div className="xp-page"><section className="xp-hero"><div><span>{data.activeClan?.clanName || '族谱首页'}</span><h1>围绕族谱本身协作修谱，而不是围绕表格录数据</h1><p>首页聚合家族概览、最近更新、待审核、智能线索和快速进入世系图。</p></div><div className="xp-hero-actions"><Button onClick={data.refreshAll}>刷新数据</Button><Button type="primary" onClick={() => setCreateMode(data.selectedPerson ? 'child' : 'person')}>{data.selectedPerson ? '新增亲属' : '新增人物'}</Button></div></section><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-dashboard-grid">{[['族人', data.people.length, '来自人物接口'], ['支派', data.branches.length, '来自支派接口'], ['待审核', data.tasks.length, '来自审核接口'], ['资料', data.sources.length, '来自来源接口'], ['日志', data.logTotal, '来自审计统计']].map(item => <div className="xp-stat" key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong><p>{item[2]}</p></div>)}</section><section className="xp-main-layout"><div className="xp-card xp-card--wide"><SectionHeader eyebrow="Family Tree" title="最近维护的世系图" desc="点击人物节点即可查看档案、亲属和来源。" /><TreeCanvas data={data} onCreate={setCreateMode} onInspectPerson={() => data.selectedPerson && data.setMessage(`已选中人物：${data.selectedPerson.name}`)} /></div><div className="xp-stack"><div className="xp-card"><SectionHeader eyebrow="Hints" title="智能线索" desc="基于真实数据生成待办提示。" />{hints.map(item => <div className="xp-hint" key={item.title}><Badge>{item.level}</Badge><strong>{item.title}</strong><p>{item.desc}</p><button className="link-button" onClick={() => data.setMessage(item.desc)}>{item.action}</button></div>)}</div><div className="xp-card"><SectionHeader eyebrow="Tasks" title="待办审核" desc="按紧急程度处理入谱变更。" />{data.tasks.length ? data.tasks.map(item => <div className="xp-task" key={item.id || item.title}><strong>{item.title}</strong><p>{item.type} · {item.user} · {item.time}</p><Badge>{item.status}</Badge></div>) : <EmptyGuide text="暂无待审核任务。" />}</div></div></section><CreatePersonModal data={data} mode={createMode} onClose={() => setCreateMode(null)} /></div>; }
export function GenealogyTreeProductPage() { const data = useExperienceData(); const [createMode, setCreateMode] = useState<CreateMode>(null); const [detailOpen, setDetailOpen] = useState(false); return <div className="xp-page"><SectionHeader eyebrow="Tree" title="世系图谱" desc="以族谱树为核心查看档案、亲属关系和后端返回的关系线。" action={data.selectedPerson ? '新增亲属' : '新增人物'} onAction={() => setCreateMode(data.selectedPerson ? 'child' : 'person')} /><ExperienceNotice message={data.message} loading={data.loading} /><div className="xp-tree-layout"><TreeCanvas data={data} onCreate={setCreateMode} onInspectPerson={() => setDetailOpen(true)} /><PersonSidePanel data={data} onCreate={setCreateMode} onOpenDetail={() => setDetailOpen(true)} /></div><PersonDetailDrawer data={data} open={detailOpen} onClose={() => setDetailOpen(false)} onCreate={setCreateMode} /><CreatePersonModal data={data} mode={createMode} onClose={() => setCreateMode(null)} /></div>; }
export function PersonArchiveProductPage() { const data = useExperienceData(); const [createMode, setCreateMode] = useState<CreateMode>(null); const selected = data.selectedPerson; const events = buildEvents(selected); const completeness = selected ? Math.min(96, 38 + ['name', 'gender', 'generationNo', 'generationWord', 'branchId'].filter(key => selected.raw?.[key]).length * 10 + data.relationships.length * 4 + data.sources.length * 2) : 0; return <div className="xp-page"><SectionHeader eyebrow="Person" title="人物档案" desc="人物档案聚合基本信息、生命事件、亲属关系、来源证据、照片附件和审核状态。" action="新增人物" onAction={() => setCreateMode('person')} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-person-layout"><PersonSidePanel data={data} onCreate={setCreateMode} onOpenDetail={() => data.setMessage('请进入世系图谱查看抽屉详情。')} /><main className="xp-card xp-card--wide">{selected ? <><h3>{selected.name} 的资料完整度</h3><div className="xp-completion"><div style={{ width: `${completeness}%` }} /></div><div className="xp-checklist">{['基本信息已填写', '亲属关系已建立', '至少绑定一条来源', '照片或附件已上传', '通过审核后正式入谱'].map((item, index) => <div key={item}><span>{index < Math.ceil(completeness / 22) ? '✓' : '○'}</span><strong>{item}</strong></div>)}</div><h3>生命事件时间线</h3><div className="xp-timeline xp-timeline--wide">{events.length ? events.map(item => <div key={`${item.year}-${item.title}`}><span>{item.year}</span><strong>{item.title}</strong><p>{item.detail}</p></div>) : <EmptyGuide text="暂无生命事件。" />}</div></> : <EmptyGuide text="暂无人物档案，请点击右上角“新增人物”。" />}</main></section><CreatePersonModal data={data} mode={createMode} onClose={() => setCreateMode(null)} /></div>; }
export function SourceLibraryProductPage() { const data = useExperienceData(); return <SourceLibraryProductPageView data={data} />; }
export function EditingWorkspaceProductPage() { const data = useExperienceData(); const first = data.people[0]; const second = data.people[1]; const hints = [{ title: '疑似重复人物', desc: data.people.length > 1 ? `${first.name} 与 ${second.name} 可进一步检查是否存在重复或关系冲突。` : '人物数量不足，暂无法分析重复。', level: '待处理', action: '检查关系' }, { title: '资料补齐', desc: `当前资料库有 ${data.sources.length} 条来源，可继续绑定到人物档案。`, level: '待补充', action: '查看资料' }, { title: '字辈校验', desc: '基于人物代次和字辈字段做一致性检查。', level: '待校验', action: '查看校验' }]; return <div className="xp-page"><SectionHeader eyebrow="Workspace" title="修谱工作台" desc="把批量导入、重复合并、缺失补齐、字辈校验、关系冲突集中成编辑工作流。" action="刷新工作台" onAction={data.refreshAll} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-board">{hints.map(item => <div className="xp-board-card" key={item.title}><Badge>{item.level}</Badge><h3>{item.title}</h3><p>{item.desc}</p><button onClick={() => item.title.includes('重复') && first && second ? data.checkRelationshipConflict(first.id, second.id) : data.setMessage(item.desc)}>{item.action}</button></div>)}<div className="xp-board-card"><Badge>导入</Badge><h3>CSV 族谱导入</h3><p>真实导入能力已在基础数据管理的导入导出中接入。</p><button onClick={() => data.setMessage('请进入基础数据管理 > 导入导出执行 CSV 预校验和导入')}>去导入</button></div></section></div>; }
export function ReviewCenterProductPage() { const data = useExperienceData(); return <div className="xp-page"><SectionHeader eyebrow="Review" title="审核中心" desc="按人物变更、关系变更、来源复核、支派变更、字辈方案变更组织审核任务。" action="刷新审核" onAction={data.refreshAll} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-card xp-card--wide">{data.tasks.length ? data.tasks.map(item => <div className="xp-review-row" key={item.id || item.title}><div><strong>{item.title}</strong><p>{item.type} · 提交人：{item.user} · {item.time}</p></div><Badge>{item.status}</Badge><div className="xp-row-actions"><button onClick={() => data.setMessage('审核差异详情后续接入 review-task detail')}>查看差异</button><button className="secondary" onClick={() => item.id && data.approveTask(item.id)}>通过</button><button className="ghost" onClick={() => item.id && data.rejectTask(item.id)}>驳回</button></div></div>) : <EmptyGuide text="当前没有待审核任务。" />}</section></div>; }
export function CultureProductPage() { const data = useExperienceData(); return <CultureProductPageView data={data} />; }
