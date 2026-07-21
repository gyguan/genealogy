import { useEffect, useMemo, useState } from 'react';
import { Alert, Breadcrumb, Button, Card, DatePicker, Dropdown, Empty, Form, Input, Modal, Select, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/utils/records';
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

type Props = {
  personId: string;
  notify: (data: unknown, error?: boolean) => void;
  onCancel: () => void;
  onSavingChange?: (saving: boolean) => void;
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

function distinct(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function dateValueProps(value: string | undefined, precision: PersonDatePrecision) {
  if (!value || precision === 'unknown') return { value: null };
  const dateText = precision === 'year' ? `${value}-01-01` : precision === 'month' ? `${value}-01` : value;
  const parsed = dayjs(dateText);
  return { value: parsed.isValid() ? parsed : null };
}

function normalizePickerDate(value: Dayjs | null) {
  return value ? value.format('YYYY-MM-DD') : '';
}

export function PersonEditPage({ personId, notify, onCancel, onSavingChange }: Props) {
  const workspace = useWorkspace();
  const [form] = Form.useForm<PersonEditForm>();
  const [person, setPerson] = useState<any>();
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
  const birthPrecision = Form.useWatch('birthDatePrecision', form) || 'unknown';
  const deathPrecision = Form.useWatch('deathDatePrecision', form) || 'unknown';
  const selectedBranchId = Form.useWatch('branchId', form) || '';
  const selectedGenerationNo = Form.useWatch('generationNo', form) || '';
  const selectedGenerationWord = Form.useWatch('generationWord', form) || '';
  const busy = saving || actionLoading !== null;

  const branchOptions = useMemo(
    () => branches.map(branch => ({ value: String(branch.id), label: branchLabel(branch) })),
    [branches]
  );

  const availableGenerationItems = useMemo(
    () => generationItems.filter(item => !selectedBranchId || !item.branchId || item.branchId === selectedBranchId),
    [generationItems, selectedBranchId]
  );

  const generationWordOptions = useMemo(() => {
    const grouped = new Map<string, string[]>();
    availableGenerationItems.forEach(item => {
      if (!item.word) return;
      grouped.set(item.word, distinct([...(grouped.get(item.word) || []), item.generationNo]));
    });
    const options = [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right, 'zh-CN'))
      .map(([word, generationNos]) => ({
        value: word,
        label: generationNos.length ? `${word} · ${generationNos.map(no => `第${no}世`).join(' / ')}` : word
      }));
    if (selectedGenerationWord && !grouped.has(selectedGenerationWord)) {
      options.unshift({ value: selectedGenerationWord, label: `${selectedGenerationWord}（当前值）` });
    }
    return options;
  }, [availableGenerationItems, selectedGenerationWord]);

  const generationNoOptions = useMemo(() => {
    const grouped = new Map<string, string[]>();
    availableGenerationItems.forEach(item => {
      if (!item.generationNo) return;
      grouped.set(item.generationNo, distinct([...(grouped.get(item.generationNo) || []), item.word]));
    });
    const options = [...grouped.entries()]
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([generationNo, words]) => ({
        value: generationNo,
        label: words.length ? `第${generationNo}世 · ${words.join(' / ')}` : `第${generationNo}世`
      }));
    if (selectedGenerationNo && !grouped.has(selectedGenerationNo)) {
      options.unshift({ value: selectedGenerationNo, label: `第${selectedGenerationNo}世（当前值）` });
    }
    return options;
  }, [availableGenerationItems, selectedGenerationNo]);

  useEffect(() => { void loadPerson(); }, [personId]);

  useEffect(() => {
    onSavingChange?.(busy);
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!busy) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      onSavingChange?.(false);
    };
  }, [busy, onSavingChange]);

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
    setGenerationItems([]);
    try {
      const detail = await apiClient.get<any>(`/persons/${personId}`);
      setPerson(detail);
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
    } catch (error) {
      setPerson(undefined);
      setLoadError((error as Error).message || '人物档案加载失败');
    } finally {
      setLoading(false);
    }
  }

  function changeGenerationWord(value?: string) {
    const nextWord = value || '';
    form.setFieldValue('generationWord', nextWord);
    if (!nextWord) return;
    const matchingGenerationNos = distinct(
      availableGenerationItems.filter(item => item.word === nextWord).map(item => item.generationNo)
    );
    if (matchingGenerationNos.length === 1) form.setFieldValue('generationNo', matchingGenerationNos[0]);
  }

  function changeGenerationNo(value?: string) {
    const nextGenerationNo = value || '';
    form.setFieldValue('generationNo', nextGenerationNo);
    if (!nextGenerationNo) return;
    const matchingWords = distinct(
      availableGenerationItems.filter(item => item.generationNo === nextGenerationNo).map(item => item.word)
    );
    if (matchingWords.length === 1) form.setFieldValue('generationWord', matchingWords[0]);
  }

  function changeDate(field: 'birth' | 'death', value: Dayjs | null) {
    const precisionField = field === 'birth' ? 'birthDatePrecision' : 'deathDatePrecision';
    form.setFieldValue(precisionField, value ? 'day' : 'unknown');
    void form.validateFields(['deathDate']);
  }

  function changeLiving(value: PersonEditForm['isLiving']) {
    form.setFieldValue('isLiving', value);
    void form.validateFields(['deathDate']);
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
    setSaving(true);
    try {
      const updated = await apiClient.put<any>(`/persons/${personId}`, toPersonUpdatePayload(values));
      setPerson(updated);
      form.setFieldsValue(toPersonEditForm(updated));
      setSaved(true);
      notify({ message: '人物资料已保存' });
    } catch (error) {
      setSaveError((error as Error).message || '人物资料保存失败');
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
      notify({ message: `${action.label}成功` });
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

  if (loading) return <Card className="person-edit-loading"><Space direction="vertical" align="center" size={16}><Spin size="large" /><Typography.Text type="secondary">正在加载人物档案…</Typography.Text></Space></Card>;

  if (loadError || !person) {
    return <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loadError || '人物档案不存在'}><Space><Button onClick={onCancel}>返回人物档案</Button><Button type="primary" onClick={() => void loadPerson()}>重新加载</Button></Space></Empty></Card>;
  }

  const personName = display(person.name || person.personName, '未命名人物');
  const personStatus = person.dataStatus || person.status;
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
      <div className="person-edit-header">
        <Breadcrumb items={[{ title: '人物档案' }, { title: personName }, { title: '编辑档案' }]} />
        <div className="person-edit-header-main">
          <div>
            <Space align="center" wrap><Typography.Title level={3}>编辑人物档案</Typography.Title><Tag color={personStatusColor(personStatus)}>{personStatusText(personStatus)}</Tag></Space>
            <Typography.Paragraph type="secondary">{personName} · {display(person.generationWord, '字辈待维护')} · {person.generationNo ? `第${person.generationNo}世` : '代次待维护'}</Typography.Paragraph>
          </div>
          <Button disabled={busy} onClick={onCancel}>返回</Button>
        </div>
      </div>

      <Alert type="info" showIcon message="档案状态由领域动作管理" description="普通资料保存不会修改档案状态。提交审核、撤回、归档和恢复仅在当前状态与权限允许时执行。" />
      {saveError ? <Alert type="error" showIcon message="保存失败" description={saveError} /> : null}
      {actionError ? <Alert type="error" showIcon message="状态操作失败" description={actionError} /> : null}
      {saved ? <Alert type="success" showIcon message="人物资料已保存" description="档案状态未发生变化，可以继续修改或执行合法状态动作。" action={<Button size="small" onClick={onCancel}>返回人物档案</Button>} /> : null}

      <Form<PersonEditForm> form={form} layout="vertical" requiredMark="optional" disabled={busy} className="person-edit-form">
        <div className="person-edit-sections">
          <Card title="基本身份"><div className="person-edit-fields">
            <Form.Item name="name" label="姓名" rules={[{ required: true, whitespace: true, message: '请输入姓名' }]}><Input placeholder="请输入姓名" /></Form.Item>
            <Form.Item name="genealogyName" label="谱名"><Input /></Form.Item>
            <Form.Item name="courtesyName" label="字号"><Input /></Form.Item>
            <Form.Item name="aliasName" label="别名"><Input /></Form.Item>
            <Form.Item name="gender" label="性别"><Select options={personGenderOptions} /></Form.Item>
          </div></Card>

          <Card title="世系与支派"><div className="person-edit-fields">
            <Form.Item name="branchId" label="所属支派"><Select allowClear showSearch optionFilterProp="label" placeholder="请选择支派" options={branchOptions} /></Form.Item>
            <Form.Item name="generationNo" label="代次" extra="仅展示已审核通过的字辈方案明细">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                loading={loadingGenerations}
                disabled={!loadingGenerations && !generationNoOptions.length}
                placeholder={loadingGenerations ? '正在加载代次' : '请选择代次'}
                options={generationNoOptions}
                onChange={changeGenerationNo}
              />
            </Form.Item>
            <Form.Item name="generationWord" label="字辈" extra="选择字辈或代次后，唯一匹配项会自动联动">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                loading={loadingGenerations}
                disabled={!loadingGenerations && !generationWordOptions.length}
                placeholder={loadingGenerations ? '正在加载字辈' : '请选择字辈'}
                options={generationWordOptions}
                onChange={changeGenerationWord}
              />
            </Form.Item>
            <Form.Item name="rankInFamily" label="排行"><Input /></Form.Item>
          </div></Card>

          <Card title="生卒与地点"><div className="person-edit-fields">
            <Form.Item name="birthDatePrecision" hidden><Input /></Form.Item>
            <Form.Item name="deathDatePrecision" hidden><Input /></Form.Item>
            <Form.Item name="birthDate" label="出生日期" getValueProps={value => dateValueProps(value, birthPrecision)} normalize={normalizePickerDate} dependencies={['birthDatePrecision']}>
              <DatePicker style={{ width: '100%' }} placeholder="请选择出生日期" onChange={value => changeDate('birth', value)} />
            </Form.Item>
            <Form.Item name="isLiving" label="是否在世"><Select options={personLivingOptions} onChange={changeLiving} /></Form.Item>
            <Form.Item
              name="deathDate"
              label="逝世日期"
              dependencies={['deathDatePrecision', 'birthDate', 'birthDatePrecision', 'isLiving']}
              getValueProps={value => dateValueProps(value, deathPrecision)}
              normalize={normalizePickerDate}
              rules={[({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue('isLiving') === 'true' && value) return Promise.reject(new Error('在世人物不能填写逝世日期'));
                  const birth = normalizePersonDate(getFieldValue('birthDate'), getFieldValue('birthDatePrecision'));
                  const death = normalizePersonDate(value, getFieldValue('deathDatePrecision'));
                  if (birth && death && death < birth.slice(0, death.length)) return Promise.reject(new Error('逝世日期不能早于出生日期'));
                  return Promise.resolve();
                }
              })]}
            >
              <DatePicker style={{ width: '100%' }} placeholder="请选择逝世日期" onChange={value => changeDate('death', value)} />
            </Form.Item>
            <Form.Item name="birthPlace" label="出生地"><Input /></Form.Item>
            <Form.Item name="residencePlace" label="居住地"><Input /></Form.Item>
          </div></Card>

          <Card title="生平与墓志"><div className="person-edit-fields">
            <Form.Item name="occupation" label="职业"><Input /></Form.Item><Form.Item name="education" label="教育程度"><Input /></Form.Item><Form.Item name="titleOrHonor" label="称号荣誉"><Input /></Form.Item>
            <Form.Item name="biography" label="人物传记" className="person-edit-field--wide"><Input.TextArea rows={6} placeholder="记录人物生平、主要经历与贡献" /></Form.Item>
            <Form.Item name="tombPlace" label="墓葬地"><Input /></Form.Item><Form.Item name="epitaph" label="墓志铭" className="person-edit-field--wide"><Input.TextArea rows={4} /></Form.Item>
          </div></Card>

          <Card title="治理与展示"><div className="person-edit-fields">
            <Form.Item name="hasDescendant" label="是否有后裔"><Select options={personTriStateOptions} /></Form.Item>
            <Form.Item name="lineageStatus" label="世系状态"><Select options={personLineageStatusOptions} /></Form.Item>
            <Form.Item name="privacyLevel" label="隐私级别"><Select options={personPrivacyOptions} /></Form.Item>
            <div><Typography.Text type="secondary">档案状态</Typography.Text><div style={{ marginTop: 8 }}><Tag color={personStatusColor(personStatus)}>{personStatusText(personStatus)}</Tag><Typography.Text type="secondary">状态不可通过普通资料保存直接修改</Typography.Text></div></div>
          </div></Card>
        </div>
      </Form>

      <div className="person-edit-actions" aria-label="人物档案编辑操作">
        <Space wrap>
          <Button disabled={busy} onClick={onCancel}>取消</Button>
          <Button loading={saving} disabled={actionLoading !== null} onClick={() => void saveDraft()}>保存草稿</Button>
          {primaryStatusAction ? (
            <Tooltip title={primaryStatusAction.enabled ? '' : primaryStatusAction.reason}>
              <span>
                <Button
                  type="primary"
                  disabled={!primaryStatusAction.enabled || busy}
                  loading={actionLoading === primaryStatusAction.action.key}
                  onClick={() => confirmStatusAction(primaryStatusAction.action)}
                >
                  {primaryStatusAction.action.label}
                </Button>
              </span>
            </Tooltip>
          ) : null}
          {secondaryStatusActions.length ? (
            <Dropdown
              menu={{
                items: moreItems,
                onClick: info => {
                  const selected = secondaryStatusActions.find(item => item.action.key === info.key);
                  if (selected?.enabled) confirmStatusAction(selected.action);
                }
              }}
              disabled={busy}
            >
              <Button>更多</Button>
            </Dropdown>
          ) : null}
        </Space>
      </div>
    </div>
  );
}
