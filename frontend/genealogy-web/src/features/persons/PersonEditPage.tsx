import { useEffect, useMemo, useState } from 'react';
import { Alert, Breadcrumb, Button, Card, DatePicker, Empty, Form, Input, Select, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/utils/records';
import {
  normalizePersonDate,
  personDataStatusOptions,
  personDatePrecisionOptions,
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

type Props = {
  personId: string;
  notify: (data: unknown, error?: boolean) => void;
  onCancel: () => void;
  onSavingChange?: (saving: boolean) => void;
};

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function branchLabel(branch: any) {
  return branch.branchName || branch.name || '未命名支派';
}

function datePickerMode(precision: PersonDatePrecision): 'year' | 'month' | 'date' {
  if (precision === 'year') return 'year';
  if (precision === 'month') return 'month';
  return 'date';
}

function dateValueProps(value: string | undefined, precision: PersonDatePrecision) {
  if (!value || precision === 'unknown') return { value: null };
  const dateText = precision === 'year' ? `${value}-01-01` : precision === 'month' ? `${value}-01` : value;
  const parsed = dayjs(dateText);
  return { value: parsed.isValid() ? parsed : null };
}

function normalizePickerDate(value: Dayjs | null, precision: PersonDatePrecision) {
  if (!value || precision === 'unknown') return '';
  if (precision === 'year') return value.format('YYYY');
  if (precision === 'month') return value.format('YYYY-MM');
  return value.format('YYYY-MM-DD');
}

export function PersonEditPage({ personId, notify, onCancel, onSavingChange }: Props) {
  const workspace = useWorkspace();
  const [form] = Form.useForm<PersonEditForm>();
  const [person, setPerson] = useState<any>();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const birthPrecision = Form.useWatch('birthDatePrecision', form) || 'unknown';
  const deathPrecision = Form.useWatch('deathDatePrecision', form) || 'unknown';
  const isLiving = Form.useWatch('isLiving', form);

  const branchOptions = useMemo(
    () => branches.map(branch => ({ value: String(branch.id), label: branchLabel(branch) })),
    [branches]
  );

  useEffect(() => { void loadPerson(); }, [personId]);

  useEffect(() => {
    onSavingChange?.(saving);
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!saving) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      onSavingChange?.(false);
    };
  }, [saving, onSavingChange]);

  async function loadPerson() {
    setLoading(true);
    setLoadError('');
    setSaveError('');
    setSaved(false);
    try {
      const detail = await apiClient.get<any>(`/persons/${personId}`);
      setPerson(detail);
      workspace.setPersonId(String(personId));
      form.setFieldsValue(toPersonEditForm(detail));
      const clanId = String(detail?.clanId || detail?.clan?.id || workspace.clanId || '');
      if (clanId) {
        const branchData = await apiClient.get(`/clans/${clanId}/branches`).catch(() => []);
        setBranches(toRecordList<any>(branchData));
      } else {
        setBranches([]);
      }
    } catch (error) {
      setPerson(undefined);
      setLoadError((error as Error).message || '人物档案加载失败');
    } finally {
      setLoading(false);
    }
  }

  function changePrecision(field: 'birth' | 'death', precision: PersonDatePrecision) {
    const dateField = field === 'birth' ? 'birthDate' : 'deathDate';
    const precisionField = field === 'birth' ? 'birthDatePrecision' : 'deathDatePrecision';
    const currentDate = form.getFieldValue(dateField);
    form.setFieldsValue({
      [precisionField]: precision,
      [dateField]: normalizePersonDate(currentDate, precision) || ''
    } as Partial<PersonEditForm>);
    void form.validateFields(['deathDate']);
  }

  function changeLiving(value: PersonEditForm['isLiving']) {
    form.setFieldValue('isLiving', value);
    void form.validateFields(['deathDate']);
  }

  async function saveDraft() {
    if (saving) return;
    setSaveError('');
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
      notify({ message: '人物档案已保存' });
    } catch (error) {
      setSaveError((error as Error).message || '人物档案保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card className="person-edit-loading"><Space direction="vertical" align="center" size={16}><Spin size="large" /><Typography.Text type="secondary">正在加载人物档案…</Typography.Text></Space></Card>;

  if (loadError || !person) {
    return <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loadError || '人物档案不存在'}><Space><Button onClick={onCancel}>返回人物档案</Button><Button type="primary" onClick={() => void loadPerson()}>重新加载</Button></Space></Empty></Card>;
  }

  const personName = display(person.name || person.personName, '未命名人物');
  const personStatus = person.dataStatus || person.status;

  return (
    <div className="person-edit-page">
      <div className="person-edit-header">
        <Breadcrumb items={[{ title: '人物档案' }, { title: personName }, { title: '编辑档案' }]} />
        <div className="person-edit-header-main">
          <div>
            <Space align="center" wrap><Typography.Title level={3}>编辑人物档案</Typography.Title><Tag color={personStatusColor(personStatus)}>{personStatusText(personStatus)}</Tag></Space>
            <Typography.Paragraph type="secondary">{personName} · {display(person.generationWord, '字辈待维护')} · {person.generationNo ? `第${person.generationNo}世` : '代次待维护'}</Typography.Paragraph>
          </div>
          <Button disabled={saving} onClick={onCancel}>返回</Button>
        </div>
      </div>

      <Alert type="info" showIcon message="日期与三态字段按原始语义保存" description="仅知年份或月份时无需补齐日期；未知、否、是会分别保存为 null、false、true。" />
      {saveError ? <Alert type="error" showIcon message="保存失败" description={saveError} /> : null}
      {saved ? <Alert type="success" showIcon message="人物档案已保存" description="可以继续修改，或返回人物档案列表查看最新数据。" action={<Button size="small" onClick={onCancel}>返回人物档案</Button>} /> : null}

      <Form<PersonEditForm> form={form} layout="vertical" requiredMark="optional" disabled={saving} className="person-edit-form">
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
            <Form.Item name="generationNo" label="代次"><Input inputMode="numeric" placeholder="例如：18" /></Form.Item>
            <Form.Item name="generationWord" label="字辈"><Input /></Form.Item>
            <Form.Item name="rankInFamily" label="排行"><Input /></Form.Item>
          </div></Card>

          <Card title="生卒与地点"><div className="person-edit-fields">
            <Form.Item name="birthDatePrecision" label="出生日期精度"><Select options={personDatePrecisionOptions} onChange={value => changePrecision('birth', value)} /></Form.Item>
            <Form.Item name="birthDate" label="出生日期" getValueProps={value => dateValueProps(value, birthPrecision)} normalize={value => normalizePickerDate(value, birthPrecision)} dependencies={['birthDatePrecision']}>
              <DatePicker picker={datePickerMode(birthPrecision)} disabled={birthPrecision === 'unknown'} style={{ width: '100%' }} placeholder={birthPrecision === 'unknown' ? '日期不详' : '请选择出生日期'} />
            </Form.Item>
            <Form.Item name="isLiving" label="是否在世"><Select options={personLivingOptions} onChange={changeLiving} /></Form.Item>
            <Form.Item name="deathDatePrecision" label="逝世日期精度"><Select options={personDatePrecisionOptions} onChange={value => changePrecision('death', value)} /></Form.Item>
            <Form.Item
              name="deathDate"
              label="逝世日期"
              dependencies={['deathDatePrecision', 'birthDate', 'birthDatePrecision', 'isLiving']}
              getValueProps={value => dateValueProps(value, deathPrecision)}
              normalize={value => normalizePickerDate(value, deathPrecision)}
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
              <DatePicker picker={datePickerMode(deathPrecision)} disabled={deathPrecision === 'unknown'} style={{ width: '100%' }} placeholder={deathPrecision === 'unknown' ? '日期不详' : '请选择逝世日期'} />
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
            <Form.Item name="dataStatus" label="档案状态"><Select options={personDataStatusOptions} /></Form.Item>
          </div></Card>
        </div>
      </Form>

      <div className="person-edit-actions" aria-label="人物档案编辑操作"><Space wrap><Button disabled={saving} onClick={onCancel}>取消</Button><Button loading={saving} onClick={() => void saveDraft()}>保存草稿</Button><Tooltip title="提交审核能力尚未接入"><span><Button type="primary" disabled>提交审核</Button></span></Tooltip></Space></div>
    </div>
  );
}
