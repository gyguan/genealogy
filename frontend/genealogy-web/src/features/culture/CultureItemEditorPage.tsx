import { useEffect, useRef, useState } from 'react';
import { Alert, Card, Checkbox, Col, Form, Input, InputNumber, Result, Row, Select, Space, message } from 'antd';
import type {
  CultureItemCreateRequest,
  CultureItemDetailResponse,
  CultureItemUpdateRequest
} from '../../shared/api/generated/culture-types';
import { CultureEditorShell } from './CultureEditorShell';
import type { CultureEditorState } from './cultureEditorState';
import type { CultureBranchOption } from './cultureLibraryService';
import { createCultureItem, getCultureItem, updateCultureItem } from './cultureLibraryService';
import { categoryOptions, confidenceOptions, privacyOptions, sensitiveOptions } from './cultureOptions';

type CultureItemFormValues = CultureItemCreateRequest;

type Props = {
  clanId: string;
  editor: CultureEditorState;
  branches: CultureBranchOption[];
  onCancel: () => void;
  onSaved: (id: number) => void;
  onDirtyChange: (dirty: boolean) => void;
};

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function branchLabel(branch: CultureBranchOption) {
  return branch.branchName || branch.branchPath || '未命名支派';
}

function canEdit(item: CultureItemDetailResponse) {
  return item.allowedActions.includes('update') || item.allowedActions.includes('request_update');
}

export function CultureItemEditorPage({ clanId, editor, branches, onCancel, onSaved, onDirtyChange }: Props) {
  const [form] = Form.useForm<CultureItemFormValues>();
  const requestVersion = useRef(0);
  const [messageApi, messageContext] = message.useMessage();
  const [detail, setDetail] = useState<CultureItemDetailResponse | null>(null);
  const [loading, setLoading] = useState(editor.mode === 'edit');
  const [loadError, setLoadError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

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
        category: 'other',
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
      setLoadError('缺少需要编辑的文化资料。');
      return;
    }

    setLoading(true);
    getCultureItem(editor.id)
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
          category: data.category,
          title: data.title,
          summary: data.summary || undefined,
          content: data.content || undefined,
          historicalPeriod: data.historicalPeriod || undefined,
          locationText: data.locationText || undefined,
          confidenceLevel: data.confidenceLevel,
          privacyLevel: data.privacyLevel,
          sensitiveLevel: data.sensitiveLevel,
          featuredOnHome: data.featuredOnHome,
          sortOrder: data.sortOrder
        });
      })
      .catch(error => {
        if (version === requestVersion.current) setLoadError(errorText(error, '文化资料加载失败'));
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
        ? await updateCultureItem(editor.id, { ...values, version: detail.version } as CultureItemUpdateRequest)
        : await createCultureItem(clanId, values as CultureItemCreateRequest);
      setDirty(false);
      messageApi.success(detail?.dataStatus === 'official' ? '正式资料变更已提交审核' : '文化资料已保存为草稿');
      onSaved(saved.id);
    } catch (error) {
      setSubmitError(errorText(error, '文化资料保存失败'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card loading title={editor.mode === 'create' ? '新增文化资料' : '正在加载文化资料'} />;

  if (forbidden) {
    return <Result status="403" title="暂无编辑权限" subTitle="当前账号不能修改该文化资料，请返回列表查看允许的操作。" extra={<button onClick={onCancel}>返回文化资料列表</button>} />;
  }

  if (loadError) {
    return <Result status="error" title="文化资料加载失败" subTitle={loadError} extra={<Space><button onClick={onCancel}>返回列表</button><button onClick={() => setReloadVersion(value => value + 1)}>重新加载</button></Space>} />;
  }

  const official = detail?.dataStatus === 'official';
  const rejected = detail?.dataStatus === 'rejected';
  const title = editor.mode === 'create' ? '新增文化资料' : official ? '申请变更正式文化资料' : '编辑文化资料';
  const primaryText = editor.mode === 'create' ? '保存草稿' : official ? '提交变更申请' : '保存修改';
  const statusAlert = official ? (
    <Alert type="warning" showIcon message="正式资料不会被直接覆盖" description="本次修改将创建审核任务，审核通过后才会更新正式内容。" />
  ) : rejected ? (
    <Alert type="info" showIcon message="请根据驳回意见修订" description={detail?.review.rejectedReason || '审核方未返回具体驳回说明。'} />
  ) : null;

  return (
    <>
      {messageContext}
      <Form form={form} layout="vertical" disabled={saving} onValuesChange={() => setDirty(true)}>
        <CultureEditorShell
          title={title}
          description="按真实业务语义维护文化资料，正式内容通过审核后生效。"
          statusAlert={statusAlert}
          submitError={submitError}
          saving={saving}
          dirty={dirty}
          primaryText={primaryText}
          primaryDisabled={!clanId}
          onCancel={onCancel}
          onSubmit={() => void save()}
        >
          <Card title="基础信息">
            <Row gutter={[16, 0]}>
              <Col xs={24} md={16}><Form.Item name="title" label="资料标题" rules={[{ required: true, whitespace: true, message: '请输入资料标题' }, { max: 200 }]}><Input placeholder="例如：敦本堂堂号源流" /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="category" label="资料分类" rules={[{ required: true, message: '请选择资料分类' }]}><Select options={categoryOptions} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="branchId" label="所属支派" extra="不选择表示宗族级文化资料"><Select allowClear showSearch optionFilterProp="label" options={branches.filter(branch => branch.id).map(branch => ({ value: branch.id, label: branchLabel(branch) }))} /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item name="historicalPeriod" label="历史时期" rules={[{ max: 200 }]}><Input placeholder="例如：清代中期" /></Form.Item></Col>
              <Col xs={24} md={6}><Form.Item name="locationText" label="相关地点" rules={[{ max: 500 }]}><Input placeholder="例如：湖南长沙" /></Form.Item></Col>
            </Row>
          </Card>

          <Card title="正文内容">
            <Form.Item name="summary" label="摘要" rules={[{ max: 1000 }]}><Input.TextArea rows={3} showCount maxLength={1000} placeholder="概述资料内容、价值和适用范围" /></Form.Item>
            <Form.Item name="content" label="正文" rules={[{ max: 200000 }]}><Input.TextArea rows={12} showCount maxLength={200000} placeholder="录入真实文化资料正文；封存或敏感内容请设置相应可见范围" /></Form.Item>
          </Card>

          <Card title="治理与展示">
            <Row gutter={[16, 0]}>
              <Col xs={24} md={8}><Form.Item name="confidenceLevel" label="可信度" rules={[{ required: true, message: '请选择可信度' }]}><Select options={confidenceOptions} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="privacyLevel" label="可见范围" rules={[{ required: true, message: '请选择可见范围' }]}><Select options={privacyOptions} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="sensitiveLevel" label="敏感级别" rules={[{ required: true, message: '请选择敏感级别' }]}><Select options={sensitiveOptions} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="sortOrder" label="展示顺序" rules={[{ required: true, message: '请输入展示顺序' }]}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="featuredOnHome" valuePropName="checked"><Checkbox>首页精选</Checkbox></Form.Item></Col>
            </Row>
          </Card>
        </CultureEditorShell>
      </Form>
    </>
  );
}
