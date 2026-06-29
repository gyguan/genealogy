import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable, toRecordList } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

type StepKey = 'clan' | 'branch' | 'generation' | 'person' | 'relationship' | 'source' | 'review' | 'tree';
type Notice = { message: string; id?: string | number };
type Props = { notify: (data: unknown, error?: boolean) => void };

type Snapshot = {
  clans?: unknown;
  branches?: unknown;
  schemes?: unknown;
  words?: unknown;
  persons?: unknown;
  relationships?: unknown;
  sources?: unknown;
  bindings?: unknown;
  tasks?: unknown;
  tree?: any;
};

const stepOrder: { key: StepKey; title: string; desc: string }[] = [
  { key: 'clan', title: '1. 创建宗族', desc: '建立宗族空间，确定姓氏、堂号、祖籍等主数据。' },
  { key: 'branch', title: '2. 建立支派', desc: '创建房支/支派，后续人物和权限都围绕支派展开。' },
  { key: 'generation', title: '3. 维护字辈', desc: '创建字辈方案，并录入世次与字辈映射。' },
  { key: 'person', title: '4. 录入人物', desc: '录入中心人物或始祖，并进入后续关系维护。' },
  { key: 'relationship', title: '5. 建立关系', desc: '围绕中心人物添加父母、配偶、子女等关系。' },
  { key: 'source', title: '6. 绑定来源', desc: '创建老谱/口述/墓碑等资料来源，并绑定到人物或关系。' },
  { key: 'review', title: '7. 提交审核', desc: '将草稿提交审核，审核通过后进入正式谱库。' },
  { key: 'tree', title: '8. 查看世系', desc: '查看家庭图、下延世系、上溯世系，并导出基础数据。' }
];

function firstId(data: unknown) {
  const first = toRecordList(data)[0];
  return first?.id ? String(first.id) : '';
}

function makeNotice(message: string, id?: string | number): Notice {
  return id ? { message, id } : { message };
}

export function Mvp1WizardPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [active, setActive] = useState<StepKey>('clan');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Notice | unknown>();
  const [snapshot, setSnapshot] = useState<Snapshot>({});

  const [clanForm, setClanForm] = useState({ clanName: '', surname: '', clanCode: '', hallName: '', originPlace: '' });
  const [branchForm, setBranchForm] = useState({ branchName: '', parentId: '' });
  const [schemeForm, setSchemeForm] = useState({ schemeId: '', schemeName: '主派语', generationNo: '1', word: '' });
  const [personForm, setPersonForm] = useState({ name: '', gender: 'male', generationNo: '', generationWord: '', branchId: '', isLiving: 'true' });
  const [relativeForm, setRelativeForm] = useState({ mode: 'father', name: '', gender: 'male', generationNo: '', generationWord: '' });
  const [sourceForm, setSourceForm] = useState({ sourceName: '', sourceType: 'genealogy_book', targetType: 'person', targetId: '' });
  const [reviewForm, setReviewForm] = useState({ targetType: 'persons', targetId: '', comment: '同意入谱' });
  const [treeMode, setTreeMode] = useState('family');
  const [depth, setDepth] = useState('5');

  const clans = toRecordList<any>(snapshot.clans);
  const branches = toRecordList<any>(snapshot.branches);
  const schemes = toRecordList<any>(snapshot.schemes);
  const persons = toRecordList<any>(snapshot.persons);
  const sources = toRecordList<any>(snapshot.sources);
  const relationships = toRecordList<any>(snapshot.relationships);
  const tasks = toRecordList<any>(snapshot.tasks);
  const treeNodes = toRecordList<any>(snapshot.tree?.nodes || []);
  const treeEdges = toRecordList<any>(snapshot.tree?.edges || []);

  const selectedPerson = useMemo(() => persons.find(item => String(item.id) === workspace.personId), [persons, workspace.personId]);

  const steps = useMemo(() => [
    { ...stepOrder[0], ready: Boolean(workspace.clanId) },
    { ...stepOrder[1], ready: Boolean(workspace.branchId) },
    { ...stepOrder[2], ready: Boolean(schemeForm.schemeId || firstId(snapshot.schemes)) },
    { ...stepOrder[3], ready: Boolean(workspace.personId) },
    { ...stepOrder[4], ready: Boolean(workspace.relationshipId || relationships.length) },
    { ...stepOrder[5], ready: Boolean(workspace.sourceId) },
    { ...stepOrder[6], ready: Boolean(workspace.reviewTaskId || tasks.length) },
    { ...stepOrder[7], ready: Boolean(treeNodes.length) }
  ], [workspace.clanId, workspace.branchId, workspace.personId, workspace.relationshipId, workspace.sourceId, workspace.reviewTaskId, schemeForm.schemeId, snapshot.schemes, relationships.length, tasks.length, treeNodes.length]);

  async function safe<T>(label: string, fn: () => Promise<T>, fallback: T) {
    try { return await fn(); } catch (error) { notify({ message: `${label}失败：${(error as Error).message}` }, true); return fallback; }
  }

  async function run(action: () => Promise<Notice | void>) {
    if (loading) return;
    setLoading(true);
    try {
      const next = await action();
      if (next) { setResult(next); notify(next); }
    } catch (error) {
      const notice = makeNotice((error as Error).message || '操作失败');
      setResult(notice);
      notify(notice, true);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    const clanRes = await safe('查询宗族', () => apiClient.get('/clans'), []);
    const nextClanId = workspace.clanId || firstId(clanRes);
    if (nextClanId && !workspace.clanId) workspace.setClanId(nextClanId);

    const branchRes = nextClanId ? await safe('查询支派', () => apiClient.get(`/clans/${nextClanId}/branches`), []) : [];
    const personRes = nextClanId ? await safe('查询人物', () => apiClient.get(`/clans/${nextClanId}/persons`), []) : [];
    const sourceRes = nextClanId ? await safe('查询来源', () => apiClient.get(`/clans/${nextClanId}/sources`), []) : [];
    const schemeRes = nextClanId ? await safe('查询字辈', () => apiClient.get(`/clans/${nextClanId}/generation-schemes`), []) : [];
    const taskRes = nextClanId ? await safe('查询审核任务', () => apiClient.get(`/clans/${nextClanId}/review-tasks/pending`), []) : [];
    const nextPersonId = workspace.personId || firstId(personRes);
    const relationRes = nextPersonId ? await safe('查询关系', () => apiClient.get(`/persons/${nextPersonId}/relationships`), []) : [];
    const treeRes = nextPersonId ? await safe('查询世系', () => apiClient.get(`/tree/person/${nextPersonId}/family`), null) : null;

    if (!workspace.branchId && firstId(branchRes)) workspace.setBranchId(firstId(branchRes));
    if (!workspace.personId && nextPersonId) workspace.setPersonId(nextPersonId);
    if (!workspace.sourceId && firstId(sourceRes)) workspace.setSourceId(firstId(sourceRes));
    if (!workspace.reviewTaskId && firstId(taskRes)) workspace.setReviewTaskId(firstId(taskRes));
    if (!schemeForm.schemeId && firstId(schemeRes)) setSchemeForm(prev => ({ ...prev, schemeId: firstId(schemeRes) }));

    setSnapshot({ clans: clanRes, branches: branchRes, persons: personRes, sources: sourceRes, schemes: schemeRes, tasks: taskRes, relationships: relationRes, tree: treeRes });
  }

  useEffect(() => { void refresh(); }, []);

  function patchClan(key: keyof typeof clanForm, value: string) { setClanForm(prev => ({ ...prev, [key]: value })); }
  function patchPerson(key: keyof typeof personForm, value: string) { setPersonForm(prev => ({ ...prev, [key]: value })); }
  function patchRelative(key: keyof typeof relativeForm, value: string) { setRelativeForm(prev => ({ ...prev, [key]: value })); }
  function patchSource(key: keyof typeof sourceForm, value: string) { setSourceForm(prev => ({ ...prev, [key]: value })); }

  async function createClan() {
    await run(async () => {
      const data: any = await apiClient.post('/clans', clanForm);
      if (data?.id) workspace.setClanId(String(data.id));
      await refresh();
      setActive('branch');
      return makeNotice('宗族创建成功，已进入支派维护', data?.id);
    });
  }

  async function createBranch() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请先创建或选择宗族');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/branches`, {
        branchName: branchForm.branchName,
        parentId: branchForm.parentId ? Number(branchForm.parentId) : null
      });
      if (data?.id) workspace.setBranchId(String(data.id));
      await refresh();
      setActive('generation');
      return makeNotice('支派创建成功，已进入字辈维护', data?.id);
    });
  }

  async function createScheme() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请先创建或选择宗族');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/generation-schemes`, {
        branchId: workspace.branchId ? Number(workspace.branchId) : null,
        schemeName: schemeForm.schemeName,
        isDefault: true,
        validationEnabled: true,
        strictMode: false
      });
      if (data?.id) setSchemeForm(prev => ({ ...prev, schemeId: String(data.id) }));
      await refresh();
      return makeNotice('字辈方案创建成功', data?.id);
    });
  }

  async function addGenerationWord() {
    await run(async () => {
      if (!schemeForm.schemeId) throw new Error('请先创建或选择字辈方案');
      const data: any = await apiClient.post(`/generation-schemes/${schemeForm.schemeId}/items`, {
        generationNo: Number(schemeForm.generationNo),
        word: schemeForm.word
      });
      await refresh();
      setActive('person');
      return makeNotice('字辈明细已追加，已进入人物录入', data?.id);
    });
  }

  async function createPerson() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请先创建或选择宗族');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/persons`, {
        branchId: (personForm.branchId || workspace.branchId) ? Number(personForm.branchId || workspace.branchId) : null,
        name: personForm.name,
        gender: personForm.gender,
        generationNo: personForm.generationNo ? Number(personForm.generationNo) : null,
        generationWord: personForm.generationWord,
        isLiving: personForm.isLiving === 'true',
        privacyLevel: 'clan_only'
      });
      if (data?.id) workspace.setPersonId(String(data.id));
      await refresh();
      setActive('relationship');
      return makeNotice('人物创建成功，已进入关系维护', data?.id);
    });
  }

  async function createRelative() {
    await run(async () => {
      if (!workspace.clanId || !workspace.personId) throw new Error('请先选择中心人物');
      const created: any = await apiClient.post(`/clans/${workspace.clanId}/persons`, {
        branchId: workspace.branchId ? Number(workspace.branchId) : null,
        name: relativeForm.name,
        gender: relativeForm.gender,
        generationNo: relativeForm.generationNo ? Number(relativeForm.generationNo) : null,
        generationWord: relativeForm.generationWord,
        isLiving: true,
        privacyLevel: 'clan_only'
      });
      if (!created?.id) throw new Error('亲属人物创建失败');
      const mode = relativeForm.mode;
      const relationBody = mode === 'spouse'
        ? { fromPersonId: Number(workspace.personId), toPersonId: Number(created.id), relationType: 'spouse', relationLabel: 'spouse', isLineageRelation: false, isBiological: false, isPrimary: true, confidenceLevel: 'high' }
        : mode === 'child'
          ? { fromPersonId: Number(workspace.personId), toPersonId: Number(created.id), relationType: 'parent_child', relationLabel: selectedPerson?.gender === 'female' ? 'mother' : 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' }
          : { fromPersonId: Number(created.id), toPersonId: Number(workspace.personId), relationType: 'parent_child', relationLabel: mode === 'mother' ? 'mother' : 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' };
      const relationship: any = await apiClient.post(`/clans/${workspace.clanId}/relationships`, relationBody);
      if (relationship?.id) workspace.setRelationshipId(String(relationship.id));
      await refresh();
      setActive('source');
      return makeNotice('亲属关系创建成功，已进入来源绑定', relationship?.id);
    });
  }

  async function createSource() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请先选择宗族');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/sources`, {
        sourceName: sourceForm.sourceName,
        sourceType: sourceForm.sourceType
      });
      if (data?.id) workspace.setSourceId(String(data.id));
      await refresh();
      return makeNotice('来源创建成功，可以继续绑定到人物或关系', data?.id);
    });
  }

  async function bindSource() {
    await run(async () => {
      const sourceId = workspace.sourceId || firstId(snapshot.sources);
      const targetId = sourceForm.targetId || (sourceForm.targetType === 'relationship' ? workspace.relationshipId : workspace.personId);
      if (!sourceId || !targetId) throw new Error('请先选择来源和绑定对象');
      const data: any = await apiClient.post('/source-bindings', {
        sourceId: Number(sourceId),
        targetType: sourceForm.targetType,
        targetId: Number(targetId)
      });
      await refresh();
      setActive('review');
      return makeNotice('来源绑定成功，已进入审核提交', data?.id);
    });
  }

  async function submitReview() {
    await run(async () => {
      const targetId = reviewForm.targetId || workspace.personId;
      if (!targetId) throw new Error('请选择要提交审核的对象');
      const data: any = await apiClient.post(`/${reviewForm.targetType}/${targetId}/submit-review`, { diffSummary: 'MVP1 建谱向导提交审核' });
      if (data?.id) workspace.setReviewTaskId(String(data.id));
      await refresh();
      return makeNotice('审核提交成功，请在审核中心处理任务', data?.id);
    });
  }

  async function approveReview() {
    await run(async () => {
      if (!workspace.reviewTaskId) throw new Error('请先选择审核任务');
      await apiClient.post(`/review-tasks/${workspace.reviewTaskId}/approve`, { comment: reviewForm.comment });
      await refresh();
      setActive('tree');
      return makeNotice('审核已通过，已进入世系查看');
    });
  }

  async function queryTree() {
    await run(async () => {
      if (!workspace.personId) throw new Error('请先选择人物');
      const path = treeMode === 'descendants'
        ? `/tree/descendants?rootPersonId=${workspace.personId}&maxDepth=${depth || 5}`
        : treeMode === 'ancestors'
          ? `/tree/ancestors?personId=${workspace.personId}&maxDepth=${depth || 5}`
          : `/tree/person/${workspace.personId}/family`;
      const data = await apiClient.get(path);
      setSnapshot(prev => ({ ...prev, tree: data }));
      return makeNotice('世系图查询完成');
    });
  }

  function downloadExport(path: string, name: string) {
    void run(async () => {
      const blob = await apiClient.download(path);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
      return makeNotice(`${name} 下载完成`);
    });
  }

  function renderCurrentStep() {
    switch (active) {
      case 'clan': return <Panel title="创建/选择宗族" description="先建立宗族空间；点击列表行可选择已有宗族继续建谱。"><Actions><button onClick={() => void run(async () => { await refresh(); return makeNotice('数据已刷新'); })}>刷新</button></Actions><div className="wizard-form-grid"><Field label="宗族名称"><input value={clanForm.clanName} onChange={e => patchClan('clanName', e.target.value)} placeholder="例如：江夏堂黄氏宗族" /></Field><Field label="姓氏"><input value={clanForm.surname} onChange={e => patchClan('surname', e.target.value)} /></Field><Field label="编码"><input value={clanForm.clanCode} onChange={e => patchClan('clanCode', e.target.value)} /></Field><Field label="堂号"><input value={clanForm.hallName} onChange={e => patchClan('hallName', e.target.value)} /></Field><Field label="祖籍/发源地"><input value={clanForm.originPlace} onChange={e => patchClan('originPlace', e.target.value)} /></Field></div><Actions><button disabled={loading} onClick={createClan}>创建宗族并进入下一步</button><button className="secondary" onClick={() => setActive('branch')}>已有宗族，进入支派</button></Actions><DataTable data={snapshot.clans} columns={[{ key: 'id', title: 'ID' }, { key: 'clanName', title: '宗族名称' }, { key: 'surname', title: '姓氏' }, { key: 'hallName', title: '堂号' }]} onSelect={row => workspace.setClanId(String(row.id))} /></Panel>;
      case 'branch': return <Panel title="建立支派" description="创建支派，建议优先创建主支派或当前负责维护的房支。"><div className="wizard-form-grid"><Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field><Field label="支派名称"><input value={branchForm.branchName} onChange={e => setBranchForm(prev => ({ ...prev, branchName: e.target.value }))} placeholder="例如：长沙支" /></Field><Field label="父支派ID"><input value={branchForm.parentId} onChange={e => setBranchForm(prev => ({ ...prev, parentId: e.target.value }))} placeholder="可空" /></Field></div><Actions><button disabled={loading} onClick={createBranch}>创建支派并进入下一步</button><button className="secondary" onClick={() => void run(async () => { await refresh(); return makeNotice('支派已刷新'); })}>刷新支派</button></Actions><DataTable data={snapshot.branches} columns={[{ key: 'id', title: 'ID' }, { key: 'branchName', title: '支派名称' }, { key: 'parentId', title: '父支派ID' }, { key: 'status', title: '状态' }]} onSelect={row => workspace.setBranchId(String(row.id))} /></Panel>;
      case 'generation': return <Panel title="维护字辈" description="先创建字辈方案，再追加世次与字辈。"><div className="wizard-form-grid"><Field label="方案名称"><input value={schemeForm.schemeName} onChange={e => setSchemeForm(prev => ({ ...prev, schemeName: e.target.value }))} /></Field><Field label="方案ID"><input value={schemeForm.schemeId} onChange={e => setSchemeForm(prev => ({ ...prev, schemeId: e.target.value }))} /></Field><Field label="代次"><input value={schemeForm.generationNo} onChange={e => setSchemeForm(prev => ({ ...prev, generationNo: e.target.value }))} /></Field><Field label="字辈"><input value={schemeForm.word} onChange={e => setSchemeForm(prev => ({ ...prev, word: e.target.value }))} placeholder="例如：德" /></Field></div><Actions><button disabled={loading} onClick={createScheme}>创建字辈方案</button><button disabled={loading} onClick={addGenerationWord}>追加字辈并进入人物</button></Actions><DataTable data={snapshot.schemes} columns={[{ key: 'id', title: '方案ID' }, { key: 'schemeName', title: '方案名称' }, { key: 'branchId', title: '支派ID' }, { key: 'status', title: '状态' }]} onSelect={row => setSchemeForm(prev => ({ ...prev, schemeId: String(row.id) }))} /></Panel>;
      case 'person': return <Panel title="录入中心人物" description="先录入一个中心人物，后续关系、来源、审核、世系都围绕该人物展开。"><div className="wizard-form-grid"><Field label="姓名"><input value={personForm.name} onChange={e => patchPerson('name', e.target.value)} /></Field><Field label="性别"><select value={personForm.gender} onChange={e => patchPerson('gender', e.target.value)}><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field><Field label="支派ID"><input value={personForm.branchId || workspace.branchId} onChange={e => patchPerson('branchId', e.target.value)} /></Field><Field label="代次"><input value={personForm.generationNo} onChange={e => patchPerson('generationNo', e.target.value)} /></Field><Field label="字辈"><input value={personForm.generationWord} onChange={e => patchPerson('generationWord', e.target.value)} /></Field><Field label="是否在世"><select value={personForm.isLiving} onChange={e => patchPerson('isLiving', e.target.value)}><option value="true">在世</option><option value="false">已故</option></select></Field></div><Actions><button disabled={loading} onClick={createPerson}>创建人物并进入关系</button><button className="secondary" onClick={() => void run(async () => { await refresh(); return makeNotice('人物已刷新'); })}>刷新人物</button></Actions><DataTable data={snapshot.persons} columns={[{ key: 'id', title: 'ID' }, { key: 'name', title: '姓名' }, { key: 'gender', title: '性别' }, { key: 'generationNo', title: '代次' }, { key: 'generationWord', title: '字辈' }]} onSelect={row => workspace.setPersonId(String(row.id))} /></Panel>;
      case 'relationship': return <Panel title="建立亲属关系" description="围绕当前中心人物添加父母、配偶或子女，不再要求用户手工组织关系方向。"><div className="wizard-current">中心人物：<strong>{selectedPerson?.name || workspace.personId || '未选择'}</strong></div><div className="wizard-form-grid"><Field label="关系类型"><select value={relativeForm.mode} onChange={e => patchRelative('mode', e.target.value)}><option value="father">添加父亲</option><option value="mother">添加母亲</option><option value="spouse">添加配偶</option><option value="child">添加子女</option></select></Field><Field label="亲属姓名"><input value={relativeForm.name} onChange={e => patchRelative('name', e.target.value)} /></Field><Field label="亲属性别"><select value={relativeForm.gender} onChange={e => patchRelative('gender', e.target.value)}><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field><Field label="亲属代次"><input value={relativeForm.generationNo} onChange={e => patchRelative('generationNo', e.target.value)} /></Field><Field label="亲属字辈"><input value={relativeForm.generationWord} onChange={e => patchRelative('generationWord', e.target.value)} /></Field></div><Actions><button disabled={loading} onClick={createRelative}>创建亲属关系并进入来源</button></Actions><DataTable data={snapshot.relationships} columns={[{ key: 'id', title: 'ID' }, { key: 'fromPersonId', title: '起点' }, { key: 'toPersonId', title: '终点' }, { key: 'relationType', title: '类型' }, { key: 'relationLabel', title: '标签' }]} onSelect={row => workspace.setRelationshipId(String(row.id))} /></Panel>;
      case 'source': return <Panel title="绑定来源证据" description="创建来源资料，并将其绑定到人物或关系，保证入谱数据可追溯。"><div className="wizard-form-grid"><Field label="来源名称"><input value={sourceForm.sourceName} onChange={e => patchSource('sourceName', e.target.value)} placeholder="例如：老谱第3卷第28页" /></Field><Field label="来源类型"><select value={sourceForm.sourceType} onChange={e => patchSource('sourceType', e.target.value)}><option value="genealogy_book">族谱原文</option><option value="oral_record">口述记录</option><option value="tombstone">墓碑/墓志</option><option value="photo">照片</option><option value="local_chronicle">地方志</option><option value="other">其他</option></select></Field><Field label="绑定对象"><select value={sourceForm.targetType} onChange={e => patchSource('targetType', e.target.value)}><option value="person">人物</option><option value="relationship">关系</option><option value="branch">支派</option><option value="clan">宗族</option></select></Field><Field label="对象ID"><input value={sourceForm.targetId || (sourceForm.targetType === 'relationship' ? workspace.relationshipId : workspace.personId)} onChange={e => patchSource('targetId', e.target.value)} /></Field></div><Actions><button disabled={loading} onClick={createSource}>创建来源</button><button disabled={loading} onClick={bindSource}>绑定来源并进入审核</button></Actions><DataTable data={snapshot.sources} columns={[{ key: 'id', title: 'ID' }, { key: 'sourceName', title: '来源名称' }, { key: 'sourceType', title: '类型' }, { key: 'verificationStatus', title: '状态' }]} onSelect={row => workspace.setSourceId(String(row.id))} /></Panel>;
      case 'review': return <Panel title="提交与处理审核" description="将人物、关系、来源、支派或字辈方案提交审核，并可直接处理待审核任务。"><div className="wizard-form-grid"><Field label="对象类型"><select value={reviewForm.targetType} onChange={e => setReviewForm(prev => ({ ...prev, targetType: e.target.value }))}><option value="persons">人物</option><option value="relationships">关系</option><option value="sources">来源</option><option value="branches">支派</option><option value="generation-schemes">字辈方案</option></select></Field><Field label="对象ID"><input value={reviewForm.targetId || workspace.personId} onChange={e => setReviewForm(prev => ({ ...prev, targetId: e.target.value }))} /></Field><Field label="审核任务ID"><input value={workspace.reviewTaskId} onChange={e => workspace.setReviewTaskId(e.target.value)} /></Field><Field label="审核意见"><input value={reviewForm.comment} onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))} /></Field></div><Actions><button disabled={loading} onClick={submitReview}>提交审核</button><button className="secondary" disabled={loading} onClick={approveReview}>通过当前任务并进入世系</button></Actions><DataTable data={snapshot.tasks} columns={[{ key: 'id', title: '任务ID' }, { key: 'targetType', title: '对象类型' }, { key: 'targetId', title: '对象ID' }, { key: 'status', title: '状态' }, { key: 'createdAt', title: '创建时间' }]} onSelect={row => workspace.setReviewTaskId(String(row.id))} /></Panel>;
      case 'tree': return <Panel title="查看世系与导出" description="查看家庭图、上溯、下延结果，并导出人物或关系数据。"><div className="wizard-form-grid"><Field label="人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} /></Field><Field label="查询模式"><select value={treeMode} onChange={e => setTreeMode(e.target.value)}><option value="family">家庭图</option><option value="descendants">下延世系</option><option value="ancestors">上溯世系</option></select></Field><Field label="深度"><input value={depth} onChange={e => setDepth(e.target.value)} /></Field></div><Actions><button disabled={loading} onClick={queryTree}>查询世系图</button><button className="secondary" onClick={() => downloadExport(`/clans/${workspace.clanId}/exports/persons.csv`, 'persons.csv')}>导出人物CSV</button><button className="secondary" onClick={() => downloadExport(`/clans/${workspace.clanId}/exports/relations.csv`, 'relations.csv')}>导出关系CSV</button></Actions><div className="summary-card"><div><span>节点数</span><strong>{treeNodes.length || '-'}</strong></div><div><span>关系边</span><strong>{treeEdges.length || '-'}</strong></div><div><span>中心人物</span><strong>{workspace.personId || '-'}</strong></div></div><div className="tree-preview">{treeNodes.slice(0, 12).map((node: any, index: number) => <span key={node.personId || node.id || index}>{node.name || node.personName || node.personId || node.id}</span>)}</div><DataTable data={treeEdges} columns={[{ key: 'fromPersonId', title: 'From' }, { key: 'toPersonId', title: 'To' }, { key: 'relationType', title: '关系类型' }, { key: 'relationLabel', title: '标签' }]} /></Panel>;
      default: return null;
    }
  }

  return (
    <div className="mvp1-wizard">
      <section className="wizard-hero">
        <div>
          <span>MVP1 Workflow</span>
          <h2>建谱闭环向导</h2>
          <p>把分散的基础数据页面串成一条可复测的业务流：建宗族、建支派、维护字辈、录人物、建关系、绑来源、提审核、看世系。</p>
        </div>
        <Actions><button onClick={() => void run(async () => { await refresh(); return makeNotice('向导数据已刷新'); })}>刷新上下文</button></Actions>
      </section>
      <div className="wizard-layout">
        <aside className="wizard-steps">
          {steps.map(step => <button key={step.key} className={active === step.key ? 'active' : ''} onClick={() => setActive(step.key)}><strong>{step.title}</strong><span>{step.desc}</span><em>{step.ready ? '已具备' : '待完成'}</em></button>)}
        </aside>
        <main className="wizard-main">
          {renderCurrentStep()}
          <ResultNotice result={result} />
        </main>
        <aside className="wizard-context">
          <Panel title="当前上下文" description="向导会自动记录最近创建或选择的关键对象。">
            <div className="wizard-id-list">
              <div><span>宗族ID</span><strong>{workspace.clanId || '-'}</strong></div>
              <div><span>支派ID</span><strong>{workspace.branchId || '-'}</strong></div>
              <div><span>人物ID</span><strong>{workspace.personId || '-'}</strong></div>
              <div><span>关系ID</span><strong>{workspace.relationshipId || '-'}</strong></div>
              <div><span>来源ID</span><strong>{workspace.sourceId || '-'}</strong></div>
              <div><span>审核任务</span><strong>{workspace.reviewTaskId || '-'}</strong></div>
            </div>
          </Panel>
          <Panel title="数据概览">
            <div className="wizard-mini-metrics">
              <div><span>宗族</span><strong>{clans.length}</strong></div>
              <div><span>支派</span><strong>{branches.length}</strong></div>
              <div><span>字辈方案</span><strong>{schemes.length}</strong></div>
              <div><span>人物</span><strong>{persons.length}</strong></div>
              <div><span>关系</span><strong>{relationships.length}</strong></div>
              <div><span>来源</span><strong>{sources.length}</strong></div>
              <div><span>待审核</span><strong>{tasks.length}</strong></div>
              <div><span>世系节点</span><strong>{treeNodes.length}</strong></div>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
