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
type Option = { value: string; label: string };

type Snapshot = {
  clans?: unknown;
  branches?: unknown;
  schemes?: unknown;
  generationItems?: unknown;
  persons?: unknown;
  relationships?: unknown;
  sources?: unknown;
  tasks?: unknown;
  tree?: any;
};

type RefreshOptions = {
  clanId?: string;
  branchId?: string;
  personId?: string;
  sourceId?: string;
  reviewTaskId?: string;
  schemeId?: string;
};

const stepOrder: { key: StepKey; title: string; desc: string }[] = [
  { key: 'clan', title: '1. 创建宗族', desc: '独立维护宗族主数据；其他步骤可直接选择宗族。' },
  { key: 'branch', title: '2. 建立支派', desc: '选择宗族后建立支派；只有一个宗族时自动带入。' },
  { key: 'generation', title: '3. 维护字辈', desc: '选择宗族、支派和字辈方案后维护字辈明细。' },
  { key: 'person', title: '4. 录入人物', desc: '选择宗族、支派、字辈方案后录入人物。' },
  { key: 'relationship', title: '5. 建立关系', desc: '选择中心人物后直接维护亲属关系。' },
  { key: 'source', title: '6. 绑定来源', desc: '选择来源和绑定对象，完成证据关联。' },
  { key: 'review', title: '7. 提交审核', desc: '选择审核对象或待审任务，提交或处理审核。' },
  { key: 'tree', title: '8. 查看世系', desc: '选择中心人物，查询世系图并导出数据。' }
];

const defaultPersonForm = {
  branchId: '',
  personCode: '',
  name: '',
  genealogyName: '',
  courtesyName: '',
  aliasName: '',
  gender: 'male',
  generationNo: '',
  generationWord: '',
  rankInFamily: '',
  birthDate: '',
  birthDatePrecision: 'day',
  deathDate: '',
  deathDatePrecision: 'day',
  isLiving: 'true',
  birthPlace: '',
  residencePlace: '',
  occupation: '',
  education: '',
  titleOrHonor: '',
  biography: '',
  tombPlace: '',
  epitaph: '',
  hasDescendant: '',
  lineageStatus: 'normal',
  privacyLevel: 'clan_only',
  dataStatus: 'draft'
};

function firstId(data: unknown) {
  const first = toRecordList(data)[0];
  return first?.id ? String(first.id) : '';
}

function hasId(data: unknown, id?: string) {
  return Boolean(id) && toRecordList(data).some(item => String(item.id) === String(id));
}

function pickId(data: unknown, preferred?: string) {
  if (hasId(data, preferred)) return String(preferred);
  const list = toRecordList(data);
  return list.length === 1 && list[0]?.id ? String(list[0].id) : '';
}

function makeNotice(message: string, id?: string | number): Notice {
  return id ? { message, id } : { message };
}

function nullableString(value: string) {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

function nullableNumber(value: string) {
  const text = String(value ?? '').trim();
  return text ? Number(text) : null;
}

function nullableBoolean(value: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function generationLabel(item: any) {
  const no = item?.generationNo ? `第${item.generationNo}世` : '世次未维护';
  return `${no} · ${item?.word || '-'}字辈`;
}

function generationOptionValue(item: any) {
  return String(item?.id || `${item?.generationNo || ''}-${item?.word || ''}`);
}

export function Mvp1WizardPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [active, setActive] = useState<StepKey>('clan');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Notice | unknown>();
  const [snapshot, setSnapshot] = useState<Snapshot>({});

  const [clanForm, setClanForm] = useState({ clanName: '', surname: '', hallName: '', originPlace: '' });
  const [branchForm, setBranchForm] = useState({ branchName: '', parentId: '' });
  const [schemeForm, setSchemeForm] = useState({ schemeId: '', schemeName: '主派语', generationNo: '1', word: '' });
  const [personForm, setPersonForm] = useState(defaultPersonForm);
  const [relativeForm, setRelativeForm] = useState({ mode: 'father', name: '', gender: 'male', generationNo: '', generationWord: '' });
  const [sourceForm, setSourceForm] = useState({ sourceName: '', sourceType: 'genealogy_book', targetType: 'person', targetId: '' });
  const [reviewForm, setReviewForm] = useState({ targetType: 'persons', targetId: '', comment: '同意入谱' });
  const [treeMode, setTreeMode] = useState('family');
  const [depth, setDepth] = useState('5');

  const clans = toRecordList<any>(snapshot.clans);
  const branches = toRecordList<any>(snapshot.branches);
  const schemes = toRecordList<any>(snapshot.schemes);
  const generationItems = toRecordList<any>(snapshot.generationItems);
  const persons = toRecordList<any>(snapshot.persons);
  const sources = toRecordList<any>(snapshot.sources);
  const relationships = toRecordList<any>(snapshot.relationships);
  const tasks = toRecordList<any>(snapshot.tasks);
  const treeNodes = toRecordList<any>(snapshot.tree?.nodes || []);
  const treeEdges = toRecordList<any>(snapshot.tree?.edges || []);

  const selectedClan = useMemo(() => clans.find(item => String(item.id) === workspace.clanId), [clans, workspace.clanId]);
  const selectedBranch = useMemo(() => branches.find(item => String(item.id) === String(personForm.branchId || workspace.branchId)), [branches, personForm.branchId, workspace.branchId]);
  const selectedPerson = useMemo(() => persons.find(item => String(item.id) === workspace.personId), [persons, workspace.personId]);
  const selectedSource = useMemo(() => sources.find(item => String(item.id) === workspace.sourceId), [sources, workspace.sourceId]);
  const selectedRelationship = useMemo(() => relationships.find(item => String(item.id) === workspace.relationshipId), [relationships, workspace.relationshipId]);
  const selectedReviewTask = useMemo(() => tasks.find(item => String(item.id) === workspace.reviewTaskId), [tasks, workspace.reviewTaskId]);

  const steps = useMemo(() => [
    { ...stepOrder[0], ready: Boolean(workspace.clanId) },
    { ...stepOrder[1], ready: Boolean(workspace.branchId) },
    { ...stepOrder[2], ready: Boolean(schemeForm.schemeId && generationItems.length) },
    { ...stepOrder[3], ready: Boolean(workspace.personId) },
    { ...stepOrder[4], ready: Boolean(workspace.relationshipId || relationships.length) },
    { ...stepOrder[5], ready: Boolean(workspace.sourceId) },
    { ...stepOrder[6], ready: Boolean(workspace.reviewTaskId || tasks.length) },
    { ...stepOrder[7], ready: Boolean(treeNodes.length) }
  ], [workspace.clanId, workspace.branchId, workspace.personId, workspace.relationshipId, workspace.sourceId, workspace.reviewTaskId, schemeForm.schemeId, generationItems.length, relationships.length, tasks.length, treeNodes.length]);

  async function safe<T>(label: string, fn: () => Promise<T>, fallback: T) {
    try {
      return await fn();
    } catch (error) {
      notify({ message: `${label}失败：${(error as Error).message}` }, true);
      return fallback;
    }
  }

  async function run(action: () => Promise<Notice | void>) {
    if (loading) return;
    setLoading(true);
    try {
      const next = await action();
      if (next) {
        setResult(next);
        notify(next);
      }
    } catch (error) {
      const notice = makeNotice((error as Error).message || '操作失败');
      setResult(notice);
      notify(notice, true);
    } finally {
      setLoading(false);
    }
  }

  async function loadGenerationItems(schemeId?: string) {
    if (!schemeId) return [];
    return safe('查询字辈明细', () => apiClient.get(`/generation-schemes/${schemeId}/items`), []);
  }

  async function refresh(options: RefreshOptions = {}) {
    const clanRes = await safe('查询宗族', () => apiClient.get('/clans'), []);
    const requestedClanId = options.clanId !== undefined ? options.clanId : workspace.clanId;
    const nextClanId = pickId(clanRes, requestedClanId);

    const branchRes = nextClanId ? await safe('查询支派', () => apiClient.get(`/clans/${nextClanId}/branches`), []) : [];
    const personRes = nextClanId ? await safe('查询人物', () => apiClient.get(`/clans/${nextClanId}/persons`), []) : [];
    const sourceRes = nextClanId ? await safe('查询来源', () => apiClient.get(`/clans/${nextClanId}/sources`), []) : [];
    const schemeRes = nextClanId ? await safe('查询字辈方案', () => apiClient.get(`/clans/${nextClanId}/generation-schemes`), []) : [];
    const taskRes = nextClanId ? await safe('查询审核任务', () => apiClient.get(`/clans/${nextClanId}/review-tasks/pending`), []) : [];

    const nextBranchId = pickId(branchRes, options.branchId !== undefined ? options.branchId : workspace.branchId);
    const nextPersonId = pickId(personRes, options.personId !== undefined ? options.personId : workspace.personId);
    const nextSourceId = pickId(sourceRes, options.sourceId !== undefined ? options.sourceId : workspace.sourceId);
    const nextReviewTaskId = pickId(taskRes, options.reviewTaskId !== undefined ? options.reviewTaskId : workspace.reviewTaskId);
    const nextSchemeId = pickId(schemeRes, options.schemeId !== undefined ? options.schemeId : schemeForm.schemeId);

    const generationItemRes = nextSchemeId ? await loadGenerationItems(nextSchemeId) : [];
    const relationRes = nextPersonId ? await safe('查询关系', () => apiClient.get(`/persons/${nextPersonId}/relationships`), []) : [];
    const treeRes = nextPersonId ? await safe('查询世系', () => apiClient.get(`/tree/person/${nextPersonId}/family`), null) : null;

    workspace.patch({
      clanId: nextClanId || '',
      branchId: nextBranchId || '',
      personId: nextPersonId || '',
      sourceId: nextSourceId || '',
      reviewTaskId: nextReviewTaskId || '',
      relationshipId: hasId(relationRes, workspace.relationshipId) ? workspace.relationshipId : ''
    });

    setSchemeForm(prev => ({ ...prev, schemeId: nextSchemeId || '' }));
    setPersonForm(prev => ({ ...prev, branchId: prev.branchId || nextBranchId || '' }));
    setSnapshot({ clans: clanRes, branches: branchRes, persons: personRes, sources: sourceRes, schemes: schemeRes, generationItems: generationItemRes, tasks: taskRes, relationships: relationRes, tree: treeRes });
  }

  useEffect(() => { void refresh(); }, []);

  function patchClan(key: keyof typeof clanForm, value: string) { setClanForm(prev => ({ ...prev, [key]: value })); }
  function patchPerson(key: keyof typeof personForm, value: string) { setPersonForm(prev => ({ ...prev, [key]: value })); }
  function patchRelative(key: keyof typeof relativeForm, value: string) { setRelativeForm(prev => ({ ...prev, [key]: value })); }
  function patchSource(key: keyof typeof sourceForm, value: string) { setSourceForm(prev => ({ ...prev, [key]: value })); }

  function personName(id?: string) {
    const person = persons.find(item => String(item.id) === String(id));
    return person?.name || (id ? `人物#${id}` : '-');
  }

  function relationshipLabel(row: any) {
    return `${personName(String(row.fromPersonId))} → ${personName(String(row.toPersonId))}`;
  }

  function sourceTargetOptions(type = sourceForm.targetType): Option[] {
    if (type === 'person') return persons.map(item => ({ value: String(item.id), label: `${item.name || '人物'}（${item.generationWord || '无字辈'}）` }));
    if (type === 'relationship') return relationships.map(item => ({ value: String(item.id), label: `${relationshipLabel(item)} · ${item.relationLabel || item.relationType || '关系'}` }));
    if (type === 'branch') return branches.map(item => ({ value: String(item.id), label: item.branchName || `支派#${item.id}` }));
    if (type === 'clan') return workspace.clanId ? [{ value: workspace.clanId, label: selectedClan?.clanName || `宗族#${workspace.clanId}` }] : [];
    return [];
  }

  function reviewTargetOptions(type = reviewForm.targetType): Option[] {
    if (type === 'persons') return persons.map(item => ({ value: String(item.id), label: item.name || `人物#${item.id}` }));
    if (type === 'relationships') return relationships.map(item => ({ value: String(item.id), label: relationshipLabel(item) }));
    if (type === 'sources') return sources.map(item => ({ value: String(item.id), label: item.sourceName || `来源#${item.id}` }));
    if (type === 'branches') return branches.map(item => ({ value: String(item.id), label: item.branchName || `支派#${item.id}` }));
    if (type === 'generation-schemes') return schemes.map(item => ({ value: String(item.id), label: item.schemeName || `字辈方案#${item.id}` }));
    return [];
  }

  function effectiveSourceTargetId() {
    return sourceForm.targetId || sourceTargetOptions()[0]?.value || '';
  }

  function effectiveReviewTargetId() {
    return reviewForm.targetId || reviewTargetOptions()[0]?.value || '';
  }

  function generationSelectedValue(word: string, generationNo: string) {
    if (!word && !generationNo) return '';
    const selected = generationItems.find(item => String(item.word || '') === String(word || '') && String(item.generationNo || '') === String(generationNo || ''));
    return selected ? generationOptionValue(selected) : '';
  }

  function selectGenerationItem(value: string, target: 'person' | 'relative') {
    const selected = generationItems.find(item => generationOptionValue(item) === value);
    const next = {
      generationWord: selected?.word ? String(selected.word) : '',
      generationNo: selected?.generationNo ? String(selected.generationNo) : ''
    };
    if (target === 'person') setPersonForm(prev => ({ ...prev, ...next }));
    else setRelativeForm(prev => ({ ...prev, ...next }));
  }

  function resetPersonFormForNext() {
    setPersonForm(prev => ({
      ...defaultPersonForm,
      branchId: prev.branchId || workspace.branchId,
      generationNo: prev.generationNo,
      generationWord: prev.generationWord,
      privacyLevel: prev.privacyLevel,
      dataStatus: prev.dataStatus
    }));
  }

  function buildPersonPayload(form = personForm) {
    return {
      branchId: nullableNumber(form.branchId || workspace.branchId),
      personCode: null,
      name: form.name.trim(),
      genealogyName: nullableString(form.genealogyName),
      courtesyName: nullableString(form.courtesyName),
      aliasName: nullableString(form.aliasName),
      gender: nullableString(form.gender) || 'unknown',
      generationNo: nullableNumber(form.generationNo),
      generationWord: nullableString(form.generationWord),
      rankInFamily: nullableString(form.rankInFamily),
      birthDate: nullableString(form.birthDate),
      birthDatePrecision: nullableString(form.birthDatePrecision),
      deathDate: nullableString(form.deathDate),
      deathDatePrecision: nullableString(form.deathDatePrecision),
      isLiving: nullableBoolean(form.isLiving),
      birthPlace: nullableString(form.birthPlace),
      residencePlace: nullableString(form.residencePlace),
      occupation: nullableString(form.occupation),
      education: nullableString(form.education),
      titleOrHonor: nullableString(form.titleOrHonor),
      biography: nullableString(form.biography),
      tombPlace: nullableString(form.tombPlace),
      epitaph: nullableString(form.epitaph),
      hasDescendant: nullableBoolean(form.hasDescendant),
      lineageStatus: nullableString(form.lineageStatus),
      privacyLevel: nullableString(form.privacyLevel),
      dataStatus: nullableString(form.dataStatus)
    };
  }

  async function createClan() {
    await run(async () => {
      if (!clanForm.clanName.trim()) throw new Error('请填写宗族名称');
      if (!clanForm.surname.trim()) throw new Error('请填写姓氏');
      const data: any = await apiClient.post('/clans', clanForm);
      const nextClanId = String(data?.id || '');
      await refresh({ clanId: nextClanId });
      return makeNotice('宗族创建成功，可在任意步骤中选择使用', data?.id);
    });
  }

  async function selectClan(row: any) {
    await refresh({ clanId: String(row.id || '') });
    notify({ message: '宗族已选中，其他步骤会按该宗族加载可选数据', id: row.id });
  }

  async function changeClan(nextClanId: string) {
    await run(async () => {
      await refresh({ clanId: nextClanId });
      return makeNotice(nextClanId ? '宗族已切换，已刷新该宗族下的支派、人物、来源和审核数据' : '已清空宗族选择');
    });
  }

  async function selectBranch(row: any) {
    const nextBranchId = String(row.id || '');
    if (!nextBranchId) return;
    workspace.setBranchId(nextBranchId);
    setBranchForm(prev => ({ ...prev, parentId: '' }));
    setPersonForm(prev => ({ ...prev, branchId: nextBranchId }));
    const branchScheme = schemes.find(item => String(item.branchId) === nextBranchId) || (schemes.length === 1 ? schemes[0] : null);
    if (branchScheme?.id) {
      await selectScheme(branchScheme);
    }
    notify({ message: '支派已选中，可在字辈、人物等步骤直接使用', id: nextBranchId });
  }

  async function createBranch() {
    await run(async () => {
      if (!workspace.clanId) throw new Error(clans.length > 1 ? '请选择宗族' : '请先创建或选择宗族');
      if (!branchForm.branchName.trim()) throw new Error('请填写支派名称');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/branches`, {
        branchName: branchForm.branchName.trim(),
        parentId: branchForm.parentId ? Number(branchForm.parentId) : null
      });
      const nextBranchId = String(data?.id || '');
      await refresh({ clanId: workspace.clanId, branchId: nextBranchId });
      setBranchForm({ branchName: '', parentId: '' });
      setPersonForm(prev => ({ ...prev, branchId: nextBranchId }));
      return makeNotice('支派创建成功，可在后续步骤中直接选择使用', data?.id);
    });
  }

  async function createScheme() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请选择宗族');
      if (!workspace.branchId) throw new Error('请选择适用支派');
      if (!schemeForm.schemeName.trim()) throw new Error('请填写字辈方案名称');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/generation-schemes`, {
        branchId: Number(workspace.branchId),
        schemeName: schemeForm.schemeName.trim(),
        isDefault: true,
        validationEnabled: true,
        strictMode: false
      });
      const nextSchemeId = String(data?.id || '');
      setSchemeForm(prev => ({ ...prev, schemeId: nextSchemeId }));
      await refresh({ clanId: workspace.clanId, branchId: workspace.branchId, schemeId: nextSchemeId });
      return makeNotice('字辈方案创建成功，可继续追加字辈明细', data?.id);
    });
  }

  async function addGenerationWord() {
    await run(async () => {
      if (!schemeForm.schemeId) throw new Error('请先创建或选择字辈方案');
      if (!schemeForm.generationNo) throw new Error('请选择代次');
      if (!schemeForm.word.trim()) throw new Error('请填写字辈');
      const data: any = await apiClient.post(`/generation-schemes/${schemeForm.schemeId}/items`, {
        generationNo: Number(schemeForm.generationNo),
        word: schemeForm.word.trim()
      });
      setSchemeForm(prev => ({ ...prev, generationNo: String(Number(prev.generationNo || '0') + 1), word: '' }));
      await refresh({ clanId: workspace.clanId, branchId: workspace.branchId, schemeId: schemeForm.schemeId });
      return makeNotice('字辈明细已追加，可继续维护字辈', data?.id);
    });
  }

  async function selectScheme(row: any) {
    const nextSchemeId = String(row.id || '');
    setSchemeForm(prev => ({ ...prev, schemeId: nextSchemeId, schemeName: row.schemeName || prev.schemeName }));
    if (row.branchId) {
      workspace.setBranchId(String(row.branchId));
      setPersonForm(prev => ({ ...prev, branchId: String(row.branchId) }));
    }
    const items = await loadGenerationItems(nextSchemeId);
    setSnapshot(prev => ({ ...prev, generationItems: items }));
  }

  async function createPerson(continueAdding = false) {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请选择宗族');
      if (!(personForm.branchId || workspace.branchId)) throw new Error('请选择所属支派');
      if (!personForm.name.trim()) throw new Error('请填写人物姓名');
      if (!personForm.gender) throw new Error('请选择性别');
      if (generationItems.length && !personForm.generationWord) throw new Error('请选择字辈，代次会自动带出');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/persons`, buildPersonPayload());
      const nextPersonId = String(data?.id || '');
      await refresh({ clanId: workspace.clanId, branchId: personForm.branchId || workspace.branchId, personId: nextPersonId, schemeId: schemeForm.schemeId });
      if (continueAdding) {
        resetPersonFormForNext();
      }
      return makeNotice(continueAdding ? '人物档案创建成功，可继续录入下一个人物' : '人物档案创建成功，可在关系、来源、审核、世系步骤中选择使用', data?.personCode || data?.id);
    });
  }

  async function createRelative() {
    await run(async () => {
      const centerPerson = selectedPerson;
      const effectiveBranchId = String(centerPerson?.branchId || workspace.branchId || personForm.branchId || '');
      if (!workspace.clanId) throw new Error('请选择宗族');
      if (!workspace.personId) throw new Error('请选择中心人物');
      if (!effectiveBranchId) throw new Error('请选择支派');
      if (!relativeForm.name.trim()) throw new Error('请填写亲属姓名');
      if (!relativeForm.gender) throw new Error('请选择亲属性别');
      const created: any = await apiClient.post(`/clans/${workspace.clanId}/persons`, {
        branchId: Number(effectiveBranchId),
        personCode: null,
        name: relativeForm.name.trim(),
        gender: relativeForm.gender,
        generationNo: relativeForm.generationNo ? Number(relativeForm.generationNo) : null,
        generationWord: nullableString(relativeForm.generationWord),
        isLiving: true,
        privacyLevel: 'clan_only',
        dataStatus: 'draft'
      });
      if (!created?.id) throw new Error('亲属人物创建失败');
      const mode = relativeForm.mode;
      const relationBody = mode === 'spouse'
        ? { fromPersonId: Number(workspace.personId), toPersonId: Number(created.id), relationType: 'spouse', relationLabel: 'spouse', isLineageRelation: false, isBiological: false, isPrimary: true, confidenceLevel: 'high' }
        : mode === 'child'
          ? { fromPersonId: Number(workspace.personId), toPersonId: Number(created.id), relationType: 'parent_child', relationLabel: selectedPerson?.gender === 'female' ? 'mother' : 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' }
          : { fromPersonId: Number(created.id), toPersonId: Number(workspace.personId), relationType: 'parent_child', relationLabel: mode === 'mother' ? 'mother' : 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' };
      const relationship: any = await apiClient.post(`/clans/${workspace.clanId}/relationships`, relationBody);
      workspace.setRelationshipId(String(relationship?.id || ''));
      await refresh({ clanId: workspace.clanId, branchId: effectiveBranchId, personId: workspace.personId, schemeId: schemeForm.schemeId });
      return makeNotice('亲属关系创建成功，可在来源或审核步骤中选择使用', relationship?.id);
    });
  }

  async function createSource() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请选择宗族');
      if (!sourceForm.sourceName.trim()) throw new Error('请填写来源名称');
      if (!sourceForm.sourceType) throw new Error('请选择来源类型');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/sources`, {
        sourceName: sourceForm.sourceName.trim(),
        sourceType: sourceForm.sourceType
      });
      await refresh({ clanId: workspace.clanId, branchId: workspace.branchId, personId: workspace.personId, sourceId: String(data?.id || ''), schemeId: schemeForm.schemeId });
      return makeNotice('来源创建成功，可继续选择绑定对象', data?.id);
    });
  }

  async function bindSource() {
    await run(async () => {
      const sourceId = workspace.sourceId || firstId(snapshot.sources);
      const targetId = effectiveSourceTargetId();
      if (!sourceId) throw new Error('请先创建或选择来源');
      if (!targetId) throw new Error('请选择来源绑定对象');
      const data: any = await apiClient.post('/source-bindings', {
        sourceId: Number(sourceId),
        targetType: sourceForm.targetType,
        targetId: Number(targetId)
      });
      await refresh({ clanId: workspace.clanId, branchId: workspace.branchId, personId: workspace.personId, sourceId, schemeId: schemeForm.schemeId });
      return makeNotice('来源绑定成功，可在审核步骤中选择对象提交', data?.id);
    });
  }

  async function submitReview() {
    await run(async () => {
      const targetId = effectiveReviewTargetId();
      if (!targetId) throw new Error('请选择要提交审核的对象');
      const data: any = await apiClient.post(`/${reviewForm.targetType}/${targetId}/submit-review`, { diffSummary: 'MVP1 建谱向导提交审核' });
      await refresh({ clanId: workspace.clanId, branchId: workspace.branchId, personId: workspace.personId, reviewTaskId: String(data?.id || ''), schemeId: schemeForm.schemeId });
      return makeNotice('审核提交成功，可在审核任务中选择处理', data?.id);
    });
  }

  async function approveReview() {
    await run(async () => {
      if (!workspace.reviewTaskId) throw new Error('请选择审核任务');
      if (!reviewForm.comment.trim()) throw new Error('请填写审核意见');
      await apiClient.post(`/review-tasks/${workspace.reviewTaskId}/approve`, { comment: reviewForm.comment.trim() });
      await refresh({ clanId: workspace.clanId, branchId: workspace.branchId, personId: workspace.personId, schemeId: schemeForm.schemeId });
      return makeNotice('审核已通过，可在世系步骤选择人物查看');
    });
  }

  async function queryTree() {
    await run(async () => {
      if (!workspace.personId) throw new Error('请选择中心人物');
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
      if (!workspace.clanId) throw new Error('请选择宗族');
      const blob = await apiClient.download(path);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
      return makeNotice(`${name} 下载完成`);
    });
  }

  function renderClanSelector(label = '宗族名称') {
    return (
      <Field label={label}>
        <select value={workspace.clanId} disabled={loading || !clans.length} onChange={e => void changeClan(e.target.value)}>
          <option value="">{clans.length > 1 ? '请选择宗族' : '暂无宗族，请先创建'}</option>
          {clans.map(clan => <option key={clan.id} value={String(clan.id)}>{display(clan.clanName, `宗族#${clan.id}`)}</option>)}
        </select>
      </Field>
    );
  }

  function renderBranchSelector(label = '支派名称') {
    return (
      <Field label={label}>
        <select value={workspace.branchId} disabled={loading || !workspace.clanId || !branches.length} onChange={e => {
          const branch = branches.find(item => String(item.id) === e.target.value);
          if (branch) void selectBranch(branch);
          else workspace.setBranchId('');
        }}>
          <option value="">{!workspace.clanId ? '请先选择宗族' : branches.length > 1 ? '请选择支派' : '暂无支派，请先创建'}</option>
          {branches.map(branch => <option key={branch.id} value={String(branch.id)}>{branch.branchName || `支派#${branch.id}`}</option>)}
        </select>
      </Field>
    );
  }

  function renderSchemeSelector(label = '字辈方案') {
    return (
      <Field label={label}>
        <select value={schemeForm.schemeId} disabled={!schemes.length} onChange={e => {
          const scheme = schemes.find(item => String(item.id) === e.target.value);
          if (scheme) void selectScheme(scheme);
          else setSchemeForm(prev => ({ ...prev, schemeId: '' }));
        }}>
          <option value="">{schemes.length > 1 ? '请选择字辈方案' : '暂无方案，请先创建'}</option>
          {schemes.map(scheme => <option key={scheme.id} value={String(scheme.id)}>{scheme.schemeName || `方案#${scheme.id}`}</option>)}
        </select>
      </Field>
    );
  }

  function renderPersonSelector(label = '中心人物') {
    return (
      <Field label={label}>
        <select value={workspace.personId} disabled={!workspace.clanId || !persons.length} onChange={e => void refresh({ clanId: workspace.clanId, branchId: workspace.branchId, personId: e.target.value, schemeId: schemeForm.schemeId })}>
          <option value="">{!workspace.clanId ? '请先选择宗族' : persons.length > 1 ? '请选择人物' : '暂无人物，请先录入'}</option>
          {persons.map(person => <option key={person.id} value={String(person.id)}>{person.name || `人物#${person.id}`}</option>)}
        </select>
      </Field>
    );
  }

  function renderCurrentStep() {
    switch (active) {
      case 'clan':
        return (
          <Panel title="创建/选择宗族" description="本步骤独立维护宗族主数据。选择宗族只会刷新上下文，不会强制进入下一步。">
            <div className="wizard-form-grid">
              <Field label="宗族名称 *"><input value={clanForm.clanName} onChange={e => patchClan('clanName', e.target.value)} placeholder="例如：江夏堂黄氏宗族" required /></Field>
              <Field label="姓氏 *"><input value={clanForm.surname} onChange={e => patchClan('surname', e.target.value)} placeholder="例如：黄" required /></Field>
              <Field label="系统生成编码"><input value="保存后自动生成" disabled readOnly /></Field>
              <Field label="堂号"><input value={clanForm.hallName} onChange={e => patchClan('hallName', e.target.value)} /></Field>
              <Field label="祖籍/发源地"><input value={clanForm.originPlace} onChange={e => patchClan('originPlace', e.target.value)} /></Field>
            </div>
            <Actions>
              <button disabled={loading} onClick={createClan}>创建宗族</button>
              <button className="secondary" disabled={loading} onClick={() => void refresh()}>刷新宗族</button>
            </Actions>
            <DataTable data={snapshot.clans} columns={[{ key: 'clanName', title: '宗族名称' }, { key: 'surname', title: '姓氏' }, { key: 'clanCode', title: '系统编码' }, { key: 'hallName', title: '堂号' }]} onSelect={row => void selectClan(row)} />
          </Panel>
        );
      case 'branch':
        return (
          <Panel title="建立支派" description="本步骤只需要选择宗族即可建立支派。若只有一个宗族，系统会自动默认选中；若有多个宗族，请先选择。">
            <div className="wizard-current">当前宗族：<strong>{selectedClan?.clanName || (clans.length > 1 ? '请选择宗族' : '暂无宗族')}</strong></div>
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              <Field label="支派名称 *"><input value={branchForm.branchName} onChange={e => setBranchForm(prev => ({ ...prev, branchName: e.target.value }))} placeholder="例如：长沙支" required /></Field>
              <Field label="父支派"><select value={branchForm.parentId} disabled={!workspace.clanId} onChange={e => setBranchForm(prev => ({ ...prev, parentId: e.target.value }))}><option value="">无父支派/作为一级支派</option>{branches.map(branch => <option key={branch.id} value={String(branch.id)}>{branch.branchName || `支派#${branch.id}`}</option>)}</select></Field>
              <Field label="系统生成编号"><input value="保存后自动生成" disabled readOnly /></Field>
            </div>
            <Actions>
              <button disabled={loading || !workspace.clanId} onClick={() => void createBranch()}>创建支派</button>
              <button className="secondary" disabled={loading || !workspace.clanId} onClick={() => void refresh({ clanId: workspace.clanId })}>刷新当前宗族支派</button>
            </Actions>
            <section className="wizard-current">当前选中支派：<strong>{selectedBranch?.branchName || '未选择'}</strong></section>
            <DataTable data={snapshot.branches} columns={[{ key: 'branchName', title: '支派名称' }, { key: 'parentName', title: '父支派', render: row => branches.find(item => String(item.id) === String(row.parentId))?.branchName || '无' }, { key: 'status', title: '状态' }]} onSelect={row => void selectBranch(row)} />
          </Panel>
        );
      case 'generation':
        return (
          <Panel title="维护字辈" description="本步骤独立选择宗族、支派和字辈方案。只有一个可选项时系统自动选中，多个可选项时由用户选择。">
            <div className="wizard-current">当前支派：<strong>{selectedBranch?.branchName || '未选择支派'}</strong>；当前方案：<strong>{schemeForm.schemeId ? schemeForm.schemeName : '未选择方案'}</strong></div>
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              {renderBranchSelector('适用支派')}
              {renderSchemeSelector('已有方案')}
              <Field label="字辈方案名称 *"><input value={schemeForm.schemeName} onChange={e => setSchemeForm(prev => ({ ...prev, schemeName: e.target.value }))} required /></Field>
              <Field label="系统生成编号"><input value={schemeForm.schemeId ? `已生成：${schemeForm.schemeId}` : '创建方案后自动生成'} disabled readOnly /></Field>
              <Field label="代次 *"><select value={schemeForm.generationNo} onChange={e => setSchemeForm(prev => ({ ...prev, generationNo: e.target.value }))}>{Array.from({ length: 60 }, (_, index) => String(index + 1)).map(no => <option key={no} value={no}>第{no}世</option>)}</select></Field>
              <Field label="字辈 *"><input value={schemeForm.word} onChange={e => setSchemeForm(prev => ({ ...prev, word: e.target.value }))} placeholder="例如：德" required /></Field>
            </div>
            <Actions>
              <button disabled={loading || !workspace.clanId || !workspace.branchId} onClick={createScheme}>创建字辈方案</button>
              <button disabled={loading || !schemeForm.schemeId} onClick={addGenerationWord}>追加字辈</button>
              <button className="secondary" disabled={!schemeForm.schemeId} onClick={() => void run(async () => { const items = await loadGenerationItems(schemeForm.schemeId); setSnapshot(prev => ({ ...prev, generationItems: items })); return makeNotice('字辈明细已刷新'); })}>刷新字辈</button>
            </Actions>
            <h4>字辈方案</h4>
            <DataTable data={snapshot.schemes} columns={[{ key: 'schemeName', title: '方案名称' }, { key: 'branchName', title: '适用支派', render: row => branches.find(item => String(item.id) === String(row.branchId))?.branchName || '宗族通用' }, { key: 'status', title: '状态' }]} onSelect={row => void selectScheme(row)} />
            <h4>字辈明细</h4>
            <DataTable data={snapshot.generationItems} empty="暂无字辈明细，请先创建方案并追加字辈" columns={[{ key: 'generationNo', title: '代次' }, { key: 'word', title: '字辈' }, { key: 'description', title: '说明' }, { key: 'sortOrder', title: '排序' }]} />
          </Panel>
        );
      case 'person':
        return (
          <Panel title="录入人物" description="本步骤独立选择宗族、支派和字辈方案后录入人物，不再要求先完成前序步骤。">
            <div className="wizard-current">当前支派：<strong>{selectedBranch?.branchName || '未选择支派'}</strong>；当前字辈方案：<strong>{schemeForm.schemeId ? schemeForm.schemeName : '-'}</strong></div>
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              <Field label="所属支派 *"><select value={personForm.branchId || workspace.branchId} onChange={e => { workspace.setBranchId(e.target.value); patchPerson('branchId', e.target.value); }} required><option value="">请选择支派</option>{branches.map(branch => <option key={branch.id} value={String(branch.id)}>{branch.branchName || `支派#${branch.id}`}</option>)}</select></Field>
              {renderSchemeSelector('字辈方案')}
              <Field label="人物编码"><input value="保存后自动生成" disabled readOnly /></Field>
              <Field label="姓名 *"><input value={personForm.name} onChange={e => patchPerson('name', e.target.value)} required /></Field>
              <Field label="谱名"><input value={personForm.genealogyName} onChange={e => patchPerson('genealogyName', e.target.value)} /></Field>
              <Field label="字号"><input value={personForm.courtesyName} onChange={e => patchPerson('courtesyName', e.target.value)} /></Field>
              <Field label="别名"><input value={personForm.aliasName} onChange={e => patchPerson('aliasName', e.target.value)} /></Field>
              <Field label="性别 *"><select value={personForm.gender} onChange={e => patchPerson('gender', e.target.value)} required><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field>
              <Field label="字辈"><select value={generationSelectedValue(personForm.generationWord, personForm.generationNo)} onChange={e => selectGenerationItem(e.target.value, 'person')} disabled={!generationItems.length}><option value="">{generationItems.length ? '请选择字辈' : '无字辈明细，可先保存人物'}</option>{generationItems.map(item => <option key={generationOptionValue(item)} value={generationOptionValue(item)}>{generationLabel(item)}</option>)}</select></Field>
              <Field label="代次"><input value={personForm.generationNo ? `第${personForm.generationNo}世` : '选择字辈后自动带出'} disabled readOnly /></Field>
              <Field label="排行"><input value={personForm.rankInFamily} onChange={e => patchPerson('rankInFamily', e.target.value)} /></Field>
              <Field label="出生日期"><input type="date" value={personForm.birthDate} onChange={e => patchPerson('birthDate', e.target.value)} /></Field>
              <Field label="逝世日期"><input type="date" value={personForm.deathDate} onChange={e => patchPerson('deathDate', e.target.value)} /></Field>
              <Field label="是否在世"><select value={personForm.isLiving} onChange={e => patchPerson('isLiving', e.target.value)}><option value="true">在世</option><option value="false">已故</option><option value="">未知</option></select></Field>
              <Field label="出生地"><input value={personForm.birthPlace} onChange={e => patchPerson('birthPlace', e.target.value)} /></Field>
              <Field label="居住地"><input value={personForm.residencePlace} onChange={e => patchPerson('residencePlace', e.target.value)} /></Field>
              <Field label="职业"><input value={personForm.occupation} onChange={e => patchPerson('occupation', e.target.value)} /></Field>
              <Field label="教育程度"><input value={personForm.education} onChange={e => patchPerson('education', e.target.value)} /></Field>
              <Field label="世系状态"><select value={personForm.lineageStatus} onChange={e => patchPerson('lineageStatus', e.target.value)}><option value="normal">正常</option><option value="adopted_in">继入</option><option value="adopted_out">出嗣</option><option value="unknown">未知</option></select></Field>
              <Field label="隐私级别"><select value={personForm.privacyLevel} onChange={e => patchPerson('privacyLevel', e.target.value)}><option value="public">公开</option><option value="clan_only">宗族内可见</option><option value="branch_only">支派内可见</option><option value="private">私密</option></select></Field>
            </div>
            <Field label="人物传记"><textarea value={personForm.biography} onChange={e => patchPerson('biography', e.target.value)} rows={4} placeholder="记录生平、迁徙、功名、事迹等" /></Field>
            <Field label="墓志铭"><textarea value={personForm.epitaph} onChange={e => patchPerson('epitaph', e.target.value)} rows={3} placeholder="记录墓志、碑文或相关摘录" /></Field>
            <Actions>
              <button disabled={loading} onClick={() => void createPerson(true)}>创建人物，继续录入</button>
              <button className="secondary" disabled={loading} onClick={() => void createPerson(false)}>创建人物</button>
              <button className="secondary" onClick={() => setPersonForm({ ...defaultPersonForm, branchId: workspace.branchId })}>清空人物表单</button>
              <button className="secondary" disabled={!workspace.clanId} onClick={() => void refresh({ clanId: workspace.clanId, branchId: workspace.branchId, schemeId: schemeForm.schemeId })}>刷新人物</button>
            </Actions>
            <DataTable data={snapshot.persons} columns={[{ key: 'personCode', title: '系统编码' }, { key: 'name', title: '姓名' }, { key: 'genealogyName', title: '谱名' }, { key: 'gender', title: '性别' }, { key: 'generationNo', title: '代次' }, { key: 'generationWord', title: '字辈' }, { key: 'dataStatus', title: '状态' }]} onSelect={row => void refresh({ clanId: workspace.clanId, branchId: workspace.branchId, personId: String(row.id), schemeId: schemeForm.schemeId })} />
          </Panel>
        );
      case 'relationship':
        return (
          <Panel title="建立亲属关系" description="本步骤独立选择中心人物，再录入亲属和关系。">
            <div className="wizard-current">中心人物：<strong>{selectedPerson?.name || '未选择人物'}</strong></div>
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              {renderPersonSelector('中心人物 *')}
              {renderSchemeSelector('亲属字辈方案')}
              <Field label="关系类型 *"><select value={relativeForm.mode} onChange={e => patchRelative('mode', e.target.value)} required><option value="father">添加父亲</option><option value="mother">添加母亲</option><option value="spouse">添加配偶</option><option value="child">添加子女</option></select></Field>
              <Field label="亲属姓名 *"><input value={relativeForm.name} onChange={e => patchRelative('name', e.target.value)} required /></Field>
              <Field label="亲属性别 *"><select value={relativeForm.gender} onChange={e => patchRelative('gender', e.target.value)} required><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field>
              <Field label="亲属字辈"><select value={generationSelectedValue(relativeForm.generationWord, relativeForm.generationNo)} onChange={e => selectGenerationItem(e.target.value, 'relative')} disabled={!generationItems.length}><option value="">{generationItems.length ? '请选择亲属字辈' : '未选择字辈方案'}</option>{generationItems.map(item => <option key={generationOptionValue(item)} value={generationOptionValue(item)}>{generationLabel(item)}</option>)}</select></Field>
              <Field label="亲属代次"><input value={relativeForm.generationNo ? `第${relativeForm.generationNo}世` : '选择字辈后自动带出'} disabled readOnly /></Field>
            </div>
            <Actions><button disabled={loading || !workspace.personId} onClick={createRelative}>创建亲属关系</button><button className="secondary" disabled={!workspace.clanId} onClick={() => void refresh({ clanId: workspace.clanId, personId: workspace.personId, schemeId: schemeForm.schemeId })}>刷新关系</button></Actions>
            <DataTable data={snapshot.relationships} columns={[{ key: 'relationPeople', title: '关系对象', render: relationshipLabel }, { key: 'relationType', title: '类型' }, { key: 'relationLabel', title: '标签' }]} onSelect={row => workspace.setRelationshipId(String(row.id))} />
          </Panel>
        );
      case 'source':
        return (
          <Panel title="绑定来源证据" description="本步骤独立选择宗族、来源和绑定对象。">
            <div className="wizard-current">当前来源：<strong>{selectedSource?.sourceName || '未选择来源'}</strong>；当前关系：<strong>{selectedRelationship ? relationshipLabel(selectedRelationship) : '未选择关系'}</strong></div>
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              <Field label="已有来源"><select value={workspace.sourceId} disabled={!sources.length} onChange={e => workspace.setSourceId(e.target.value)}><option value="">请选择来源</option>{sources.map(source => <option key={source.id} value={String(source.id)}>{source.sourceName || `来源#${source.id}`}</option>)}</select></Field>
              <Field label="来源名称 *"><input value={sourceForm.sourceName} onChange={e => patchSource('sourceName', e.target.value)} placeholder="例如：老谱第3卷第28页" required /></Field>
              <Field label="来源类型 *"><select value={sourceForm.sourceType} onChange={e => patchSource('sourceType', e.target.value)} required><option value="genealogy_book">族谱原文</option><option value="oral_record">口述记录</option><option value="tombstone">墓碑/墓志</option><option value="photo">照片</option><option value="local_chronicle">地方志</option><option value="other">其他</option></select></Field>
              <Field label="绑定对象类型"><select value={sourceForm.targetType} onChange={e => setSourceForm(prev => ({ ...prev, targetType: e.target.value, targetId: '' }))}><option value="person">人物</option><option value="relationship">关系</option><option value="branch">支派</option><option value="clan">宗族</option></select></Field>
              <Field label="绑定对象 *"><select value={effectiveSourceTargetId()} onChange={e => patchSource('targetId', e.target.value)} required><option value="">请选择绑定对象</option>{sourceTargetOptions().map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
            </div>
            <Actions><button disabled={loading || !workspace.clanId} onClick={createSource}>创建来源</button><button disabled={loading || !workspace.sourceId} onClick={bindSource}>绑定来源</button><button className="secondary" disabled={!workspace.clanId} onClick={() => void refresh({ clanId: workspace.clanId, sourceId: workspace.sourceId, personId: workspace.personId, schemeId: schemeForm.schemeId })}>刷新来源</button></Actions>
            <DataTable data={snapshot.sources} columns={[{ key: 'sourceName', title: '来源名称' }, { key: 'sourceType', title: '类型' }, { key: 'verificationStatus', title: '状态' }]} onSelect={row => workspace.setSourceId(String(row.id))} />
          </Panel>
        );
      case 'review':
        return (
          <Panel title="提交与处理审核" description="本步骤独立选择审核对象或待审任务，不再依赖来源绑定步骤。">
            <div className="wizard-current">当前审核任务：<strong>{selectedReviewTask ? `${selectedReviewTask.targetType || ''} · ${selectedReviewTask.status || ''}` : '未选择'}</strong></div>
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              <Field label="对象类型"><select value={reviewForm.targetType} onChange={e => setReviewForm(prev => ({ ...prev, targetType: e.target.value, targetId: '' }))}><option value="persons">人物</option><option value="relationships">关系</option><option value="sources">来源</option><option value="branches">支派</option><option value="generation-schemes">字辈方案</option></select></Field>
              <Field label="审核对象 *"><select value={effectiveReviewTargetId()} onChange={e => setReviewForm(prev => ({ ...prev, targetId: e.target.value }))} required><option value="">请选择审核对象</option>{reviewTargetOptions().map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
              <Field label="审核任务"><select value={workspace.reviewTaskId} onChange={e => workspace.setReviewTaskId(e.target.value)}><option value="">请选择待审核任务</option>{tasks.map(task => <option key={task.id} value={String(task.id)}>{task.targetType || '对象'} · {task.status || '待处理'} · {display(task.createdAt)}</option>)}</select></Field>
              <Field label="审核意见 *"><input value={reviewForm.comment} onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))} required /></Field>
            </div>
            <Actions><button disabled={loading || !workspace.clanId} onClick={submitReview}>提交审核</button><button className="secondary" disabled={loading || !workspace.reviewTaskId} onClick={approveReview}>通过当前任务</button><button className="secondary" disabled={!workspace.clanId} onClick={() => void refresh({ clanId: workspace.clanId, reviewTaskId: workspace.reviewTaskId, schemeId: schemeForm.schemeId })}>刷新审核任务</button></Actions>
            <DataTable data={snapshot.tasks} columns={[{ key: 'targetType', title: '对象类型' }, { key: 'status', title: '状态' }, { key: 'createdAt', title: '创建时间' }]} onSelect={row => workspace.setReviewTaskId(String(row.id))} />
          </Panel>
        );
      case 'tree':
        return (
          <Panel title="查看世系与导出" description="本步骤独立选择宗族和中心人物后查询世系。">
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              {renderPersonSelector('中心人物 *')}
              <Field label="查询模式"><select value={treeMode} onChange={e => setTreeMode(e.target.value)}><option value="family">家庭图</option><option value="descendants">下延世系</option><option value="ancestors">上溯世系</option></select></Field>
              <Field label="展开深度"><select value={depth} onChange={e => setDepth(e.target.value)}><option value="2">2代</option><option value="3">3代</option><option value="5">5代</option><option value="8">8代</option></select></Field>
            </div>
            <Actions><button disabled={loading || !workspace.personId} onClick={queryTree}>查询世系图</button><button className="secondary" disabled={!workspace.clanId} onClick={() => downloadExport(`/clans/${workspace.clanId}/exports/persons.csv`, 'persons.csv')}>导出人物CSV</button><button className="secondary" disabled={!workspace.clanId} onClick={() => downloadExport(`/clans/${workspace.clanId}/exports/relations.csv`, 'relations.csv')}>导出关系CSV</button></Actions>
            <div className="summary-card"><div><span>节点数</span><strong>{treeNodes.length || '-'}</strong></div><div><span>关系边</span><strong>{treeEdges.length || '-'}</strong></div><div><span>中心人物</span><strong>{selectedPerson?.name || '-'}</strong></div></div>
            <DataTable data={treeEdges} columns={[{ key: 'relationPeople', title: '关系对象', render: relationshipLabel }, { key: 'relationType', title: '关系类型' }, { key: 'relationLabel', title: '标签' }]} />
          </Panel>
        );
      default:
        return null;
    }
  }

  return (
    <div className="mvp1-wizard">
      <section className="wizard-hero">
        <div>
          <span>MVP1 Workflow</span>
          <h2>建谱闭环向导</h2>
          <p>每个步骤都可独立进入并选择所需信息；只有一个可选对象时自动默认，多对象时由用户选择。</p>
        </div>
      </section>
      <div className="wizard-layout">
        <aside className="wizard-steps">
          {steps.map(step => <button key={step.key} className={active === step.key ? 'active' : ''} onClick={() => setActive(step.key)}><strong>{step.title}</strong><span>{step.desc}</span><em>{step.ready ? '已具备' : '待选择'}</em></button>)}
        </aside>
        <main className="wizard-main">
          {renderCurrentStep()}
          <ResultNotice result={result} />
        </main>
        <aside className="wizard-context">
          <Panel title="当前上下文" description="向导只记录最近选择对象，不作为步骤强依赖。">
            <div className="wizard-id-list">
              <div><span>宗族</span><strong>{selectedClan?.clanName || '-'}</strong></div>
              <div><span>支派</span><strong>{selectedBranch?.branchName || '-'}</strong></div>
              <div><span>字辈方案</span><strong>{schemeForm.schemeId ? schemeForm.schemeName : '-'}</strong></div>
              <div><span>中心人物</span><strong>{selectedPerson?.name || '-'}</strong></div>
              <div><span>关系</span><strong>{selectedRelationship ? relationshipLabel(selectedRelationship) : '-'}</strong></div>
              <div><span>来源</span><strong>{selectedSource?.sourceName || '-'}</strong></div>
              <div><span>审核任务</span><strong>{selectedReviewTask?.status || '-'}</strong></div>
            </div>
          </Panel>
          <Panel title="数据概览">
            <div className="wizard-mini-metrics">
              <div><span>宗族</span><strong>{clans.length}</strong></div>
              <div><span>支派</span><strong>{branches.length}</strong></div>
              <div><span>字辈方案</span><strong>{schemes.length}</strong></div>
              <div><span>字辈明细</span><strong>{generationItems.length}</strong></div>
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
