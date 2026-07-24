import {
  useEffect,
  useMemo,
  useState } from 'react';
import type { Key } from 'react';
import dayjs from 'dayjs';
import { Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Tag
} from 'antd';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Panel } from '../../../../shared/ui/Panel';
import { ResultListCard } from '../../../../shared/ui/ResultListCard';
import { DraftDeleteButton } from '../../../../shared/ui/DraftDeleteButton';
import { personEducationOptions } from '../../../../shared/domain/personFormOptions';
import { nullableBoolean, nullableNumber, nullableString } from '../../domain/normalize';
import { isOfficial, isReviewable, statusColor, statusText } from '../../domain/status';
import { loadBranches as queryBranches, type BranchLike } from '../../services/branchService';
import { loadClans as queryClans, type ClanLike } from '../../services/clanService';
import { loadGenerationItems as queryGenerationItems, loadGenerationSchemes as queryGenerationSchemes, type GenerationItemLike, type GenerationSchemeLike } from '../../services/generationService';
import { createPersonApi, deletePersonApi, loadPersons as queryPersons, type CreatePersonPayload, type PersonLike } from '../../services/personService';
import { countSettledResults, submitReviewTask, submitReviewTasks } from '../../services/reviewTaskService';
import { PersonEventEditor } from '../../../persons/PersonEventEditor';
import type { PersonEventDraft } from '../../../persons/personEventEditorModel';
import { createPersonWithEvents } from '../../../persons/personEventCreateFlow';
import { replacePersonEvents } from '../../../persons/personEventService';

import { feedback } from '../../../../shared/ui/OperationFeedback';

type PersonForm = {
  branchId: string;
  personCode: string;
  name: string;
  genealogyName: string;
  courtesyName: string;
  aliasName: string;
  gender: string;
  generationNo: string;
  generationWord: string;
  rankInFamily: string;
  birthDate: string;
  birthDatePrecision: string;
  deathDate: string;
  deathDatePrecision: string;
  isLiving: string;
  birthPlace: string;
  residencePlace: string;
  occupation: string;
  education: string;
  titleOrHonor: string;
  biography: string;
  tombPlace: string;
  epitaph: string;
  hasDescendant: string;
  lineageStatus: string;
  privacyLevel: string;
  dataStatus: string;
};

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
  onSubmittedReview?: (taskId: string) => void;
};

const defaultPersonForm: PersonForm = {
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

const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' }
];

const livingOptions = [
  { value: 'true', label: '在世' },
  { value: 'false', label: '已故' },
  { value: '', label: '未知' }
];

const personDatePrecisionOptions = [
  { value: 'year', label: '年' },
  { value: 'month', label: '月' },
  { value: 'day', label: '日' },
  { value: 'unknown', label: '未知' }
];

const descendantOptions = [
  { value: 'true', label: '有' },
  { value: 'false', label: '无' },
  { value: '', label: '未知' }
];

const lineageStatusOptions = [
  { value: 'normal', label: '正常' },
  { value: 'adopted_in', label: '继入' },
  { value: 'adopted_out', label: '出嗣' },
  { value: 'unknown', label: '未知' }
];

const privacyLevelOptions = [
  { value: 'public', label: '公开' },
  { value: 'clan_only', label: '宗族内可见' },
  { value: 'branch_only', label: '支派内可见' },
  { value: 'private', label: '私密' }
];

function genderText(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (text === 'male') return '男';
  if (text === 'female') return '女';
  return '未知';
}

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.surname || '未命名宗族';
}

function branchName(branch: BranchLike) {
  return branch.branchName || '未命名支派';
}

function schemeName(scheme: GenerationSchemeLike) {
  return scheme.schemeName || '未命名字辈方案';
}

function generationOptionValue(item: GenerationItemLike) {
  return `${item.word || ''}@@${item.generationNo || ''}`;
}

function generationLabel(item: GenerationItemLike) {
  return `${item.word || '-'} · 第${item.generationNo || '-'}世`;
}

function generationSelectedValue(word: string, generationNo: string, items: GenerationItemLike[]) {
  if (!word && !generationNo) return '';
  const selected = items.find(item => String(item.word || '') === String(word || '') && String(item.generationNo || '') === String(generationNo || ''));
  return selected ? generationOptionValue(selected) : '';
}

function dateValue(value: string) {
  if (!value) return undefined;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : undefined;
}

function normalizeDateString(value: string | string[]) {
  return Array.isArray(value) ? value[0] || '' : value;
}

export function PersonStep({ notify, onSubmittedReview }: Props) {
  const workspace = useWorkspace();
  const [personForm, setPersonForm] = useState<PersonForm>({ ...defaultPersonForm });
  const [personEvents, setPersonEvents] = useState<PersonEventDraft[]>([]);
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [schemes, setSchemes] = useState<GenerationSchemeLike[]>([]);
  const [generationItems, setGenerationItems] = useState<GenerationItemLike[]>([]);
  const [persons, setPersons] = useState<PersonLike[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [selectedPersonRowKeys, setSelectedPersonRowKeys] = useState<Key[]>([]);
  const [loadingClans, setLoadingClans] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingPersons, setLoadingPersons] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [submittingPersons, setSubmittingPersons] = useState(false);

  const officialBranches = useMemo(() => branches.filter(isOfficial), [branches]);
  const officialSchemes = useMemo(() => schemes.filter(isOfficial), [schemes]);
  const selectedReviewablePersons = useMemo(
    () => persons.filter(person => selectedPersonRowKeys.includes(String(person.id)) && isReviewable(person)),
    [persons, selectedPersonRowKeys]
  );

  function toast(data: unknown, error = false) {
    notify?.(data, error);
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) feedback.error(text);
      else feedback.success(text);
    }
  }

  function patchPerson(key: keyof PersonForm, value: string) {
    setPersonForm(prev => ({ ...prev, [key]: value }));
  }

  function validatePersonForm() {
    if (!workspace.clanId) return '请选择宗族';
    if (!(personForm.branchId || workspace.branchId)) return '请选择已审核通过的所属支派';
    if (!personForm.name.trim()) return '请填写人物姓名';
    if (!personForm.gender) return '请选择性别';
    return '';
  }

  async function loadClans() {
    setLoadingClans(true);
    try {
      const rows = await queryClans();
      setClans(rows);
      if (!workspace.clanId && rows[0]?.id) workspace.setClanId(String(rows[0].id));
    } finally {
      setLoadingClans(false);
    }
  }

  async function loadStepOptions(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setBranches([]);
      setSchemes([]);
      setGenerationItems([]);
      return;
    }
    setLoadingOptions(true);
    try {
      const [branchRows, schemeRows] = await Promise.all([
        queryBranches(sourceClanId).catch(() => []),
        queryGenerationSchemes(sourceClanId).catch(() => [])
      ]);
      setBranches(branchRows);
      setSchemes(schemeRows);
      const nextBranchId = personForm.branchId || workspace.branchId || branchRows.filter(isOfficial)[0]?.id;
      if (nextBranchId) {
        workspace.setBranchId(String(nextBranchId));
        setPersonForm(prev => ({ ...prev, branchId: String(nextBranchId) }));
      }
      const nextScheme = selectedSchemeId
        ? schemeRows.find(scheme => String(scheme.id) === selectedSchemeId)
        : schemeRows.filter(isOfficial).find(scheme => !nextBranchId || String(scheme.branchId || '') === String(nextBranchId)) || schemeRows.filter(isOfficial)[0];
      if (nextScheme?.id) await selectScheme(nextScheme, false);
      else {
        setSelectedSchemeId('');
        setGenerationItems([]);
      }
    } finally {
      setLoadingOptions(false);
    }
  }

  async function loadPersons(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setPersons([]);
      setSelectedPersonRowKeys([]);
      return;
    }
    setLoadingPersons(true);
    try {
      const rows = await queryPersons(sourceClanId);
      setPersons(rows);
      setSelectedPersonRowKeys([]);
    } catch (error) {
      setPersons([]);
      toast({ message: (error as Error).message || '查询人物失败' }, true);
    } finally {
      setLoadingPersons(false);
    }
  }

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => {
    setPersons([]);
    setSelectedPersonRowKeys([]);
    setGenerationItems([]);
    setSelectedSchemeId('');
    void loadStepOptions();
    void loadPersons();
  }, [workspace.clanId]);

  function changeClan(nextClanId: string) {
    workspace.patch({ clanId: nextClanId, branchId: '', personId: '' });
    setPersonForm({ ...defaultPersonForm });
    setPersonEvents([]);
    setBranches([]);
    setSchemes([]);
    setGenerationItems([]);
    setPersons([]);
    setSelectedPersonRowKeys([]);
    setSelectedSchemeId('');
  }

  function changeBranch(nextBranchId: string) {
    workspace.setBranchId(nextBranchId);
    setPersonForm(prev => ({ ...prev, branchId: nextBranchId }));
    const branchScheme = officialSchemes.find(scheme => String(scheme.branchId || '') === String(nextBranchId)) || (officialSchemes.length === 1 ? officialSchemes[0] : null);
    if (branchScheme) void selectScheme(branchScheme);
  }

  async function selectScheme(row: GenerationSchemeLike, showMessage = true) {
    if (!isOfficial(row)) {
      toast({ message: '只能选择已审核通过的字辈方案' }, true);
      return;
    }
    const nextSchemeId = String(row.id || '');
    setSelectedSchemeId(nextSchemeId);
    if (row.branchId) {
      workspace.setBranchId(String(row.branchId));
      setPersonForm(prev => ({ ...prev, branchId: String(row.branchId) }));
    }
    try {
      const rows = await queryGenerationItems(nextSchemeId);
      setGenerationItems(rows);
      if (showMessage) toast({ message: `已选择字辈方案：${schemeName(row)}` });
    } catch (error) {
      setGenerationItems([]);
      toast({ message: (error as Error).message || '查询字辈明细失败' }, true);
    }
  }

  function selectGenerationItem(value: string) {
    const selected = generationItems.find(item => generationOptionValue(item) === value);
    setPersonForm(prev => ({
      ...prev,
      generationWord: selected?.word ? String(selected.word) : '',
      generationNo: selected?.generationNo ? String(selected.generationNo) : ''
    }));
  }

  function buildPersonPayload(form = personForm): CreatePersonPayload {
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

  function resetPersonFormForNext() {
    setPersonForm(prev => ({
      ...defaultPersonForm,
      branchId: prev.branchId || workspace.branchId,
      generationNo: prev.generationNo,
      generationWord: prev.generationWord,
      privacyLevel: prev.privacyLevel,
      dataStatus: prev.dataStatus
    }));
    setPersonEvents([]);
  }

  function resetPersonForm() {
    setPersonForm({ ...defaultPersonForm, branchId: workspace.branchId });
    setPersonEvents([]);
  }

  async function createPerson(continueAdding = false, submit = false) {
    const errorMessage = validatePersonForm();
    if (errorMessage) {
      toast({ message: errorMessage }, true);
      return;
    }
    setSavingPerson(true);
    try {
      await createPersonWithEvents({
        events: personEvents,
        createPerson: () => createPersonApi(workspace.clanId, buildPersonPayload()),
        saveEvents: (personId, events) => replacePersonEvents(personId, events),
        submitReview: submit ? async personId => {
          const task: any = await submitReviewTask({
            clanId: workspace.clanId,
            targetType: 'person',
            targetId: personId,
            comment: '提交人物审核'
          });
          if (task?.id) onSubmittedReview?.(String(task.id));
        } : undefined
      });
      if (continueAdding) resetPersonFormForNext();
      if (submit) {
        toast({ message: '人物及关键事件已保存并提交审核，审核通过后才能建立关系。' });
      } else {
        toast({ message: continueAdding ? '人物及关键事件已保存为草稿，可继续录入；审核通过后才能建立关系。' : '人物及关键事件已保存为草稿，审核通过后才能建立关系。' });
      }
      await loadPersons();
    } catch (error) {
      toast({ message: (error as Error).message || '保存人物及关键事件失败' }, true);
    } finally {
      setSavingPerson(false);
    }
  }

  async function submitSelectedPersons() {
    if (!workspace.clanId || !selectedReviewablePersons.length) return;
    setSubmittingPersons(true);
    try {
      const results = await submitReviewTasks(selectedReviewablePersons.map(person => ({
        clanId: workspace.clanId,
        targetType: 'person',
        targetId: person.id || '',
        comment: '提交人物审核'
      })));
      const { successCount, failedCount } = countSettledResults(results);
      if (successCount) toast({ message: `已提交 ${successCount} 个人物审核` });
      if (failedCount) toast({ message: `${failedCount} 个人物提交失败` }, true);
      await loadPersons();
    } finally {
      setSubmittingPersons(false);
    }
  }

  async function afterDeletePerson(row: PersonLike) {
    const personId = String(row.id || '');
    setSelectedPersonRowKeys(prev => prev.filter(key => String(key) !== personId));
    if (workspace.personId === personId) workspace.setPersonId('');
    await loadPersons();
  }

  function selectPerson(row: PersonLike) {
    if (!isOfficial(row)) {
      toast({ message: '该人物未审核通过，暂不能作为中心人物建立关系' }, true);
      return;
    }
    workspace.setPersonId(String(row.id || ''));
    toast({ message: `已选中人物：${row.name || '未命名人物'}` });
  }

  return (
    <Panel title="录入人物" description="人物保存后默认为草稿；审核通过后才能作为中心人物建立关系。">
      <Form layout="vertical" className="person-step-form">
        <Card size="small" title="宗族上下文" className="person-step-form-card">
          <div className="wizard-form-grid">
            <Form.Item label="适用宗族" required><Select showSearch optionFilterProp="label" value={workspace.clanId} onChange={changeClan} disabled={loadingClans} options={[{ value: '', label: '请选择宗族' }, ...clans.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))]} /></Form.Item>
          </div>
        </Card>

        <Card size="small" title="基本身份" className="person-step-form-card">
          <div className="wizard-form-grid">
            <Form.Item label="姓名" required><Input value={personForm.name} onChange={event => patchPerson('name', event.target.value)} placeholder="请输入人物姓名" /></Form.Item>
            <Form.Item label="性别" required><Select value={personForm.gender} onChange={value => patchPerson('gender', value)} options={genderOptions} /></Form.Item>
            <Form.Item label="谱名"><Input value={personForm.genealogyName} onChange={event => patchPerson('genealogyName', event.target.value)} /></Form.Item>
            <Form.Item label="字号"><Input value={personForm.courtesyName} onChange={event => patchPerson('courtesyName', event.target.value)} /></Form.Item>
            <Form.Item label="别名"><Input value={personForm.aliasName} onChange={event => patchPerson('aliasName', event.target.value)} /></Form.Item>
            <Form.Item label="排行"><Input value={personForm.rankInFamily} onChange={event => patchPerson('rankInFamily', event.target.value)} /></Form.Item>
          </div>
        </Card>

        <Card size="small" title="世系归属" className="person-step-form-card">
          <div className="wizard-form-grid">
            <Form.Item label="所属支派" required extra="只展示已审核通过的支派。"><Select showSearch optionFilterProp="label" value={personForm.branchId || workspace.branchId} onChange={changeBranch} disabled={!workspace.clanId || loadingOptions || !officialBranches.length} options={[{ value: '', label: officialBranches.length ? '请选择已通过支派' : '暂无已通过支派' }, ...officialBranches.map(branch => ({ value: String(branch.id), label: branchName(branch) }))]} /></Form.Item>
            <Form.Item label="字辈方案" extra="选择方案后，可在字辈字段中带出字辈和代次。"><Select showSearch optionFilterProp="label" value={selectedSchemeId} disabled={!workspace.clanId || loadingOptions || !officialSchemes.length} onChange={value => { const selected = officialSchemes.find(scheme => String(scheme.id) === value); if (selected) void selectScheme(selected); else setSelectedSchemeId(''); }} options={[{ value: '', label: officialSchemes.length ? '请选择已通过字辈方案' : '暂无已通过方案' }, ...officialSchemes.map(scheme => ({ value: String(scheme.id), label: schemeName(scheme) }))]} /></Form.Item>
            <Form.Item label="字辈"><Select value={generationSelectedValue(personForm.generationWord, personForm.generationNo, generationItems)} onChange={selectGenerationItem} disabled={!generationItems.length} options={[{ value: '', label: generationItems.length ? '请选择字辈' : '无字辈明细，可先保存人物' }, ...generationItems.map(item => ({ value: generationOptionValue(item), label: generationLabel(item) }))]} /></Form.Item>
            <Form.Item label="代次"><Input value={personForm.generationNo ? `第${personForm.generationNo}世` : '选择字辈后自动带出'} disabled readOnly /></Form.Item>
            <Form.Item label="世系状态"><Select value={personForm.lineageStatus} onChange={value => patchPerson('lineageStatus', value)} options={lineageStatusOptions} /></Form.Item>
            <Form.Item label="是否有后裔"><Select value={personForm.hasDescendant} onChange={value => patchPerson('hasDescendant', value)} options={descendantOptions} /></Form.Item>
          </div>
        </Card>

        <Card size="small" title="生卒与地域" className="person-step-form-card">
          <div className="wizard-form-grid">
            <Form.Item label="出生日期"><DatePicker value={dateValue(personForm.birthDate)} onChange={(_date, value) => patchPerson('birthDate', normalizeDateString(value))} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="出生日期精度"><Select value={personForm.birthDatePrecision} onChange={value => patchPerson('birthDatePrecision', value)} options={personDatePrecisionOptions} /></Form.Item>
            <Form.Item label="是否在世"><Select value={personForm.isLiving} onChange={value => patchPerson('isLiving', value)} options={livingOptions} /></Form.Item>
            <Form.Item label="逝世日期"><DatePicker value={dateValue(personForm.deathDate)} onChange={(_date, value) => patchPerson('deathDate', normalizeDateString(value))} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="逝世日期精度"><Select value={personForm.deathDatePrecision} onChange={value => patchPerson('deathDatePrecision', value)} options={personDatePrecisionOptions} /></Form.Item>
            <Form.Item label="出生地"><Input value={personForm.birthPlace} onChange={event => patchPerson('birthPlace', event.target.value)} /></Form.Item>
            <Form.Item label="居住地"><Input value={personForm.residencePlace} onChange={event => patchPerson('residencePlace', event.target.value)} /></Form.Item>
            <Form.Item label="墓葬地"><Input value={personForm.tombPlace} onChange={event => patchPerson('tombPlace', event.target.value)} /></Form.Item>
          </div>
        </Card>

        <Card size="small" title="生平概况" className="person-step-form-card">
          <div className="wizard-form-grid">
            <Form.Item label="职业"><Input value={personForm.occupation} onChange={event => patchPerson('occupation', event.target.value)} /></Form.Item>
            <Form.Item label="教育程度"><Select value={personForm.education} onChange={value => patchPerson('education', value)} options={personEducationOptions} /></Form.Item>
            <Form.Item label="称号荣誉"><Input value={personForm.titleOrHonor} onChange={event => patchPerson('titleOrHonor', event.target.value)} /></Form.Item>
          </div>
          <Form.Item label="人物传记"><Input.TextArea value={personForm.biography} onChange={event => patchPerson('biography', event.target.value)} rows={4} placeholder="记录人物生平、主要经历与贡献" /></Form.Item>
        </Card>

        <PersonEventEditor title="生平事迹" value={personEvents} onChange={setPersonEvents} disabled={savingPerson} />

        <Card size="small" title="墓志资料" className="person-step-form-card"><Form.Item label="墓志铭"><Input.TextArea value={personForm.epitaph} onChange={event => patchPerson('epitaph', event.target.value)} rows={3} placeholder="记录墓志、碑文或相关摘录" /></Form.Item></Card>

        <Card size="small" title="治理信息" className="person-step-form-card"><div className="wizard-form-grid"><Form.Item label="隐私级别"><Select value={personForm.privacyLevel} onChange={value => patchPerson('privacyLevel', value)} options={privacyLevelOptions} /></Form.Item><Form.Item label="档案状态"><Tag>草稿</Tag></Form.Item></div></Card>

        <Space className="actions antd-actions" wrap>
          <Button type="primary" disabled={savingPerson} loading={savingPerson} onClick={() => void createPerson(true, false)}>保存草稿继续录入</Button>
          <Button disabled={savingPerson} onClick={() => void createPerson(false, false)}>保存草稿</Button>
          <Button disabled={savingPerson} onClick={() => void createPerson(false, true)}>保存并提交审核</Button>
          <Button disabled={savingPerson} onClick={resetPersonForm}>重置</Button>
        </Space>
      </Form>

      <ResultListCard<PersonLike>
        cardClassName="person-step-query-results"
        totalSuffix="个人物"
        description="草稿/已驳回人物可勾选后批量提交审批；已通过人物可选中后用于建立关系。"
        notice={!workspace.clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
        extra={(
          <Space wrap>
            <Button type="primary" disabled={!selectedReviewablePersons.length} loading={submittingPersons} onClick={() => void submitSelectedPersons()}>批量提交审核（{selectedReviewablePersons.length}）</Button>
            <Button loading={loadingPersons} disabled={!workspace.clanId} onClick={() => void loadPersons()}>刷新</Button>
          </Space>
        )}
        size="small"
        bordered
        loading={loadingPersons}
        rowKey={row => String(row.id || '')}
        dataSource={persons}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedPersonRowKeys,
          columnTitle: '勾选',
          columnWidth: 72,
          onChange: keys => setSelectedPersonRowKeys(keys),
          getCheckboxProps: row => ({ disabled: !isReviewable(row) || !row.id })
        }}
        onRow={row => ({ onClick: () => selectPerson(row) })}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '暂无人物数据' : '请选择宗族后查看人物'} /> }}
        columns={[
          { key: 'name', title: '姓名', render: (_value, row) => row.name || '未命名人物' },
          { key: 'gender', title: '性别', width: 90, render: (_value, row) => genderText(row.gender) },
          { key: 'generationNo', title: '代次', width: 100, render: (_value, row) => row.generationNo ? `第${row.generationNo}世` : '-' },
          { key: 'generationWord', title: '字辈', width: 100, render: (_value, row) => row.generationWord || '-' },
          { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
          {
            key: 'actions',
            title: '操作',
            width: 120,
            render: (_value, row) => row.id ? (
              <DraftDeleteButton
                object={row}
                objectName={row.name}
                objectType="人物"
                onDelete={() => deletePersonApi(row.id!)}
                onDeleted={() => afterDeletePerson(row)}
                label="删除草稿"
                buttonProps={{ size: 'small' }}
              />
            ) : null
          }
        ]}
      />
    </Panel>
  );
}
