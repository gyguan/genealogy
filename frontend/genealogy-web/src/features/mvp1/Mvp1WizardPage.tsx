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

type LoadOptions = {
  clanId?: string;
  branchId?: string;
  personId?: string;
  sourceId?: string;
  reviewTaskId?: string;
  schemeId?: string;
  force?: boolean;
};

const stepOrder: { key: StepKey; title: string; desc: string }[] = [
  { key: 'clan', title: '1. 创建宗族', desc: '独立创建宗族，创建后自动带入支派步骤。' },
  { key: 'branch', title: '2. 建立支派', desc: '在表单中选择宗族后建立支派，可连续追加创建。' },
  { key: 'generation', title: '3. 维护字辈', desc: '先创建/选择字辈方案，再追加字辈明细。' },
  { key: 'person', title: '4. 录入人物', desc: '在表单中选择支派和字辈后录入人物。' },
  { key: 'relationship', title: '5. 建立关系', desc: '选择中心人物后录入亲属，并按关系校验亲属代次。' },
  { key: 'source', title: '6. 绑定来源', desc: '在表单中选择来源和绑定对象。' },
  { key: 'review', title: '7. 提交审核', desc: '在表单中选择审核对象或待审任务。' },
  { key: 'tree', title: '8. 查看世系', desc: '在表单中选择中心人物后查看世系。' }
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

function generationNoOptions() {
  return Array.from({ length: 60 }, (_, index) => String(index + 1));
}

function expectedRelativeGenerationNo(centerGenerationNo: unknown, mode: string) {
  const centerNo = Number(centerGenerationNo);
  if (!Number.isFinite(centerNo) || centerNo <= 0) return null;
  const expected = mode === 'child' ? centerNo + 1 : mode === 'spouse' ? centerNo : centerNo - 1;
  return expected > 0 ? expected : null;
}

function relativeGenerationRuleText(mode: string) {
  if (mode === 'father' || mode === 'mother') return '父母应为中心人物上一代';
  if (mode === 'child') return '子女应为中心人物下一代';
  if (mode === 'spouse') return '配偶应与中心人物同代';
  return '请按关系选择正确代次';
}

export function Mvp1WizardPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [active, setActive] = useState<StepKey>('clan');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Notice | unknown>();
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [loadedSteps, setLoadedSteps] = useState<Set<StepKey>>(new Set());

  const [clanForm, setClanForm] = useState({ clanName: '', surname: '', hallName: '', originPlace: '' });
  const [branchForm, setBranchForm] = useState({ branchName: '', parentId: '' });
  const [schemeForm, setSchemeForm] = useState({ schemeId: '', schemeName: '', generationNo: '1', word: '' });
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
  const selectedPerson = useMemo(() => persons.find(item => String(item.id) === workspace.personId), [persons, workspace.personId]);
  const suggestedRelativeGenerationNo = expectedRelativeGenerationNo(selectedPerson?.generationNo, relativeForm.mode);

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

  async function loadClans(options: LoadOptions = {}) {
    if (!options.force && snapshot.clans) return snapshot.clans;
    const clanRes = await safe('查询宗族', () => apiClient.get('/clans'), []);
    const nextClanId = pickId(clanRes, options.clanId !== undefined ? options.clanId : workspace.clanId);
    workspace.patch({ clanId: nextClanId || workspace.clanId || '' });
    setSnapshot(prev => ({ ...prev, clans: clanRes }));
    setLoadedSteps(prev => new Set(prev).add('clan'));
    return clanRes;
  }

  async function loadStepData(step: StepKey, options: LoadOptions = {}) {
    const force = options.force === true;
    const clanRes = await loadClans(options);
    const nextClanId = options.clanId !== undefined ? options.clanId : pickId(clanRes, workspace.clanId);

    if (step === 'clan') return;
    if (!nextClanId) {
      setLoadedSteps(prev => new Set(prev).add(step));
      return;
    }

    let branchRes = snapshot.branches;
    let personRes = snapshot.persons;
    let sourceRes = snapshot.sources;
    let schemeRes = snapshot.schemes;
    let taskRes = snapshot.tasks;
    let relationRes = snapshot.relationships;
    let treeRes = snapshot.tree;
    let generationItemRes = snapshot.generationItems;

    const needsBranches = ['branch', 'generation', 'person', 'source', 'review'].includes(step);
    const needsPersons = ['person', 'relationship', 'source', 'review', 'tree'].includes(step);
    const needsSources = ['source', 'review'].includes(step);
    const needsSchemes = ['generation', 'person', 'review'].includes(step);
    const needsTasks = step === 'review';

    if ((force || !branchRes) && needsBranches) branchRes = await safe('查询支派', () => apiClient.get(`/clans/${nextClanId}/branches`), []);
    if ((force || !personRes) && needsPersons) personRes = await safe('查询人物', () => apiClient.get(`/clans/${nextClanId}/persons`), []);
    if ((force || !sourceRes) && needsSources) sourceRes = await safe('查询来源', () => apiClient.get(`/clans/${nextClanId}/sources`), []);
    if ((force || !schemeRes) && needsSchemes) schemeRes = await safe('查询字辈方案', () => apiClient.get(`/clans/${nextClanId}/generation-schemes`), []);
    if ((force || !taskRes) && needsTasks) taskRes = await safe('查询审核任务', () => apiClient.get(`/clans/${nextClanId}/review-tasks/pending`), []);

    const nextBranchId = pickId(branchRes, options.branchId !== undefined ? options.branchId : workspace.branchId);
    const nextPersonId = pickId(personRes, options.personId !== undefined ? options.personId : workspace.personId);
    const nextSourceId = pickId(sourceRes, options.sourceId !== undefined ? options.sourceId : workspace.sourceId);
    const nextReviewTaskId = pickId(taskRes, options.reviewTaskId !== undefined ? options.reviewTaskId : workspace.reviewTaskId);
    const nextSchemeId = pickId(schemeRes, options.schemeId !== undefined ? options.schemeId : schemeForm.schemeId);

    if ((step === 'generation' || step === 'person') && nextSchemeId && (force || !generationItemRes)) {
      generationItemRes = await loadGenerationItems(nextSchemeId);
    }
    if ((step === 'relationship' || step === 'source' || step === 'review') && nextPersonId && (force || !relationRes)) {
      relationRes = await safe('查询关系', () => apiClient.get(`/persons/${nextPersonId}/relationships`), []);
    }
    if (step === 'tree' && nextPersonId && (force || !treeRes)) {
      treeRes = await safe('查询世系', () => apiClient.get(`/tree/person/${nextPersonId}/family`), null);
    }

    workspace.patch({
      clanId: nextClanId || '',
      branchId: nextBranchId || '',
      personId: nextPersonId || '',
      sourceId: nextSourceId || '',
      reviewTaskId: nextReviewTaskId || '',
      relationshipId: hasId(relationRes, workspace.relationshipId) ? workspace.relationshipId : ''
    });

    setSchemeForm(prev => ({ ...prev, schemeId: nextSchemeId || prev.schemeId || '' }));
    setPersonForm(prev => ({ ...prev, branchId: hasId(branchRes, prev.branchId) ? prev.branchId : nextBranchId || prev.branchId || '' }));
    setSnapshot(prev => ({
      ...prev,
      clans: clanRes,
      branches: branchRes,
      persons: personRes,
      sources: sourceRes,
      schemes: schemeRes,
      generationItems: generationItemRes,
      tasks: taskRes,
      relationships: relationRes,
      tree: treeRes
    }));
    setLoadedSteps(prev => new Set(prev).add(step));
  }

  async function refresh(options: LoadOptions = {}) {
    await loadStepData(active, { ...options, force: true });
  }

  useEffect(() => { void loadStepData('clan'); }, []);

  async function openStep(step: StepKey) {
    setActive(step);
    await run(async () => { await loadStepData(step); });
  }

  function patchClan(key: keyof typeof clanForm, value: string) { setClanForm(prev => ({ ...prev, [key]: value })); }
  function patchPerson(key: keyof typeof personForm, value: string) { setPersonForm(prev => ({ ...prev, [key]: value })); }
  function patchRelative(key: keyof typeof relativeForm, value: string) { setRelativeForm(prev => ({ ...prev, [key]: value })); }
  function patchSource(key: keyof typeof sourceForm, value: string) { setSourceForm(prev => ({ ...prev, [key]: value })); }

  function changeRelativeMode(mode: string) {
    const expectedNo = expectedRelativeGenerationNo(selectedPerson?.generationNo, mode);
    setRelativeForm(prev => ({ ...prev, mode, generationNo: expectedNo ? String(expectedNo) : '' }));
  }

  function validateRelativeGeneration(centerPerson: any) {
    if (!centerPerson) throw new Error('中心人物数据未加载，请先选择中心人物');
    const centerNo = Number(centerPerson.generationNo);
    if (!Number.isFinite(centerNo) || centerNo <= 0) throw new Error('中心人物未维护代次，无法校验亲属代次');
    const expectedNo = expectedRelativeGenerationNo(centerNo, relativeForm.mode);
    if (!expectedNo) throw new Error('当前中心人物代次无法新增上一代父母');
    const relativeNo = Number(relativeForm.generationNo);
    if (!Number.isFinite(relativeNo) || relativeNo <= 0) throw new Error('请选择亲属代次');
    if (relativeNo !== expectedNo) {
      throw new Error(`${relativeGenerationRuleText(relativeForm.mode)}，应选择第${expectedNo}世；当前中心人物为第${centerNo}世`);
    }
  }

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

  function effectiveSourceTargetId() { return sourceForm.targetId || sourceTargetOptions()[0]?.value || ''; }
  function effectiveReviewTargetId() { return reviewForm.targetId || reviewTargetOptions()[0]?.value || ''; }

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
      workspace.patch({ clanId: nextClanId, branchId: '', personId: '', sourceId: '', reviewTaskId: '', relationshipId: '' });
      await loadStepData('branch', { clanId: nextClanId, force: true });
      setActive('branch');
      return makeNotice('宗族创建成功，已带入建立支派步骤', data?.id);
    });
  }

  async function changeClan(nextClanId: string) {
    await run(async () => {
      workspace.patch({ clanId: nextClanId, branchId: '', personId: '', sourceId: '', reviewTaskId: '', relationshipId: '' });
      setSnapshot(prev => ({ ...prev, branches: undefined, schemes: undefined, generationItems: undefined, persons: undefined, relationships: undefined, sources: undefined, tasks: undefined, tree: undefined }));
      await loadStepData(active, { clanId: nextClanId, force: true });
      return makeNotice(nextClanId ? '宗族已切换，当前步骤选项已刷新' : '已清空宗族选择');
    });
  }

  async function selectBranchId(nextBranchId: string) {
    workspace.setBranchId(nextBranchId);
    setPersonForm(prev => ({ ...prev, branchId: nextBranchId }));
    const branchScheme = schemes.find(item => String(item.branchId) === nextBranchId) || (schemes.length === 1 ? schemes[0] : null);
    if (branchScheme?.id) await selectScheme(branchScheme);
  }

  async function createBranch(append = false) {
    await run(async () => {
      if (!workspace.clanId) throw new Error(clans.length > 1 ? '请选择宗族' : '请先创建或选择宗族');
      if (!branchForm.branchName.trim()) throw new Error('请填写支派名称');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/branches`, {
        branchName: branchForm.branchName.trim(),
        parentId: branchForm.parentId ? Number(branchForm.parentId) : null
      });
      const nextBranchId = String(data?.id || '');
      await loadStepData('branch', { clanId: workspace.clanId, branchId: nextBranchId, force: true });
      setBranchForm({ branchName: '', parentId: append ? branchForm.parentId : '' });
      setPersonForm(prev => ({ ...prev, branchId: nextBranchId }));
      if (!append) {
        await loadStepData('generation', { clanId: workspace.clanId, branchId: nextBranchId, force: true });
        setActive('generation');
      }
      return makeNotice(append ? '支派创建成功，可继续追加创建支派' : '支派创建成功，已带入维护字辈步骤', data?.id);
    });
  }

  async function createScheme() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请选择宗族');
      if (!schemeForm.schemeName.trim()) throw new Error('请填写字辈方案名称');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/generation-schemes`, {
        branchId: workspace.branchId ? Number(workspace.branchId) : null,
        schemeName: schemeForm.schemeName.trim(),
        isDefault: true,
        validationEnabled: true,
        strictMode: false
      });
      const nextSchemeId = String(data?.id || '');
      setSchemeForm(prev => ({ ...prev, schemeId: nextSchemeId }));
      await loadStepData('generation', { clanId: workspace.clanId, branchId: workspace.branchId, schemeId: nextSchemeId, force: true });
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
      await loadStepData('generation', { clanId: workspace.clanId, branchId: workspace.branchId, schemeId: schemeForm.schemeId, force: true });
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
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/persons`, buildPersonPayload());
      const nextPersonId = String(data?.id || '');
      await loadStepData('person', { clanId: workspace.clanId, branchId: personForm.branchId || workspace.branchId, personId: nextPersonId, schemeId: schemeForm.schemeId, force: true });
      if (continueAdding) resetPersonFormForNext();
      else {
        await loadStepData('relationship', { clanId: workspace.clanId, personId: nextPersonId, force: true });
        setActive('relationship');
      }
      return makeNotice(continueAdding ? '人物档案创建成功，可继续录入下一个人物' : '人物档案创建成功，已带入建立关系步骤', data?.personCode || data?.id);
    });
  }

  async function createRelative() {
    await run(async () => {
      const centerPerson = selectedPerson;
      const mode = relativeForm.mode;
      const effectiveBranchId = String(centerPerson?.branchId || workspace.branchId || personForm.branchId || '');
      if (!workspace.clanId) throw new Error('请选择宗族');
      if (!workspace.personId) throw new Error('请选择中心人物');
      if (!effectiveBranchId) throw new Error('请选择支派');
      if (!relativeForm.name.trim()) throw new Error('请填写亲属姓名');
      if (!relativeForm.gender) throw new Error('请选择亲属性别');
      validateRelativeGeneration(centerPerson);
      const created: any = await apiClient.post(`/clans/${workspace.clanId}/persons`, {
        branchId: Number(effectiveBranchId),
        personCode: null,
        name: relativeForm.name.trim(),
        gender: relativeForm.gender,
        generationNo: Number(relativeForm.generationNo),
        generationWord: nullableString(relativeForm.generationWord),
        isLiving: true,
        privacyLevel: 'clan_only',
        dataStatus: 'draft'
      });
      if (!created?.id) throw new Error('亲属人物创建失败');
      const relationBody = mode === 'spouse'
        ? { fromPersonId: Number(workspace.personId), toPersonId: Number(created.id), relationType: 'spouse', relationLabel: 'spouse', isLineageRelation: false, isBiological: false, isPrimary: true, confidenceLevel: 'high' }
        : mode === 'child'
          ? { fromPersonId: Number(workspace.personId), toPersonId: Number(created.id), relationType: 'parent_child', relationLabel: centerPerson?.gender === 'female' ? 'mother' : 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' }
          : { fromPersonId: Number(created.id), toPersonId: Number(workspace.personId), relationType: 'parent_child', relationLabel: mode === 'mother' ? 'mother' : 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' };
      const relation: any = await apiClient.post(`/clans/${workspace.clanId}/relationships`, relationBody);
      workspace.setRelationshipId(String(relation?.id || ''));
      await loadStepData('relationship', { clanId: workspace.clanId, personId: workspace.personId, force: true });
      setActive('source');
      return makeNotice('亲属关系创建成功，已带入绑定来源步骤', relation?.id);
    });
  }

  async function createSource() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请选择宗族');
      if (!sourceForm.sourceName.trim()) throw new Error('请填写来源名称');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/sources`, {
        sourceName: sourceForm.sourceName.trim(),
        sourceType: sourceForm.sourceType,
        description: null
      });
      workspace.setSourceId(String(data?.id || ''));
      await loadStepData('source', { clanId: workspace.clanId, sourceId: String(data?.id || ''), force: true });
      return makeNotice('来源创建成功，可继续绑定对象', data?.id);
    });
  }

  async function bindSource() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请选择宗族');
      if (!workspace.sourceId) throw new Error('请先创建或选择来源');
      const targetId = effectiveSourceTargetId();
      if (!targetId) throw new Error('请选择绑定对象');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/source-links`, {
        sourceId: Number(workspace.sourceId),
        targetType: sourceForm.targetType,
        targetId: Number(targetId)
      });
      setActive('review');
      await loadStepData('review', { clanId: workspace.clanId, sourceId: workspace.sourceId, force: true });
      return makeNotice('来源绑定成功，已带入提交审核步骤', data?.id);
    });
  }

  async function submitReview() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请选择宗族');
      const targetId = effectiveReviewTargetId();
      if (!targetId) throw new Error('请选择审核对象');
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/review-tasks`, {
        targetType: reviewForm.targetType,
        targetId: Number(targetId),
        comment: nullableString(reviewForm.comment)
      });
      await loadStepData('review', { clanId: workspace.clanId, reviewTaskId: String(data?.id || ''), force: true });
      return makeNotice('审核任务已提交', data?.id);
    });
  }

  async function approveReview(taskId?: string) {
    await run(async () => {
      const effectiveTaskId = taskId || workspace.reviewTaskId;
      if (!effectiveTaskId) throw new Error('请选择待审任务');
      await apiClient.post(`/review-tasks/${effectiveTaskId}/approve`, { comment: reviewForm.comment });
      await loadStepData('review', { clanId: workspace.clanId, force: true });
      return makeNotice('审核已通过', effectiveTaskId);
    });
  }

  async function loadTree() {
    await run(async () => {
      if (!workspace.personId) throw new Error('请选择中心人物');
      const path = treeMode === 'ancestors'
        ? `/tree/ancestors?personId=${workspace.personId}&maxDepth=${depth}`
        : treeMode === 'descendants'
          ? `/tree/descendants?rootPersonId=${workspace.personId}&maxDepth=${depth}`
          : `/tree/person/${workspace.personId}/family`;
      const tree = await apiClient.get(path);
      setSnapshot(prev => ({ ...prev, tree }));
      return makeNotice('世系图谱已生成');
    });
  }

  function renderClanSelector(label = '当前宗族') {
    return (
      <Field label={`${label} *`}>
        <select value={workspace.clanId} onChange={e => void changeClan(e.target.value)} required>
          <option value="">请选择宗族</option>
          {clans.map(clan => <option key={clan.id} value={String(clan.id)}>{clan.clanName || clan.surname || `宗族#${clan.id}`}</option>)}
        </select>
      </Field>
    );
  }

  function renderBranchSelector(label = '当前支派') {
    return (
      <Field label={label}>
        <select value={workspace.branchId} disabled={!workspace.clanId} onChange={e => void selectBranchId(e.target.value)}>
          <option value="">无支派/宗族共用</option>
          {branches.map(branch => <option key={branch.id} value={String(branch.id)}>{branch.branchName || `支派#${branch.id}`}</option>)}
        </select>
      </Field>
    );
  }

  function renderSchemeSelector(label = '字辈方案') {
    return (
      <Field label={label}>
        <select value={schemeForm.schemeId} disabled={!workspace.clanId || !schemes.length} onChange={e => {
          const selected = schemes.find(item => String(item.id) === e.target.value);
          if (selected) void selectScheme(selected);
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
        <select value={workspace.personId} disabled={!workspace.clanId || !persons.length} onChange={e => void loadStepData(active, { clanId: workspace.clanId, branchId: workspace.branchId, personId: e.target.value, schemeId: schemeForm.schemeId, force: true })}>
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
          <Panel title="创建宗族" description="只维护新宗族信息；已有宗族会在后续步骤的下拉框中选择。">
            <div className="wizard-form-grid">
              <Field label="宗族名称 *"><input value={clanForm.clanName} onChange={e => patchClan('clanName', e.target.value)} placeholder="例如：江夏堂黄氏宗族" required /></Field>
              <Field label="姓氏 *"><input value={clanForm.surname} onChange={e => patchClan('surname', e.target.value)} placeholder="例如：黄" required /></Field>
              <Field label="系统生成编码"><input value="保存后自动生成" disabled readOnly /></Field>
              <Field label="堂号"><input value={clanForm.hallName} onChange={e => patchClan('hallName', e.target.value)} /></Field>
              <Field label="祖籍/发源地"><input value={clanForm.originPlace} onChange={e => patchClan('originPlace', e.target.value)} /></Field>
            </div>
            <Actions><button disabled={loading} onClick={createClan}>创建宗族</button></Actions>
          </Panel>
        );
      case 'branch':
        return (
          <Panel title="建立支派" description="点击本步骤后才加载支派数据；可连续追加创建。">
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              <Field label="支派名称 *"><input value={branchForm.branchName} onChange={e => setBranchForm(prev => ({ ...prev, branchName: e.target.value }))} placeholder="例如：长沙支" required /></Field>
              <Field label="父支派"><select value={branchForm.parentId} disabled={!workspace.clanId} onChange={e => setBranchForm(prev => ({ ...prev, parentId: e.target.value }))}><option value="">无父支派/作为一级支派</option>{branches.map(branch => <option key={branch.id} value={String(branch.id)}>{branch.branchName || `支派#${branch.id}`}</option>)}</select></Field>
              <Field label="系统生成编号"><input value="保存后自动生成" disabled readOnly /></Field>
            </div>
            <Actions>
              <button disabled={loading || !workspace.clanId} onClick={() => void createBranch(false)}>创建支派</button>
              <button className="secondary" disabled={loading || !workspace.clanId} onClick={() => void createBranch(true)}>追加创建支派</button>
            </Actions>
            <section className="wizard-branch-list">
              <h4>该宗族下已有支派</h4>
              <DataTable data={snapshot.branches} empty={workspace.clanId ? '暂无支派，创建后会显示在这里' : '请选择宗族后查看支派'} columns={[{ key: 'branchName', title: '支派名称' }, { key: 'parentName', title: '父支派', render: row => branches.find(item => String(item.id) === String(row.parentId))?.branchName || '无' }, { key: 'status', title: '状态' }]} onSelect={row => void selectBranchId(String(row.id || ''))} />
            </section>
          </Panel>
        );
      case 'generation':
        return (
          <Panel title="维护字辈" description="点击本步骤后才加载字辈方案；先创建或选择方案，再追加字辈明细。">
            <section className="wizard-generation-section">
              <h4>一、创建字辈方案</h4>
              <div className="wizard-form-grid wizard-generation-scheme-grid">
                {renderClanSelector('适用宗族')}
                {renderBranchSelector('适用支派')}
                {renderSchemeSelector('已有方案')}
                <Field label="字辈方案名称 *"><input value={schemeForm.schemeName} onChange={e => setSchemeForm(prev => ({ ...prev, schemeName: e.target.value }))} required /></Field>
                <Field label="系统生成编号"><input value={schemeForm.schemeId ? `已生成：${schemeForm.schemeId}` : '创建方案后自动生成'} disabled readOnly /></Field>
              </div>
              <Actions><button disabled={loading || !workspace.clanId} onClick={createScheme}>创建字辈方案</button></Actions>
            </section>
            <section className="wizard-generation-section wizard-generation-section--items">
              <h4>二、追加字辈明细</h4>
              <div className="wizard-form-grid wizard-generation-word-grid">
                <Field label="当前字辈方案"><input value={schemeForm.schemeId ? schemeForm.schemeName : '请先创建或选择字辈方案'} disabled readOnly /></Field>
                <Field label="代次 *"><select value={schemeForm.generationNo} onChange={e => setSchemeForm(prev => ({ ...prev, generationNo: e.target.value }))}>{generationNoOptions().map(no => <option key={no} value={no}>第{no}世</option>)}</select></Field>
                <Field label="字辈 *"><input value={schemeForm.word} onChange={e => setSchemeForm(prev => ({ ...prev, word: e.target.value }))} placeholder="例如：德" required /></Field>
              </div>
              <Actions><button disabled={loading || !schemeForm.schemeId} onClick={addGenerationWord}>追加字辈</button></Actions>
            </section>
          </Panel>
        );
      case 'person':
        return (
          <Panel title="录入人物" description="点击本步骤后才加载支派、字辈和人物列表。">
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
              <Field label="出生日期"><input type="text" value={personForm.birthDate} onChange={e => patchPerson('birthDate', e.target.value)} placeholder="例如：1888-03-15" /></Field>
              <Field label="逝世日期"><input type="text" value={personForm.deathDate} onChange={e => patchPerson('deathDate', e.target.value)} placeholder="例如：1950-01-01" /></Field>
              <Field label="是否在世"><select value={personForm.isLiving} onChange={e => patchPerson('isLiving', e.target.value)}><option value="true">在世</option><option value="false">已故</option><option value="">未知</option></select></Field>
              <Field label="出生地"><input value={personForm.birthPlace} onChange={e => patchPerson('birthPlace', e.target.value)} /></Field>
              <Field label="居住地"><input value={personForm.residencePlace} onChange={e => patchPerson('residencePlace', e.target.value)} /></Field>
              <Field label="职业"><input value={personForm.occupation} onChange={e => patchPerson('occupation', e.target.value)} /></Field>
              <Field label="教育程度"><select value={personForm.education} onChange={e => patchPerson('education', e.target.value)}><option value="">请选择教育程度</option><option value="私塾/家学">私塾/家学</option><option value="小学">小学</option><option value="初中">初中</option><option value="高中">高中</option><option value="中专">中专</option><option value="大专">大专</option><option value="本科">本科</option><option value="硕士">硕士</option><option value="博士">博士</option><option value="其他">其他</option></select></Field>
              <Field label="世系状态"><select value={personForm.lineageStatus} onChange={e => patchPerson('lineageStatus', e.target.value)}><option value="normal">正常</option><option value="adopted_in">继入</option><option value="adopted_out">出嗣</option><option value="unknown">未知</option></select></Field>
              <Field label="隐私级别"><select value={personForm.privacyLevel} onChange={e => patchPerson('privacyLevel', e.target.value)}><option value="public">公开</option><option value="clan_only">宗族内可见</option><option value="branch_only">支派内可见</option><option value="private">私密</option></select></Field>
            </div>
            <Field label="人物传记"><textarea value={personForm.biography} onChange={e => patchPerson('biography', e.target.value)} rows={4} placeholder="记录生平、迁徙、功名、事迹等" /></Field>
            <Field label="墓志铭"><textarea value={personForm.epitaph} onChange={e => patchPerson('epitaph', e.target.value)} rows={3} placeholder="记录墓志、碑文或相关摘录" /></Field>
            <Actions><button disabled={loading} onClick={() => void createPerson(true)}>创建人物，继续录入</button><button className="secondary" disabled={loading} onClick={() => void createPerson(false)}>创建人物</button><button className="secondary" onClick={() => setPersonForm({ ...defaultPersonForm, branchId: workspace.branchId })}>重置</button></Actions>
          </Panel>
        );
      case 'relationship':
        return (
          <Panel title="建立亲属关系" description="点击本步骤后才加载人物和关系数据。">
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              {renderPersonSelector('中心人物 *')}
              <Field label="中心人物代次"><input value={selectedPerson?.generationNo ? `第${selectedPerson.generationNo}世` : '中心人物未维护代次'} disabled readOnly /></Field>
              <Field label="关系类型 *"><select value={relativeForm.mode} onChange={e => changeRelativeMode(e.target.value)} required><option value="father">添加父亲</option><option value="mother">添加母亲</option><option value="spouse">添加配偶</option><option value="child">添加子女</option></select></Field>
              <Field label="亲属姓名 *"><input value={relativeForm.name} onChange={e => patchRelative('name', e.target.value)} required /></Field>
              <Field label="亲属性别 *"><select value={relativeForm.gender} onChange={e => patchRelative('gender', e.target.value)} required><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field>
              <Field label="亲属代次 *"><select value={relativeForm.generationNo} onChange={e => patchRelative('generationNo', e.target.value)} required><option value="">请选择亲属代次</option>{generationNoOptions().map(no => <option key={no} value={no}>第{no}世</option>)}</select></Field>
              <Field label="代次规则"><input value={suggestedRelativeGenerationNo ? `${relativeGenerationRuleText(relativeForm.mode)}，建议第${suggestedRelativeGenerationNo}世` : '请先为中心人物维护代次'} disabled readOnly /></Field>
            </div>
            <Actions><button disabled={loading || !workspace.personId} onClick={createRelative}>创建亲属关系</button></Actions>
          </Panel>
        );
      case 'source':
        return (
          <Panel title="绑定来源证据" description="点击本步骤后才加载来源和绑定对象。">
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              <Field label="已有来源"><select value={workspace.sourceId} disabled={!sources.length} onChange={e => workspace.setSourceId(e.target.value)}><option value="">{sources.length ? '请选择已有来源' : '暂无来源，可先创建'}</option>{sources.map(source => <option key={source.id} value={String(source.id)}>{source.sourceName || `来源#${source.id}`}</option>)}</select></Field>
              <Field label="来源名称 *"><input value={sourceForm.sourceName} onChange={e => patchSource('sourceName', e.target.value)} placeholder="例如：民国二十年族谱" /></Field>
              <Field label="来源类型"><select value={sourceForm.sourceType} onChange={e => patchSource('sourceType', e.target.value)}><option value="genealogy_book">族谱</option><option value="oral_history">口述</option><option value="tombstone">墓碑</option><option value="photo">照片</option><option value="archive">档案</option></select></Field>
              <Field label="绑定对象类型"><select value={sourceForm.targetType} onChange={e => { patchSource('targetType', e.target.value); patchSource('targetId', ''); }}><option value="person">人物</option><option value="relationship">关系</option><option value="branch">支派</option><option value="clan">宗族</option></select></Field>
              <Field label="绑定对象"><select value={sourceForm.targetId || effectiveSourceTargetId()} onChange={e => patchSource('targetId', e.target.value)}><option value="">请选择绑定对象</option>{sourceTargetOptions().map(option => <option key={`${sourceForm.targetType}-${option.value}`} value={option.value}>{option.label}</option>)}</select></Field>
            </div>
            <Actions><button disabled={loading || !workspace.clanId} onClick={createSource}>创建来源</button><button className="secondary" disabled={loading || !workspace.sourceId} onClick={bindSource}>绑定来源</button></Actions>
          </Panel>
        );
      case 'review':
        return (
          <Panel title="提交审核" description="点击本步骤后才加载审核对象和待审任务。">
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              <Field label="审核对象类型"><select value={reviewForm.targetType} onChange={e => setReviewForm(prev => ({ ...prev, targetType: e.target.value, targetId: '' }))}><option value="persons">人物</option><option value="relationships">关系</option><option value="sources">来源</option><option value="branches">支派</option><option value="generation-schemes">字辈方案</option></select></Field>
              <Field label="审核对象"><select value={reviewForm.targetId || effectiveReviewTargetId()} onChange={e => setReviewForm(prev => ({ ...prev, targetId: e.target.value }))}><option value="">请选择审核对象</option>{reviewTargetOptions().map(option => <option key={`${reviewForm.targetType}-${option.value}`} value={option.value}>{option.label}</option>)}</select></Field>
              <Field label="待审任务"><select value={workspace.reviewTaskId} disabled={!tasks.length} onChange={e => workspace.setReviewTaskId(e.target.value)}><option value="">{tasks.length ? '请选择待审任务' : '暂无待审任务'}</option>{tasks.map(task => <option key={task.id} value={String(task.id)}>{task.targetType || '对象'} #{task.targetId} · {task.status || '待审'}</option>)}</select></Field>
            </div>
            <Field label="审核说明"><textarea value={reviewForm.comment} onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))} rows={3} /></Field>
            <Actions><button disabled={loading} onClick={submitReview}>提交审核</button><button className="secondary" disabled={loading || !workspace.reviewTaskId} onClick={() => void approveReview()}>通过选中任务</button></Actions>
            <DataTable data={snapshot.tasks} empty="暂无待审任务" columns={[{ key: 'targetType', title: '对象类型' }, { key: 'targetId', title: '对象ID' }, { key: 'status', title: '状态' }]} onSelect={row => workspace.setReviewTaskId(String(row.id || ''))} />
          </Panel>
        );
      case 'tree':
        return (
          <Panel title="查看世系" description="点击本步骤后才加载中心人物和世系数据。">
            <div className="wizard-form-grid">
              {renderClanSelector('适用宗族')}
              {renderPersonSelector('中心人物 *')}
              <Field label="图谱类型"><select value={treeMode} onChange={e => setTreeMode(e.target.value)}><option value="family">家庭网络</option><option value="ancestors">祖先链</option><option value="descendants">后代树</option></select></Field>
              <Field label="展开深度"><select value={depth} onChange={e => setDepth(e.target.value)}><option value="3">3代</option><option value="5">5代</option><option value="8">8代</option></select></Field>
            </div>
            <Actions><button disabled={loading || !workspace.personId} onClick={loadTree}>生成世系图</button></Actions>
            <DataTable data={treeNodes} empty="暂无节点，生成后展示" columns={[{ key: 'name', title: '人物' }, { key: 'generationNo', title: '代次' }, { key: 'generationWord', title: '字辈' }]} />
            <DataTable data={treeEdges} empty="暂无关系边" columns={[{ key: 'fromPersonId', title: '起点' }, { key: 'toPersonId', title: '终点' }, { key: 'relationLabel', title: '关系' }]} />
          </Panel>
        );
      default:
        return null;
    }
  }

  return (
    <div className="mvp1-wizard-page">
      <Panel title="MVP1 建谱向导" description="各步骤数据按点击加载，避免进入菜单后一次性请求所有接口。">
        <div className="wizard-steps">
          {steps.map(step => (
            <button key={step.key} className={active === step.key ? 'active' : step.ready ? 'ready' : ''} onClick={() => void openStep(step.key)}>
              <strong>{step.title}</strong><span>{step.desc}</span>
            </button>
          ))}
        </div>
      </Panel>
      {result ? <ResultNotice data={result} /> : null}
      {!loadedSteps.has(active) && active !== 'clan' ? <div className="wizard-step-hint">点击步骤后加载本步骤数据。</div> : null}
      {renderCurrentStep()}
    </div>
  );
}
