import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Breadcrumb, Button, Card, DatePicker, Empty, Form, Input, Select, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/utils/records';
import {
  personDataStatusOptions,
  personGenderOptions,
  personLineageStatusOptions,
  personPrivacyOptions,
  personStatusColor,
  personStatusText,
  toPersonEditForm,
  toPersonUpdatePayload
} from './personEditModel';
import type { PersonEditForm } from './personEditModel';

type Props = {
  personId: string;
  notify: (data: unknown, error?: boolean) => void;
  onCancel: () => void;
  onSavingChange?: (saving: boolean) => void;
};

type PersonEditFieldName = keyof PersonEditForm;
type PersonEditFieldError = { name: PersonEditFieldName; errors: string[] };

const LEAVE_MESSAGE = '当前有未保存的修改，确定放弃修改并离开吗？';
const PERSON_EDIT_FIELD_NAMES: PersonEditFieldName[] = [
  'branchId', 'name', 'genealogyName', 'courtesyName', 'aliasName', 'gender',
  'generationNo', 'generationWord', 'rankInFamily', 'birthDate', 'birthDatePrecision',
  'deathDate', 'deathDatePrecision', 'isLiving', 'birthPlace', 'residencePlace',
  'occupation', 'education', 'titleOrHonor', 'biography', 'tombPlace', 'epitaph',
  'hasDescendant', 'lineageStatus', 'privacyLevel', 'dataStatus'
];

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function branchLabel(branch: any) {
  return branch.branchName || branch.name || '未命名支派';
}

function dateValueProps(value?: string) {
  return { value: value ? dayjs(value) : null };
}

function normalizeDate(value: Dayjs | null) {
  return value ? value.format('YYYY-MM-DD') : '';
}

function isPersonEditFieldName(name: string): name is PersonEditFieldName {
  return PERSON_EDIT_FIELD_NAMES.includes(name as PersonEditFieldName);
}

function serverFieldErrors(error: unknown): PersonEditFieldError[] {
  const record = error && typeof error === 'object' ? error as Record<string, any> : {};
  const source = record.fieldErrors || record.errors || record.validationErrors || record.response?.data?.fieldErrors;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
  return Object.entries(source)
    .filter(([name, message]) => isPersonEditFieldName(name) && message !== undefined && message !== null)
    .map(([name, message]) => ({
      name: name as PersonEditFieldName,
      errors: [Array.isArray(message) ? String(message[0] || '字段校验失败') : String(message)]
    }));
}

function serverErrorMessage(error: unknown) {
  const record = error && typeof error === 'object' ? error as Record<string, any> : {};
  return String(record.message || record.errorMessage || record.response?.data?.message || '人物档案保存失败');
}

export function PersonEditPage({ personId, notify, onCancel, onSavingChange }: Props) {
  const workspace = useWorkspace();
  const [form] = Form.useForm<PersonEditForm>();
  const [person, setPerson] = useState<any>();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const currentUrlRef = useRef('');
  const allowNextPopRef = useRef(false);

  const branchOptions = useMemo(
    () => branches.map(branch => ({ value: String(branch.id), label: branchLabel(branch) })),
    [branches]
  );

  useEffect(() => {
    void loadPerson();
  }, [personId]);

  useEffect(() => {
    onSavingChange?.(saving);
    return () => onSavingChange?.(false);
  }, [saving, onSavingChange]);

  useEffect(() => {
    currentUrlRef.current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.pushState({ ...window.history.state, personEditGuard: true }, '', currentUrlRef.current);

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty && !saving) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const onPopState = () => {
      if (allowNextPopRef.current) {
        allowNextPopRef.current = false;
        return;
      }
      if (saving) {
        window.history.pushState({ ...window.history.state, personEditGuard: true }, '', currentUrlRef.current);
        notify({ message: '人物档案正在保存，请稍后再离开。' }, true);
        return;
      }
      if (!dirty || window.confirm(LEAVE_MESSAGE)) {
        allowNextPopRef.current = true;
        window.history.back();
        return;
      }
      window.history.pushState({ ...window.history.state, personEditGuard: true }, '', currentUrlRef.current);
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (!dirty || saving) return;
      const target = event.target as HTMLElement | null;
      const menuItem = target?.closest('.ant-menu-item');
      if (!menuItem) return;
      if (window.confirm(LEAVE_MESSAGE)) {
        setDirty(false);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onDocumentClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onDocumentClick, true);
    };
  }, [dirty, saving, notify]);

  async function loadPerson() {
    setLoading(true);
    setLoadError('');
    setSaveError('');
    setSaved(false);
    setDirty(false);
    try {
      const detail = await apiClient.get<any>(`/persons/${personId}`);
      setPerson(detail);
      workspace.setPersonId(String(personId));
      form.setFieldsValue(toPersonEditForm(detail));
      form.setFields([]);

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

  function requestLeave() {
    if (saving) {
      notify({ message: '人物档案正在保存，请稍后再离开。' }, true);
      return;
    }
    if (dirty && !window.confirm(LEAVE_MESSAGE)) return;
    setDirty(false);
    onCancel();
  }

  async function saveDraft() {
    if (saving) return;
    setSaveError('');
    setSaved(false);
    form.setFields(PERSON_EDIT_FIELD_NAMES.map(name => ({ name, errors: [] })));

    let values: PersonEditForm;
    try {
      values = await form.validateFields();
    } catch (validationError) {
      const first = (validationError as any)?.errorFields?.[0]?.name;
      if (first) form.scrollToField(first, { behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    try {
      const updated = await apiClient.put<any>(`/persons/${personId}`, toPersonUpdatePayload(values));
      setPerson(updated);
      form.setFieldsValue(toPersonEditForm(updated));
      setDirty(false);
      setSaved(true);
      notify({ message: '人物档案已保存' });
    } catch (error) {
      const fields = serverFieldErrors(error);
      if (fields.length) {
        form.setFields(fields);
        form.scrollToField(fields[0].name, { behavior: 'smooth', block: 'center' });
      } else {
        setSaveError(serverErrorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="person-edit-loading">
        <Space direction="vertical" align="center" size={16}>
          <Spin size="large" />
          <Typography.Text type="secondary">正在加载人物档案…</Typography.Text>
        </Space>
      </Card>
    );
  }

  if (loadError || !person) {
    return (
      <Card>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loadError || '人物档案不存在'}>
          <Space>
            <Button onClick={requestLeave}>返回人物档案</Button>
            <Button type="primary" onClick={() => void loadPerson()}>重新加载</Button>
          </Space>
        </Empty>
      </Card>
    );
  }

  const personName = display(person.name || person.personName, '未命名人物');
  const personStatus = person.dataStatus || person.status;

  return (
    <div className="person-edit-page">
      <div className="person-edit-header">
        <Breadcrumb items={[{ title: '人物档案' }, { title: personName }, { title: '编辑档案' }]} />
        <div className="person-edit-header-main">
          <div>
            <Space align="center" wrap>
              <Typography.Title level={3}>编辑人物档案</Typography.Title>
              <Tag color={personStatusColor(personStatus)}>{personStatusText(personStatus)}</Tag>
              {dirty ? <Tag color="warning">有未保存修改</Tag> : null}
            </Space>
            <Typography.Paragraph type="secondary">
              {personName} · {display(person.generationWord, '字辈待维护')} · {person.generationNo ? `第${person.generationNo}世` : '代次待维护'}
            </Typography.Paragraph>
          </div>
          <Button disabled={saving} onClick={requestLeave}>返回</Button>
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        message="统一人物档案表单"
        description="所有业务分组统一校验和提交。字段错误会就近显示；存在未保存修改时，离开页面前会请求确认。"
      />

      {saveError ? <Alert type="error" showIcon message="保存失败" description={saveError} /> : null}
      {saved ? (
        <Alert
          type="success"
          showIcon
          message="人物档案已保存"
          description="可以继续修改，或返回人物档案列表查看最新数据。"
          action={<Button size="small" onClick={requestLeave}>返回人物档案</Button>}
        />
      ) : null}

      <Form<PersonEditForm>
        form={form}
        layout="vertical"
        requiredMark="optional"
        disabled={saving}
        className="person-edit-form"
        onValuesChange={() => {
          setDirty(true);
          setSaved(false);
          setSaveError('');
        }}
        onFinish={() => void saveDraft()}
      >
        <div className="person-edit-sections">
          <Card title="基本身份">
            <div className="person-edit-fields">
              <Form.Item name="name" label="姓名" rules={[{ required: true, whitespace: true, message: '请输入姓名' }, { max: 100, message: '姓名不能超过 100 个字符' }]}>
                <Input placeholder="请输入姓名" maxLength={100} />
              </Form.Item>
              <Form.Item name="genealogyName" label="谱名" rules={[{ max: 100, message: '谱名不能超过 100 个字符' }]}><Input maxLength={100} /></Form.Item>
              <Form.Item name="courtesyName" label="字号" rules={[{ max: 100, message: '字号不能超过 100 个字符' }]}><Input maxLength={100} /></Form.Item>
              <Form.Item name="aliasName" label="别名" rules={[{ max: 100, message: '别名不能超过 100 个字符' }]}><Input maxLength={100} /></Form.Item>
              <Form.Item name="gender" label="性别"><Select options={personGenderOptions} /></Form.Item>
            </div>
          </Card>

          <Card title="世系与支派">
            <div className="person-edit-fields">
              <Form.Item name="branchId" label="所属支派">
                <Select allowClear showSearch optionFilterProp="label" placeholder="请选择支派" options={branchOptions} />
              </Form.Item>
              <Form.Item name="generationNo" label="代次" rules={[{ pattern: /^$|^[1-9]\d{0,3}$/, message: '代次请输入 1～9999 的正整数' }]}>
                <Input inputMode="numeric" placeholder="例如：18" maxLength={4} />
              </Form.Item>
              <Form.Item name="generationWord" label="字辈" rules={[{ max: 50, message: '字辈不能超过 50 个字符' }]}><Input maxLength={50} /></Form.Item>
              <Form.Item name="rankInFamily" label="排行" rules={[{ max: 50, message: '排行不能超过 50 个字符' }]}><Input maxLength={50} /></Form.Item>
            </div>
          </Card>

          <Card title="生卒与地点">
            <div className="person-edit-fields">
              <Form.Item name="birthDate" label="出生日期" getValueProps={dateValueProps} normalize={normalizeDate}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="birthDatePrecision" label="出生日期精度">
                <Select options={[{ value: 'year', label: '年' }, { value: 'month', label: '月' }, { value: 'day', label: '日' }, { value: 'unknown', label: '不详' }]} />
              </Form.Item>
              <Form.Item name="isLiving" label="是否在世"><Select options={[{ value: 'true', label: '在世' }, { value: 'false', label: '已故' }]} /></Form.Item>
              <Form.Item
                name="deathDate"
                label="逝世日期"
                dependencies={['birthDate', 'isLiving']}
                getValueProps={dateValueProps}
                normalize={normalizeDate}
                rules={[({ getFieldValue }) => ({
                  validator(_, value) {
                    if (getFieldValue('isLiving') === 'true' && value) return Promise.reject(new Error('在世人物不能填写逝世日期'));
                    const birthDate = getFieldValue('birthDate');
                    if (birthDate && value && dayjs(value).isBefore(dayjs(birthDate), 'day')) return Promise.reject(new Error('逝世日期不能早于出生日期'));
                    return Promise.resolve();
                  }
                })]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="deathDatePrecision" label="逝世日期精度"><Select options={[{ value: 'year', label: '年' }, { value: 'month', label: '月' }, { value: 'day', label: '日' }, { value: 'unknown', label: '不详' }]} /></Form.Item>
              <Form.Item name="birthPlace" label="出生地" rules={[{ max: 200, message: '出生地不能超过 200 个字符' }]}><Input maxLength={200} /></Form.Item>
              <Form.Item name="residencePlace" label="居住地" rules={[{ max: 200, message: '居住地不能超过 200 个字符' }]}><Input maxLength={200} /></Form.Item>
            </div>
          </Card>

          <Card title="生平与墓志">
            <div className="person-edit-fields">
              <Form.Item name="occupation" label="职业" rules={[{ max: 100, message: '职业不能超过 100 个字符' }]}><Input maxLength={100} /></Form.Item>
              <Form.Item name="education" label="教育程度" rules={[{ max: 100, message: '教育程度不能超过 100 个字符' }]}><Input maxLength={100} /></Form.Item>
              <Form.Item name="titleOrHonor" label="称号荣誉" rules={[{ max: 200, message: '称号荣誉不能超过 200 个字符' }]}><Input maxLength={200} /></Form.Item>
              <Form.Item name="biography" label="人物传记" className="person-edit-field--wide" rules={[{ max: 5000, message: '人物传记不能超过 5000 个字符' }]}>
                <Input.TextArea rows={6} maxLength={5000} showCount placeholder="记录人物生平、主要经历与贡献" />
              </Form.Item>
              <Form.Item name="tombPlace" label="墓葬地" rules={[{ max: 200, message: '墓葬地不能超过 200 个字符' }]}><Input maxLength={200} /></Form.Item>
              <Form.Item name="epitaph" label="墓志铭" className="person-edit-field--wide" rules={[{ max: 3000, message: '墓志铭不能超过 3000 个字符' }]}>
                <Input.TextArea rows={4} maxLength={3000} showCount />
              </Form.Item>
            </div>
          </Card>

          <Card title="治理与展示">
            <div className="person-edit-fields">
              <Form.Item name="hasDescendant" label="是否有后裔"><Select options={[{ value: '', label: '未知' }, { value: 'true', label: '是' }, { value: 'false', label: '否' }]} /></Form.Item>
              <Form.Item name="lineageStatus" label="世系状态"><Select options={personLineageStatusOptions} /></Form.Item>
              <Form.Item name="privacyLevel" label="隐私级别"><Select options={personPrivacyOptions} /></Form.Item>
              <Form.Item name="dataStatus" label="档案状态"><Select options={personDataStatusOptions} /></Form.Item>
            </div>
          </Card>
        </div>

        <div className="person-edit-actions" aria-label="人物档案编辑操作">
          <Space wrap>
            <Button disabled={saving} onClick={requestLeave}>取消</Button>
            <Button htmlType="submit" loading={saving} disabled={!dirty}>保存草稿</Button>
            <Tooltip title="提交审核能力尚未接入"><span><Button type="primary" disabled>提交审核</Button></span></Tooltip>
          </Space>
        </div>
      </Form>
    </div>
  );
}
