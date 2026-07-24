import {
  useEffect,
  useMemo,
  useState } from 'react';
import { Alert,
  Button,
  Card,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { apiClient } from '../../shared/api/client';
import { personEducationOptions, personGenerationLabel, personGenerationOptionValue, personGenerationSelectedValue, selectPersonGeneration } from '../../shared/domain/personFormOptions';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { EMPTY_ENTITY_NAVIGATION_GUARD } from '../../shared/navigation/entityNavigationGuard';
import type { EntityNavigationGuardState } from '../../shared/navigation/entityNavigationGuard';
import { EntityPageBackButton, EntityPageHeader } from '../../shared/ui/EntityPageHeader';
import { toRecordList } from '../../shared/utils/records';
import { PersonEventEditor } from './PersonEventEditor';
import type { PersonEventDraft } from './personEventEditorModel';
import { loadPersonEvents, replacePersonEvents, submitPersonRevisionWithEvents } from './personEventService';
import { savePersonWithEvents } from './personEventSaveFlow';
import {
  normalizePersonDate,
  personGenderOptions,
  personLineageStatusOptions,
  personLivingOptions,
  personPrivacyOptions,
  personStatusColor,
  personStatusText,
  personTriStateOptions,
  toPersonEditForm,
  toPersonUpdatePayload
} from './personEditModel';
import type { PersonDatePrecision, PersonEditForm } from './personEditModel';
import { visiblePersonStatusActions } from './personStatusActions';
import type { PersonStatusAction, PersonStatusActionKey } from './personStatusActions';

import { feedback } from '../../shared/ui/OperationFeedback';

import { PageFeedback } from '../../shared/ui/Feedback';

type Props = {
  personId: string;

  onCancel: () => void;
  onNavigationGuardChange?: (state: EntityNavigationGuardState) => void;
};

type GenerationOptionItem = {
  schemeId: string;
  branchId: string;
  schemeName: string;
  generationNo: string;
  word: string;
};

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function branchLabel(branch: any) {
  return branch.branchName || branch.name || '未命名支派';
}

function generationSchemeLabel(scheme: any) {
  return scheme.schemeName || scheme.name || '未命名字辈方案';
}

function isOfficialGenerationScheme(scheme: any) {
  const status = String(scheme.dataStatus || scheme.status || scheme.verificationStatus || '').toLowerCase();
  return ['official', 'active', 'approved'].includes(status);
}

function isOfficialBranch(branch: any) {
  const status = String(branch.status || branch.dataStatus || branch.verificationStatus || '').trim().toLowerCase();
  return ['official', 'active', 'approved'].includes(status);
}

function normalizedStatus(status: unknown) {
  return String(status || '').trim().toLowerCase();
}

function allowsDirectEventSave(status: unknown) {
  return normalizedStatus(status) === 'draft';
}

function allowsRevisionSubmit(status: unknown) {
  return ['official', 'rejected'].includes(normalizedStatus(status));
}

const personDatePrecisionOptions = [
  { value: 'year', label: '年' },
  { value: 'month', label: '月' },
  { value: 'day', label: '日' },
  { value: 'unknown', label: '未知' }
];

function dateValueProps(value: string | undefined, precision: PersonDatePrecision) {
  if (!value || precision === 'unknown') return { value: null };
  const dateText = precision === 'year' ? `${value}-01-01` : precision === 'month' ? `${value}-01` : value;
  const parsed = dayjs(dateText);
  return { value: parsed.isValid() ? parsed : null };
}

function normalizePickerDate(value: Dayjs | null) {
  return value ? value.format('YYYY-MM-DD') : '';
}

function personEditBackLabel() {
  const returnUrl = window.history.state?.genealogyPersonEditReturnUrl;
  if (typeof returnUrl !== 'string' || !returnUrl) return '返回人物档案';
  try {
    const pathname = new URL(returnUrl, window.location.origin).pathname;
    return /^\/persons\/[^/]+\/?$/.test(pathname) ? '返回人物详情' : '返回人物档案';
  } catch {
    return '返回人物档案';
  }
}

export function PersonEditPage({ personId, onCancel, onNavigationGuardChange }: Props) {
  const workspace = useWorkspace();
  const [form] = Form.useForm<PersonEditForm>();
  const [person, setPerson] = useState<any>();
  const [events, setEvents] = useState<PersonEventDraft[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [generationItems, setGenerationItems] = useState<GenerationOptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<PersonStatusActionKey | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const birthPrecision = Form.useWatch('birthDatePrecision', form) || 'unknown';
  const deathPrecision = Form.useWatch('deathDatePrecision', form) || 'unknown';
  const selectedBranchId = Form.useWatch('branchId', form) || '';
  const selectedGenerationNo = Form.useWatch('generationNo', form) || '';
  const selectedGenerationWord = Form.useWatch('generationWord', form) || '';
  const busy = saving || actionLoading !== null;
  const backLabel = personEditBackLabel();

  const branchOptions = useMemo(
    () => branches.filter(isOfficialBranch).map(branch => ({ value: String(branch.id), label: branchLabel(branch) })),
    [branches]
  );

  const availableGenerationItems = useMemo(
    () => generationItems.filter(item => !selectedBranchId || !item.branchId || item.branchId === selectedBranchId),
    [generationItems, selectedBranchId]
  );

  const generationOptions = useMemo(() => {
    const options = new Map<string, { value: string; label: string }>();
    availableGenerationItems.forEach(item => {
      const value = personGenerationOptionValue(item);
      if (value === '@@') return;
      options.set(value, { value, label: personGenerationLabel(item) });
    });
    return [...options.values()];
  }, [availableGenerationItems]);

  useEffect(() => { void loadPerson(); }, [personId]);

  useEffect(() => {
    onNavigationGuardChange?.({ dirty, busy });
  }, [dirty, busy, onNavigationGuardChange]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty && !busy) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, busy]);

  useEffect(() => () => onNavigationGuardChange?.(EMPTY_ENTITY_NAVIGATION_GUARD), [onNavigationGuardChange]);

  async function loadGenerationOptions(clanId: string) {
    setLoadingGenerations(true);
    setGenerationItems([]);
    try {
      const schemeData = await apiClient.get(`/clans/${clanId}/generation-schemes`).catch(() => []);
      const schemes = toRecordList<any>(schemeData).filter(isOfficialGenerationScheme);
      const itemGroups = await Promise.all(schemes.map(async scheme => {
        const schemeId = String(scheme.id || '');
        if (!schemeId) return [];
        const itemData = await apiClient.get(`/generation-schemes/${schemeId}/items`).catch(() => []);
        return toRecordList<any>(itemData).map(item => ({
          schemeId,
          branchId: String(scheme.branchId || ''),
          schemeName: generationSchemeLabel(scheme),
          generationNo: String(item.generationNo || ''),
          word: String(item.word || '').trim()
        }));
      }));
      setGenerationItems(itemGroups.flat().filter(item => item.word || item.generationNo));
    } finally {
      setLoadingGenerations(false);
    }
  }

  async function loadPerson() {
    setLoading(true);
    setLoadError('');
    setSaveError('');
    setActionError('');
    setSaved(false);
    setDirty(false);
    setGenerationItems([]);
    try {
      const [detail, loadedEvents] = await Promise.all([
        apiClient.get<any>(`/persons/${personId}`),
        loadPersonEvents(personId)
      ]);
      setPerson(detail);
      setEvents(loadedEvents);
      workspace.setPersonId(String(personId));
      form.setFieldsValue(toPersonEditForm(detail));
      const clanId = String(detail?.clanId || detail?.clan?.id || workspace.clanId || '');
      if (clanId) {
        const [branchData] = await Promise.all([
          apiClient.get(`/clans/${clanId}/branches`).catch(() => []),
          loadGenerationOptions(clanId)
        ]);
        setBranches(toRecordList<any>(branchData));
      } else {
        setBranches([]);
        setGenerationItems([]);
      }
      setDirty(false);
    } catch (error) {
      setPerson(undefined);
      setEvents([]);
      setLoadError((error as Error).message || '人物档案加载失败');
    } finally {
      setLoading(false);
    }
  }

  function markChanged() {
    setDirty(true);
    setSaved(false);
  }

  function changeEvents(nextEvents: PersonEventDraft[]) {
    setEvents(nextEvents);
    markChanged();
  }

  function changeGeneration(value?: string) {
    form.setFieldsValue(selectPersonGeneration(value, availableGenerationItems));
    markChanged();
  }

  function changeDate(field: 'birth' | 'death', value: Dayjs | null) {
    const precisionField = field === 'birth' ? 'birthDatePrecision' : 'deathDatePrecision';
    const currentPrecision = form.getFieldValue(precisionField) || 'unknown';
    form.setFieldValue(precisionField, value ? (currentPrecision === 'unknown' ? 'day' : currentPrecision) : 'unknown');
    markChanged();
    void form.validateFields(['deathDate']);
  }

  function changeLiving(value: PersonEditForm['isLiving']) {
    form.setFieldValue('isLiving', value);
    markChanged();
    void form.validateFields(['deathDate']);
  }

  function leavePage() {
    if (busy) return;
    const finishLeave = () => {
      setDirty(false);
      onNavigationGuardChange?.(EMPTY_ENTITY_NAVIGATION_GUARD);
      onCancel();
    };
    if (!dirty) {
      finishLeave();
      return;
    }
    Modal.confirm({
      title: '放弃未保存的修改？',
      content: '当前修改尚未保存，返回后将无法恢复。',
      okText: '放弃修改并返回',
      okButtonProps: { danger: true },
      cancelText: '继续编辑',
      onOk: finishLeave
    });
  }

  async function saveDraft() {
    if (busy) return;
    setSaveError('');
    setActionError('');
    setSaved(false);
    let values: PersonEditForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const status = person?.dataStatus || person?.status;
    if (!allowsDirectEventSave(status) && !allowsRevisionSubmit(status)) {
      setSaveError('人物资料已处于待审核或不可编辑状态，不能重复提交。');
      return;
    }

    setSaving(true);
    try {
      const updated = allowsDirectEventSave(status)
        ? await savePersonWithEvents({
            events,
            savePerson: () => apiClient.put<any>(`/persons/${personId}`, toPersonUpdatePayload(values)),
            saveEvents: async () => replacePersonEvents(personId, events)
          })
        : await submitPersonRevisionWithEvents(personId, toPersonUpdatePayload(values), events);
      setPerson(updated);
      if (allowsDirectEventSave(status)) {
        setEvents(await loadPersonEvents(personId));
      }
      form.setFieldsValue(toPersonEditForm(updated));
      setDirty(false);
      setSaved(true);
      feedback.from({ message: allowsDirectEventSave(status) ? '人物资料及关键事件已保存' : '人物资料及关键事件已提交审核' });
    } catch (error) {
      setDirty(true);
      setSaveError((error as Error).message || '人物资料及关键事件保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function runStatusAction(action: PersonStatusAction) {
    if (busy) return;
    setActionError('');
    setSaved(false);
    setActionLoading(action.key);
    try {
      await apiClient.post(action.endpoint(personId));
      feedback.from({ message: `${action.label}成功` });
      await loadPerson();
    } catch (error) {
      setActionError((error as Error).message || `${action.label}失败`);
    } finally {
      setActionLoading(null);
    }
  }

  function confirmStatusAction(action: PersonStatusAction) {
    if (!action.dangerous) {
      void runStatusAction(action);
      return;
    }
    Modal.confirm({
      title: action.confirmTitle || `确认${action.label}？`,
      content: action.confirmDescription,
      okText: action.label,
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => runStatusAction(action)
    });
  }

  if (loading) return <div className="person-edit-page"><EntityPageBackButton label={backLabel} onBack={leavePage} disabled={busy} /><Card className="person-edit-loading"><Space direction="vertical" align="center" size={16}><Spin size="large" /><Typography.Text type="secondary">正在加载人物档案…</Typography.Text></Space></Card></div>;

  if (loadError || !person) {
    return <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loadError || '人物档案不存在'}><Space><EntityPageBackButton label={backLabel} onBack={leavePage} /><Button type="primary" onClick={() => void loadPerson()}>重新加载</Button></Space></Empty></Card>;
  }

  const personName = display(person.name || person.personName, '未命名人物');
  const personStatus = person.dataStatus || person.status;
  const directEventSave = allowsDirectEventSave(personStatus);
  const revisionSubmit = allowsRevisionSubmit(personStatus);
  const eventEditingDisabled = busy || (!directEventSave && !revisionSubmit);
  const statusActions = visiblePersonStatusActions(personStatus, person.allowedActions);
  const primaryStatusAction = statusActions.find(item => item.action.primary);
  const secondaryStatusActions = statusActions.filter(item => !item.action.primary);
  const moreItems: MenuProps['items'] = secondaryStatusActions.map(item => ({
    key: item.action.key,
    label: item.action.label,
    danger: item.action.dangerous,
    disabled: !item.enabled,
    title: item.reason
  }));

  return (
    <div className="person-edit-page">
      <EntityPageHeader
        backLabel={backLabel}
        onBack={leavePage}
        backDisabled={busy}
        title="编辑人物档案"
        status={<Tag color={personStatusColor(personStatus)}>{personStatusText(personStatus)}</Tag>}
        subtitle={`${personName} · ${display(person.generationWord, '字辈待维护')} · ${person.generationNo ? `第${person.generationNo}世` : '代次待维护'}`}
      />

      {saveError ? <PageFeedback tone="error" title="保存失败" description={saveError} /> : null}
      {actionError ? <PageFeedback tone="error" title="状态操作失败" description={actionError} /> : null}
      {saved ? <PageFeedback tone="success" title={directEventSave ? '人物资料及关键事件已保存' : '人物资料及关键事件已提交审核'} action={<Button size="small" onClick={leavePage}>返回人物档案</Button>} /> : null}
      {revisionSubmit ? <PageFeedback tone="info" title="关键事件将随人物资料审核" description="保存后生成包含人物资料和关键事件的审核快照；审核通过后统一生效，驳回不会改变现有正式事件。" /> : null}

      <Form<PersonEditForm>
        form={form}
        layout="vertical"
        requiredMark="optional"
        disabled={busy}
        className="person-edit-form"
        onValuesChange={markChanged}
      >
        <div className="person-edit-sections">
          <Card title="基本身份"><div className="person-edit-fields"><Form.Item name="name" label="姓名" rules={[{ required: true, whitespace: true, message: '请输入姓名' }]}><Input placeholder="请输入姓名" /></Form.Item><Form.Item name="genealogyName" label="谱名"><Input /></Form.Item><Form.Item name="courtesyName" label="字号"><Input /></Form.Item><Form.Item name="aliasName" label="别名"><Input /></Form.Item><Form.Item name="gender" label="性别"><Select options={personGenderOptions} /></Form.Item><Form.Item name="rankInFamily" label="排行"><Input /></Form.Item></div></Card>

          <Card title="世系归属"><div className="person-edit-fields"><Form.Item name="branchId" label="所属支派"><Select allowClear showSearch optionFilterProp="label" placeholder="请选择支派" options={branchOptions} /></Form.Item><Form.Item name="generationWord" hidden><Input /></Form.Item><Form.Item name="generationNo" hidden><Input /></Form.Item><Form.Item label="字辈" extra="选择字辈后自动带出代次，仅展示已审核通过的字辈方案明细"><Select allowClear showSearch optionFilterProp="label" value={personGenerationSelectedValue(selectedGenerationWord, selectedGenerationNo, availableGenerationItems)} loading={loadingGenerations} disabled={!loadingGenerations && !generationOptions.length} placeholder={loadingGenerations ? '正在加载字辈' : '请选择字辈'} options={generationOptions} onChange={changeGeneration} /></Form.Item><Form.Item label="代次"><Input value={selectedGenerationNo ? `第${selectedGenerationNo}世` : '选择字辈后自动带出'} disabled readOnly /></Form.Item><Form.Item name="lineageStatus" label="世系状态"><Select options={personLineageStatusOptions} /></Form.Item><Form.Item name="hasDescendant" label="是否有后裔"><Select options={personTriStateOptions} /></Form.Item></div></Card>

          <Card title="生卒与地域"><div className="person-edit-fields"><Form.Item name="birthDate" label="出生日期" getValueProps={value => dateValueProps(value, birthPrecision)} normalize={normalizePickerDate} dependencies={['birthDatePrecision']}><DatePicker style={{ width: '100%' }} placeholder="请选择出生日期" onChange={value => changeDate('birth', value)} /></Form.Item><Form.Item name="birthDatePrecision" label="出生日期精度"><Select options={personDatePrecisionOptions} /></Form.Item><Form.Item name="isLiving" label="是否在世"><Select options={personLivingOptions} onChange={changeLiving} /></Form.Item><Form.Item name="deathDate" label="逝世日期" dependencies={['deathDatePrecision', 'birthDate', 'birthDatePrecision', 'isLiving']} getValueProps={value => dateValueProps(value, deathPrecision)} normalize={normalizePickerDate} rules={[({ getFieldValue }) => ({ validator(_, value) { if (getFieldValue('isLiving') === 'true' && value) return Promise.reject(new Error('在世人物不能填写逝世日期')); const birth = normalizePersonDate(getFieldValue('birthDate'), getFieldValue('birthDatePrecision')); const death = normalizePersonDate(value, getFieldValue('deathDatePrecision')); if (birth && death && death < birth.slice(0, death.length)) return Promise.reject(new Error('逝世日期不能早于出生日期')); return Promise.resolve(); } })]}><DatePicker style={{ width: '100%' }} placeholder="请选择逝世日期" onChange={value => changeDate('death', value)} /></Form.Item><Form.Item name="deathDatePrecision" label="逝世日期精度"><Select options={personDatePrecisionOptions} /></Form.Item><Form.Item name="birthPlace" label="出生地"><Input /></Form.Item><Form.Item name="residencePlace" label="居住地"><Input /></Form.Item><Form.Item name="tombPlace" label="墓葬地"><Input /></Form.Item></div></Card>

          <Card title="生平概况"><div className="person-edit-fields"><Form.Item name="occupation" label="职业"><Input /></Form.Item><Form.Item name="education" label="教育程度"><Select options={personEducationOptions} /></Form.Item><Form.Item name="titleOrHonor" label="称号荣誉"><Input /></Form.Item><Form.Item name="biography" label="人物传记" className="person-edit-field--wide"><Input.TextArea rows={6} placeholder="记录人物生平、主要经历与贡献" /></Form.Item></div></Card>

          <PersonEventEditor title="生平事迹" value={events} disabled={eventEditingDisabled} onChange={changeEvents} />

          <Card title="墓志资料"><div className="person-edit-fields"><Form.Item name="epitaph" label="墓志铭" className="person-edit-field--wide"><Input.TextArea rows={4} /></Form.Item></div></Card>

          <Card title="治理信息"><div className="person-edit-fields"><Form.Item name="privacyLevel" label="隐私级别"><Select options={personPrivacyOptions} /></Form.Item><div><Typography.Text type="secondary">档案状态</Typography.Text><div style={{ marginTop: 8 }}><Tag color={personStatusColor(personStatus)}>{personStatusText(personStatus)}</Tag><Typography.Text type="secondary">状态不可通过普通资料保存直接修改</Typography.Text></div></div></div></Card>
        </div>
      </Form>

      <div className="person-edit-actions" aria-label="人物档案编辑操作">
        <Space wrap>
          <Button disabled={busy} onClick={leavePage}>取消</Button>
          <Button loading={saving} disabled={actionLoading !== null || eventEditingDisabled} onClick={() => void saveDraft()}>{directEventSave ? '保存草稿' : '提交审核'}</Button>
          {primaryStatusAction ? <Tooltip title={primaryStatusAction.enabled ? '' : primaryStatusAction.reason}><span><Button type="primary" disabled={!primaryStatusAction.enabled || busy} loading={actionLoading === primaryStatusAction.action.key} onClick={() => confirmStatusAction(primaryStatusAction.action)}>{primaryStatusAction.action.label}</Button></span></Tooltip> : null}
          {secondaryStatusActions.length ? <Dropdown menu={{ items: moreItems, onClick: info => { const selected = secondaryStatusActions.find(item => item.action.key === info.key); if (selected?.enabled) confirmStatusAction(selected.action); } }} disabled={busy}><Button>更多</Button></Dropdown> : null}
        </Space>
      </div>
    </div>
  );
}
