import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';

type PersonView = {
  id: string;
  name: string;
  generation: string;
  word: string;
  years: string;
  branch: string;
  branchId?: string;
  status: string;
  avatar: string;
  relation: string;
  x: number;
  y: number;
  raw?: any;
};

type SourceView = {
  id?: string;
  title: string;
  category: string;
  owner: string;
  confidence: string;
  status: string;
  bind: string;
  raw?: any;
};

type TaskView = {
  id?: string;
  title: string;
  type: string;
  user: string;
  time: string;
  status: string;
  raw?: any;
};

type EventView = { year: string; title: string; detail: string };

type ExperienceData = ReturnType<typeof useExperienceData>;

const cultureItems = [
  { title: '堂号', empty: '暂无堂号信息，请在宗族资料中维护。' },
  { title: '家训', empty: '暂无家训资料，需要新增宗族文化接口后维护。' },
  { title: '迁徙路线', empty: '暂无迁徙路线，需要新增迁徙资料接口后维护。' },
  { title: '祠堂', empty: '暂无祠堂资料，需要新增祠堂资料接口后维护。' }
];

function rows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.nodes)) return data.nodes;
  return [];
}

function firstChar(name?: string) {
  return (name || '谱').slice(0, 1);
}

function value(row: any, keys: string[], fallback = '') {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') return row[key];
  }
  return fallback;
}

function dateText(row: any) {
  const birth = value(row, ['birthDate', 'birthYear', 'birthDateText']);
  const death = value(row, ['deathDate', 'deathYear', 'deathDateText']);
  if (birth || death) return `${birth || '?'}-${death || ''}`;
  return '-';
}

function mapStatus(row: any) {
  return value(row, ['status', 'dataStatus', 'verificationStatus', 'reviewStatus'], '已记录');
}

function normalizePeople(rawRows: any[], branches: any[], treeNodes: any[] = []): PersonView[] {
  const sourceRows = treeNodes.length ? treeNodes : rawRows;
  const xPositions = [44, 30, 58, 35, 62, 20, 76, 44, 12, 88];
  const yPositions = [12, 40, 40, 72, 72, 72, 72, 92, 92, 92];
  return sourceRows.map((row, index) => {
    const id = String(value(row, ['id', 'personId', 'targetId'], String(index + 1)));
    const name = String(value(row, ['name', 'personName', 'displayName'], `人物${index + 1}`));
    const branchId = String(value(row, ['branchId'], ''));
    const branch = branches.find(item => String(item.id) === branchId)?.branchName || value(row, ['branchName', 'branch'], '未归属支派');
    const generationNo = value(row, ['generationNo', 'generation', 'generationNumber']);
    return {
      id,
      name,
      generation: generationNo ? `${generationNo}世` : value(row, ['generationName'], '-'),
      word: value(row, ['generationWord', 'word'], '-'),
      years: dateText(row),
      branch,
      branchId,
      status: mapStatus(row),
      avatar: firstChar(name),
      relation: value(row, ['relationLabel', 'relationType'], index === 0 ? '中心人物' : '亲属'),
      x: xPositions[index % xPositions.length],
      y: yPositions[index % yPositions.length],
      raw: row
    };
  });
}

function normalizeSources(rawRows: any[]): SourceView[] {
  return rawRows.map((row, index) => ({
    id: String(value(row, ['id'], String(index + 1))),
    title: String(value(row, ['sourceName', 'title', 'name'], `资料${index + 1}`)),
    category: String(value(row, ['sourceType', 'category'], '资料来源')),
    owner: String(value(row, ['createdByName', 'owner', 'creatorName'], '族谱资料库')),
    confidence: String(value(row, ['confidenceLevel', 'confidence'], '中')),
    status: String(value(row, ['verificationStatus', 'status'], '待复核')),
    bind: row.bindingCount ? `已绑定 ${row.bindingCount} 条` : '点击查看绑定',
    raw: row
  }));
}

function normalizeTasks(rawRows: any[]): TaskView[] {
  return rawRows.map((row, index) => ({
    id: String(value(row, ['id', 'taskId'], String(index + 1))),
    title: String(value(row, ['title'], `${value(row, ['targetType'], '对象')} #${value(row, ['targetId'], index + 1)}`)),
    type: String(value(row, ['targetType', 'taskType'], '审核任务')),
    user: String(value(row, ['submitterName', 'submitterId', 'createdBy'], '提交人')),
    time: String(value(row, ['createdAt', 'submitTime'], '-')),
    status: String(value(row, ['status'], '待审核')),
    raw: row
  }));
}

function Badge({ children }: { children: string }) {
  const cls = children.includes('待') || children.includes('异常') || children.includes('冲突') ? 'xp-badge xp-badge--warn' : children.includes('草稿') || children.includes('线索') ? 'xp-badge xp-badge--draft' : 'xp-badge';
  return <span className={cls}>{children}</span>;
}

function SectionHeader({ eyebrow, title, desc, action, onAction }: { eyebrow: string; title: string; desc: string; action?: string; onAction?: () => void }) {
  return (
    <div className="xp-section-header">
      <div><span>{eyebrow}</span><h2>{title}</h2><p>{desc}</p></div>
      {action ? <button onClick={onAction}>{action}</button> : null}
    </div>
  );
}

function EmptyGuide({ title = '暂无真实数据', text, action, onAction }: { title?: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="xp-empty-guide"><strong>{title}</strong><p>{text}</p>{action ? <button className="secondary" onClick={onAction}>{action}</button> : null}</div>;
}

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
    try {
      return await fn();
    } catch (error) {
      setMessage(`${label}暂不可用：${(error as Error).message}`);
      return fallback;
    }
  }

  async function loadBase() {
    setLoading(true);
    setMessage('');
    try {
      const clanRows = rows(await safe('宗族列表', () => apiClient.get('/clans'), []));
      setClans(clanRows);
      const nextClanId = workspace.clanId || String(clanRows[0]?.id || '');
      if (nextClanId && !workspace.clanId) workspace.setClanId(nextClanId);

      if (!nextClanId) {
        setBranches([]);
        setRawPersons([]);
        setTreeNodes([]);
        setRelationships([]);
        setRawSources([]);
        setTasks([]);
        setLogTotal('-');
        setMessage('请先登录并创建宗族，产品化页面会展示真实族谱数据。');
        return;
      }

      const [branchRes, personRes, sourceRes, taskRes, logRes] = await Promise.all([
        safe('支派列表', () => apiClient.get(`/clans/${nextClanId}/branches`), []),
        safe('人物列表', () => apiClient.get(`/clans/${nextClanId}/persons`), []),
        safe('来源资料', () => apiClient.get(`/clans/${nextClanId}/sources`), []),
        safe('审核任务', () => apiClient.get(`/clans/${nextClanId}/review-tasks/pending`), []),
        safe('日志统计', () => apiClient.get(`/logs/operations/stats?clanId=${nextClanId}`), null)
      ]);

      const branchRows = rows(branchRes);
      const personRows = rows(personRes);
      setBranches(branchRows);
      setRawPersons(personRows);
      setRawSources(rows(sourceRes));
      setTasks(normalizeTasks(rows(taskRes)));
      setLogTotal((logRes as any)?.totalCount ?? (logRes as any)?.total ?? '-');

      if (!workspace.personId && personRows[0]?.id) workspace.setPersonId(String(personRows[0].id));
      if (!personRows.length) setMessage('当前宗族暂无人物数据，请先在后台管理中新增人物。');
    } finally {
      setLoading(false);
    }
  }

  async function loadPersonContext(personId = workspace.personId) {
    if (!personId) {
      setRelationships([]);
      setTreeNodes([]);
      return;
    }
    setLoading(true);
    try {
      const [relationRes, treeRes] = await Promise.all([
        safe('亲属关系', () => apiClient.get(`/persons/${personId}/relationships`), []),
        safe('世系图谱', () => apiClient.get(`/tree/person/${personId}/family`), null)
      ]);
      setRelationships(rows(relationRes));
      setTreeNodes(rows(treeRes));
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    await loadBase();
    const personId = workspace.personId || rawPersons[0]?.id;
    if (personId) await loadPersonContext(String(personId));
  }

  async function submitPersonReview(personId: string) {
    await apiClient.post(`/persons/${personId}/submit-review`, { diffSummary: '产品化页面提交人物审核' });
    setMessage('人物已提交审核');
    await loadBase();
  }

  async function approveTask(taskId: string) {
    await apiClient.post(`/review-tasks/${taskId}/approve`, { comment: '同意入谱' });
    setMessage('审核已通过');
    await loadBase();
  }

  async function rejectTask(taskId: string) {
    await apiClient.post(`/review-tasks/${taskId}/reject`, { comment: '请补充资料后重新提交' });
    setMessage('审核已驳回');
    await loadBase();
  }

  async function checkRelationshipConflict(fromPersonId: string, toPersonId: string) {
    if (!workspace.clanId || !fromPersonId || !toPersonId) {
      setMessage('请先选择宗族和两位人物');
      return;
    }
    const result: any = await apiClient.post(`/clans/${workspace.clanId}/relationships/check-conflict`, {
      fromPersonId: Number(fromPersonId),
      toPersonId: Number(toPersonId),
      relationType: 'parent_child',
      relationLabel: 'father',
      isLineageRelation: true,
      isBiological: true,
      isPrimary: true,
      confidenceLevel: 'high'
    });
    setMessage(result?.conflict ? '发现关系冲突，请进入修谱工作台处理' : '关系预检通过');
  }

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { void loadPersonContext(workspace.personId); }, [workspace.personId]);

  const people = useMemo(() => normalizePeople(rawPersons, branches, treeNodes), [rawPersons, branches, treeNodes]);
  const sources = useMemo(() => normalizeSources(rawSources), [rawSources]);
  const selectedPerson = people.find(item => item.id === workspace.personId) || people[0];
  const activeClan = clans.find(item => String(item.id) === workspace.clanId) || clans[0];

  return { workspace, clans, branches, people, relationships, sources, tasks, logTotal, selectedPerson, activeClan, loading, message, setMessage, refreshAll, submitPersonReview, approveTask, rejectTask, checkRelationshipConflict };
}

function buildRelatives(person: PersonView | undefined, relationships: any[], people: PersonView[]) {
  if (!person || !relationships.length) return [];
  return relationships.slice(0, 6).map(row => {
    const otherId = String(row.fromPersonId) === person.id ? String(row.toPersonId) : String(row.fromPersonId);
    const other = people.find(item => item.id === otherId);
    return { type: row.relationLabel || row.relationType || '亲属', name: other?.name || `人物#${otherId}`, status: row.dataStatus || row.status || '已记录' };
  });
}

function buildEvents(person: PersonView | undefined): EventView[] {
  if (!person) return [];
  const raw = person.raw || {};
  const list: EventView[] = [];
  if (raw.birthDate || raw.birthYear) list.push({ year: String(raw.birthDate || raw.birthYear), title: `${person.name}出生`, detail: raw.birthPlace || '出生地待补充。' });
  if (raw.deathDate || raw.deathYear) list.push({ year: String(raw.deathDate || raw.deathYear), title: `${person.name}逝世`, detail: raw.tombPlace || '墓葬信息待补充。' });
  if (person.word && person.word !== '-') list.push({ year: person.generation, title: '字辈校验', detail: `${person.name}使用“${person.word}”字辈。` });
  return list;
}

function ExperienceNotice({ message, loading }: { message: string; loading: boolean }) {
  if (!message && !loading) return null;
  return <div className="xp-inline-notice">{loading ? '正在加载真实族谱数据...' : message}</div>;
}

function PersonSidePanel({ data }: { data: ExperienceData }) {
  const person = data.selectedPerson;
  if (!person) return <aside className="xp-person-panel"><EmptyGuide title="暂无人物档案" text="当前宗族还没有人物数据，请先在后台管理中新增人物。" /></aside>;
  const relatives = buildRelatives(person, data.relationships, data.people);
  const events = buildEvents(person);
  return (
    <aside className="xp-person-panel">
      <div className="xp-person-head"><span className="xp-avatar xp-avatar--large">{person.avatar}</span><div><h3>{person.name}</h3><p>{person.branch} · {person.generation} · {person.word}字辈</p><Badge>{person.status}</Badge></div></div>
      <div className="xp-meta-grid"><div><span>生卒</span><strong>{person.years}</strong></div><div><span>关系</span><strong>{person.relation}</strong></div><div><span>支派</span><strong>{person.branch}</strong></div><div><span>入谱状态</span><strong>{person.status}</strong></div></div>
      <div className="xp-action-grid"><button onClick={() => data.setMessage('新增父母入口将复用关系创建接口')}>添加父母</button><button onClick={() => data.setMessage('新增配偶入口将复用关系创建接口')}>添加配偶</button><button onClick={() => data.setMessage('新增子女入口将复用关系创建接口')}>添加子女</button><button className="secondary" onClick={() => data.submitPersonReview(person.id)}>提交审核</button></div>
      <h4>亲属关系</h4>{relatives.length ? <div className="xp-relation-list">{relatives.map(item => <div key={`${item.type}-${item.name}`}><span>{item.type}</span><strong>{item.name}</strong><Badge>{item.status}</Badge></div>)}</div> : <EmptyGuide text="暂无亲属关系，请通过添加父母、配偶或子女建立关系。" />}
      <h4>生命事件</h4>{events.length ? <div className="xp-timeline">{events.map(item => <div key={`${item.year}-${item.title}`}><span>{item.year}</span><strong>{item.title}</strong><p>{item.detail}</p></div>)}</div> : <EmptyGuide text="暂无生命事件，请补充出生、逝世、迁徙等信息。" />}
      <div className="xp-profile-switch">{data.people.slice(0, 8).map(item => <button key={item.id} className={data.workspace.personId === item.id ? 'active' : ''} onClick={() => data.workspace.setPersonId(item.id)}>{item.name}</button>)}</div>
    </aside>
  );
}

function TreeCanvas({ data }: { data: ExperienceData }) {
  return (
    <div className="xp-tree-canvas">
      <div className="xp-tree-toolbar"><strong>{data.activeClan?.clanName || '族谱'}世系图</strong><div><button className="ghost">-</button><button className="ghost">100%</button><button className="ghost">+</button></div></div>
      <div className="xp-tree-area">
        {data.people.length ? <><div className="xp-tree-line xp-tree-line--vertical" /><div className="xp-tree-line xp-tree-line--spouse" /><div className="xp-tree-line xp-tree-line--children" />{data.people.map(person => <button key={person.id} className={`xp-node ${data.workspace.personId === person.id ? 'active' : ''}`} style={{ left: `${person.x}%`, top: `${person.y}%` }} onClick={() => data.workspace.setPersonId(person.id)}><span className="xp-avatar">{person.avatar}</span><strong>{person.name}</strong><em>{person.generation}</em><Badge>{person.status}</Badge></button>)}</> : <EmptyGuide title="暂无世系图数据" text="当前没有真实人物或世系接口数据，请先新增人物并建立关系。" />}
      </div>
    </div>
  );
}

export function GenealogyHomePage() {
  const data = useExperienceData();
  return (
    <div className="xp-page">
      <section className="xp-hero"><div><span>{data.activeClan?.clanName || '族谱首页'}</span><h1>围绕真实族谱数据协作修谱</h1><p>首页只展示后端返回的宗族、人物、支派、来源、审核和日志数据；没有真实数据时给出空态引导，不再展示静态演示人物。</p></div><div className="xp-hero-actions"><button onClick={data.refreshAll}>刷新数据</button><button className="secondary" onClick={() => data.setMessage('请进入后台管理新增人物或关系')}>新增亲属</button></div></section>
      <ExperienceNotice message={data.message} loading={data.loading} />
      <section className="xp-dashboard-grid">{[[ '族人', data.people.length, '来自人物接口' ], [ '支派', data.branches.length, '来自支派接口' ], [ '待审核', data.tasks.length, '来自审核接口' ], [ '资料', data.sources.length, '来自来源接口' ], [ '日志', data.logTotal, '来自审计统计' ]].map(item => <div className="xp-stat" key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong><p>{item[2]}</p></div>)}</section>
      <section className="xp-main-layout"><div className="xp-card xp-card--wide"><SectionHeader eyebrow="Family Tree" title="最近维护的世系图" desc="点击真实人物节点即可查看档案、亲属和来源。" /><TreeCanvas data={data} /></div><div className="xp-stack"><div className="xp-card"><SectionHeader eyebrow="Hints" title="数据线索" desc="基于真实数据生成修谱提醒。" />{data.people.length ? <div className="xp-hint"><Badge>待校验</Badge><strong>关系完整度检查</strong><p>当前宗族已有 {data.people.length} 位人物，可继续补充亲属关系和来源证据。</p></div> : <EmptyGuide text="暂无人物数据，暂不能生成线索。" />}</div><div className="xp-card"><SectionHeader eyebrow="Tasks" title="待办审核" desc="按紧急程度处理入谱变更。" />{data.tasks.length ? data.tasks.map(item => <div className="xp-task" key={item.id || item.title}><strong>{item.title}</strong><p>{item.type} · {item.user} · {item.time}</p><Badge>{item.status}</Badge></div>) : <EmptyGuide text="当前没有待审核任务。" />}</div></div></section>
    </div>
  );
}

export function GenealogyTreeProductPage() {
  const data = useExperienceData();
  return <div className="xp-page"><SectionHeader eyebrow="Tree" title="世系图谱" desc="以真实人物和世系接口为核心查看、编辑和补充亲属。" action="刷新世系" onAction={data.refreshAll} /><ExperienceNotice message={data.message} loading={data.loading} /><div className="xp-tree-layout"><TreeCanvas data={data} /><PersonSidePanel data={data} /></div></div>;
}

export function PersonArchiveProductPage() {
  const data = useExperienceData();
  const selected = data.selectedPerson;
  const events = buildEvents(selected);
  const completeness = selected ? Math.min(96, 38 + ['name', 'gender', 'generationNo', 'generationWord', 'branchId'].filter(key => selected.raw?.[key]).length * 10 + data.relationships.length * 4 + data.sources.length * 2) : 0;
  return <div className="xp-page"><SectionHeader eyebrow="Person" title="人物档案" desc="人物档案展示真实人物、亲属关系、生命事件、资料完整度和审核状态。" action="刷新人物" onAction={data.refreshAll} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-person-layout"><PersonSidePanel data={data} /><main className="xp-card xp-card--wide">{selected ? <><h3>{selected.name} 的资料完整度</h3><div className="xp-completion"><div style={{ width: `${completeness}%` }} /></div><div className="xp-checklist">{['基本信息已填写', '亲属关系已建立', '至少绑定一条来源', '照片或附件已上传', '通过审核后正式入谱'].map((item, index) => <div key={item}><span>{index < Math.ceil(completeness / 22) ? '✓' : '○'}</span><strong>{item}</strong></div>)}</div><h3>生命事件时间线</h3>{events.length ? <div className="xp-timeline xp-timeline--wide">{events.map(item => <div key={`${item.year}-${item.title}`}><span>{item.year}</span><strong>{item.title}</strong><p>{item.detail}</p></div>)}</div> : <EmptyGuide text="暂无生命事件，请补充人物出生、逝世、迁徙等信息。" />}</> : <EmptyGuide title="暂无人物档案" text="当前宗族没有真实人物数据，请先在后台管理中新增人物。" />}</main></section></div>;
}

export function SourceLibraryProductPage() {
  const data = useExperienceData();
  return <div className="xp-page"><SectionHeader eyebrow="Evidence" title="来源资料库" desc="展示后端来源资料数据，并引导绑定到人物或关系。" action="刷新资料" onAction={data.refreshAll} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-source-layout"><div className="xp-card xp-card--wide"><div className="xp-search-bar"><input placeholder="搜索资料题名、姓氏、堂号、地域、年代" /><button onClick={() => data.setMessage('搜索会基于真实来源列表和文献元数据过滤')}>搜索</button></div>{data.sources.length ? data.sources.map(item => <div className="xp-source-row" key={item.id || item.title}><div><strong>{item.title}</strong><p>{item.category} · {item.owner} · {item.bind}</p></div><div><Badge>{item.status}</Badge><span>可信度：{item.confidence}</span></div></div>) : <EmptyGuide text="暂无来源资料，请先上传族谱原文、照片或口述记录。" />}</div><aside className="xp-card"><h3>资料著录建议</h3>{['题名 / 卷册 / 页码', '姓氏 / 堂号 / 地域', '版本年代 / 收藏机构', 'OCR转写 / 原图对照', '可信度与引用记录'].map(item => <div className="xp-mini-item" key={item}>{item}</div>)}</aside></section></div>;
}

export function EditingWorkspaceProductPage() {
  const data = useExperienceData();
  const first = data.people[0];
  const second = data.people[1];
  return <div className="xp-page"><SectionHeader eyebrow="Workspace" title="修谱工作台" desc="基于真实人物、关系和来源数据进行导入、合并、补全、字辈校验和关系冲突处理。" action="刷新工作台" onAction={data.refreshAll} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-board"><div className="xp-board-card"><Badge>{data.people.length >= 2 ? '可执行' : '待补充'}</Badge><h3>关系冲突预检</h3><p>{data.people.length >= 2 ? `可对 ${first.name} 与 ${second.name} 做亲子关系预检。` : '至少需要两位人物才能进行关系预检。'}</p><button onClick={() => first && second ? data.checkRelationshipConflict(first.id, second.id) : data.setMessage('请先新增至少两位人物')}>检查关系</button></div><div className="xp-board-card"><Badge>资料</Badge><h3>来源绑定</h3><p>当前资料库有 {data.sources.length} 条来源，可继续绑定到人物档案。</p><button onClick={() => data.setMessage('来源绑定能力保留在后台管理的来源页面，后续可迁移到这里')}>查看资料</button></div><div className="xp-board-card"><Badge>字辈</Badge><h3>字辈校验</h3><p>基于真实人物代次和字辈字段做一致性检查。</p><button onClick={() => data.setMessage('字辈校验需要继续接入字辈方案接口')}>查看校验</button></div><div className="xp-board-card"><Badge>导入</Badge><h3>CSV 族谱导入</h3><p>真实导入能力已在后台管理的导入导出页接入。</p><button onClick={() => data.setMessage('请进入后台管理 → 导入导出执行 CSV 预校验和导入')}>去导入</button></div></section></div>;
}

export function ReviewCenterProductPage() {
  const data = useExperienceData();
  return <div className="xp-page"><SectionHeader eyebrow="Review" title="审核中心" desc="展示真实待审核任务，并支持通过、驳回。" action="刷新审核" onAction={data.refreshAll} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-card xp-card--wide">{data.tasks.length ? data.tasks.map(item => <div className="xp-review-row" key={item.id || item.title}><div><strong>{item.title}</strong><p>{item.type} · 提交人：{item.user} · {item.time}</p></div><Badge>{item.status}</Badge><div className="xp-row-actions"><button onClick={() => data.setMessage('审核差异详情后续接入 review-task detail')}>查看差异</button><button className="secondary" onClick={() => item.id && data.approveTask(item.id)}>通过</button><button className="ghost" onClick={() => item.id && data.rejectTask(item.id)}>驳回</button></div></div>) : <EmptyGuide text="当前没有待审核任务。" />}</section></div>;
}

export function CultureProductPage() {
  const data = useExperienceData();
  return <div className="xp-page"><SectionHeader eyebrow="Culture" title="宗族文化" desc="当前后端暂无专用文化资料接口，仅展示宗族基础信息和空态引导。" action="刷新文化资料" onAction={data.refreshAll} /><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-culture-grid">{cultureItems.map(item => <div className="xp-culture-card" key={item.title}><span>{item.title}</span><strong>{item.title === '堂号' ? (data.activeClan?.hallName || '未维护') : '未维护'}</strong><p>{item.empty}</p></div>)}</section><section className="xp-card xp-card--wide"><h3>迁徙路线</h3><div className="xp-route"><span>{data.activeClan?.originPlace || '祖籍地未维护'}</span><i /> <span>{data.branches[0]?.branchName || '支派未维护'}</span><i /> <span>现代分布待维护</span></div></section></div>;
}
