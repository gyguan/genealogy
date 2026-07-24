import {
  useEffect,
  useRef,
  useState } from 'react';
import { Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Result,
  Row,
  Select,
  Space
} from 'antd';
import type {
  CultureSiteCreateRequest,
  CultureSiteDetailResponse,
  CultureSiteUpdateRequest
} from '../../shared/api/generated/culture-types';
import { CultureEditorShell } from './CultureEditorShell';
import { CulturePersonSelect } from './CulturePersonSelect';
import type { CultureBranchOption } from './cultureLibraryService';
import type { CultureEditorState } from './cultureEditorState';
import { confidenceOptions, privacyOptions, sensitiveOptions } from './cultureOptions';
import { createCultureSite, getCultureSite, updateCultureSite } from './cultureSiteService';

import { feedback } from '../../shared/ui/OperationFeedback';

type CultureSiteFormValues = CultureSiteCreateRequest;

type Props = {
  clanId: string;
  editor: CultureEditorState;
  branches: CultureBranchOption[];
  onCancel: () => void;
  onSaved: (id: number) => void;
  onDirtyChange: (dirty: boolean) => void;
};

const siteTypeOptions = [
  { value: 'ancestral_hall', label: '祠堂' },
  { value: 'ancestral_home', label: '祖居' },
  { value: 'cemetery', label: '墓园' },
  { value: 'memorial', label: '纪念设施' },
  { value: 'other', label: '其他' }
];

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function canEdit(item: CultureSiteDetailResponse) {
  return item.allowedActions.includes('update') || item.allowedActions.includes('request_update');
}

export function CultureSiteEditorPage({ clanId, editor, branches, onCancel, onSaved, onDirtyChange }: Props) {
  const [form] = Form.useForm<CultureSiteFormValues>();
  const branchId = Form.useWatch('branchId', form);
  const requestVersion = useRef(0);
  const [messageApi, messageContext] = message.useMessage();
  const [detail, setDetail] = useState<CultureSiteDetailResponse | null>(null);
  const [loading, setLoading] = useState(editor.mode === 'edit');
  const [loadError, setLoadError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  const branchOptions = branches
    .filter(branch => branch.id)
    .map(branch => ({ value: Number(branch.id), label: branch.name }));

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const version = ++requestVersion.current;
    setSubmitError('');
    setLoadError('');
    setForbidden(false);
    setDirty(false);

    if (editor.mode === 'create') {
      setLoading(false);
      setDetail(null);
      form.resetFields();
      form.setFieldsValue({
        siteType: 'ancestral_hall',
        confidenceLevel: 'unknown',
        privacyLevel: 'clan_only',
        sensitiveLevel: 'normal',
        featuredOnHome: false,
        sortOrder: 0
      });
      return;
    }

    if (!editor.id) {
      setLoading(false);
      setLoadError('缺少需要编辑的文化场所。');
      return;
    }

    setLoading(true);
    getCultureSite(editor.id)
      .then(data => {
        if (version !== requestVersion.current) return;
        setDetail(data);
        if (!canEdit(data)) {
          setForbidden(true);
          return;
        }
        form.resetFields();
        form.setFieldsValue({
          branchId: data.scope.branchId || undefined,
          relatedPersonId: data.relatedPersonId || undefined,
          siteType: data.siteType,
          siteName: data.name,
          addressText: data.addressText || undefined,
          foundedPeriod: data.foundedPeriod || undefined,
          currentStatus: data.currentStatus || undefined,
          summary: data.summary || undefined,
          description: data.description || undefined,
          latitude: data.latitude ?? undefined,
          longitude: data.longitude ?? undefined,
          confidenceLevel: data.confidenceLevel,
          privacyLevel: data.privacyLevel,
          sensitiveLevel: data.sensitiveLevel,
          featuredOnHome: data.featuredOnHome,
          sortOrder: data.sortOrder
        });
      })
      .catch(error => {
        if (version === requestVersion.current) setLoadError(errorText(error, '文化场所加载失败'));
      })
      .finally(() => {
        if (version === requestVersion.current) setLoading(false);
      });

    return () => {
      requestVersion.current += 1;
    };
  }, [editor.id, editor.mode, form, reloadVersion]);

  async function save() {
    if (!clanId || saving || forbidden) return;
    const values = await form.validateFields();
    setSaving(true);
    setSubmitError('');
    try {
      const saved = editor.mode === 'edit' && editor.id && detail
        ? await updateCultureSite(editor.id, { ...values, version: detail.version } as CultureSiteUpdateRequest)
        : await createCultureSite(clanId, values as CultureSiteCreateRequest);
      setDirty(false);
      feedback.success(detail?.dataStatus === 'official' ? '正式场所变更已提交审核' : '文化场所已保存为草稿');
      onSaved(saved.id);
    } catch (error) {
      setSubmitError(errorText(error, '文化场所保存失败'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Card loading title={editor.mode === 'create' ? '新增文化场所' : '正在加载文化场所'} />;
  }

  if (forbidden) {
    return (
      <Result
        status="403"
        title="暂无编辑权限"
        subTitle="当前账号不能修改该文化场所，请返回列表查看允许的操作。"
        extra={<Button onClick={onCancel}>返回文化场所列表</Button>}
      />
    );
  }

  if (loadError) {
    return (
      <Result
        status="error"
        title="文化场所加载失败"
        subTitle={loadError}
        extra={<Space><Button onClick={onCancel}>返回列表</Button><Button type="primary" onClick={() => setReloadVersion(value => value + 1)}>重新加载</Button></Space>}
      />
    );
  }

  const official = detail?.dataStatus === 'official';
  const rejected = detail?.dataStatus === 'rejected';
  const title = editor.mode === 'create' ? '新增文化场所' : official ? '提交正式场所变更申请' : '编辑文化场所';
  const primaryText = editor.mode === 'create' ? '保存草稿' : official ? '提交变更申请' : '保存修改';
  const statusAlert = official ? (
    <Alert type="warning" showIcon message="正式场所不会被直接覆盖" description="本次修改将创建审核任务，审核通过后才会更新正式内容。" />
  ) : rejected ? (
    <Alert type="info" showIcon message="请根据驳回意见修订" description={detail?.review.rejectedReason || '审核方未返回具体驳回说明。'} />
  ) : null;

  return (
    <>
      {messageContext}
      <Form form={form} layout="vertical" disabled={saving} onValuesChange={() => setDirty(true)}>
        <CultureEditorShell
          title={title}
          description="按真实名称、所属范围、地址沿革、关联人物和治理级别维护文化场所；正式内容继续通过审核后生效。"
          statusAlert={statusAlert}
          submitError={submitError}
          saving={saving}
          dirty={dirty}
          primaryText={primaryText}
          primaryDisabled={!clanId}
          onCancel={onCancel}
          onSubmit={() => void save()}
        >
          <Card title="基本信息">
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="siteType" label="场所类型" rules={[{ required: true, message: '请选择场所类型' }]}>
                  <Select options={siteTypeOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="siteName" label="场所名称" rules={[{ required: true, whitespace: true, message: '请输入场所名称' }, { max: 200 }]}>
                  <Input placeholder="例如：敦本堂宗祠" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="所属范围与关联对象">
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="branchId" label="所属支派" extra="不选择表示宗族级文化场所">
                  <Select allowClear showSearch optionFilterProp="label" options={branchOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="relatedPersonId" label="关联人物" extra="输入人物姓名搜索；候选项展示支派和代次，不需要填写人物编号。">
                  <CulturePersonSelect
                    clanId={clanId}
                    branchId={branchId ?? undefined}
                    initialName={detail?.relatedPersonName}
                    placeholder="输入姓名搜索关联人物"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="地址与历史">
            <Row gutter={[16, 0]}>
              <Col xs={24}>
                <Form.Item name="addressText" label="地址">
                  <Input maxLength={500} placeholder="填写当前可披露的业务地址" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="foundedPeriod" label="始建时期">
                  <Input maxLength={200} placeholder="例如：清乾隆年间" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="currentStatus" label="当前状态">
                  <Input maxLength={100} placeholder="例如：存续、重建、遗址、迁建" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="summary" label="摘要">
                  <Input.TextArea rows={3} maxLength={1000} showCount placeholder="概述场所用途、历史价值和当前情况" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="description" label="历史说明">
                  <Input.TextArea rows={8} maxLength={200000} showCount placeholder="记录始建、迁建、修缮、碑记和相关历史" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="坐标信息">
            <Alert type="info" showIcon message="坐标为可选信息" description="仅填写已核实且允许披露的坐标；本页面不提供地图选点。" style={{ marginBottom: 16 }} />
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="latitude" label="纬度" rules={[{ type: 'number', min: -90, max: 90, message: '纬度必须在 -90 到 90 之间' }]}>
                  <InputNumber style={{ width: '100%' }} placeholder="-90 ～ 90" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="longitude" label="经度" rules={[{ type: 'number', min: -180, max: 180, message: '经度必须在 -180 到 180 之间' }]}>
                  <InputNumber style={{ width: '100%' }} placeholder="-180 ～ 180" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="治理与展示">
            <Row gutter={[16, 0]}>
              <Col xs={24} md={8}><Form.Item name="confidenceLevel" label="可信度" rules={[{ required: true, message: '请选择可信度' }]}><Select options={confidenceOptions} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="privacyLevel" label="可见范围" rules={[{ required: true, message: '请选择可见范围' }]}><Select options={privacyOptions} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="sensitiveLevel" label="敏感级别" rules={[{ required: true, message: '请选择敏感级别' }]}><Select options={sensitiveOptions} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="sortOrder" label="展示顺序"><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="featuredOnHome" valuePropName="checked"><Checkbox>首页精选</Checkbox></Form.Item></Col>
            </Row>
          </Card>
        </CultureEditorShell>
      </Form>
    </>
  );
}
