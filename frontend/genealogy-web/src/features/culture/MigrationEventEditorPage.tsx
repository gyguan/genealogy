import {
  useEffect,
  useRef,
  useState } from 'react';
import { Alert,
  Button,
  Card,
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
  MigrationEventCreateRequest,
  MigrationEventDetailResponse,
  MigrationEventUpdateRequest
} from '../../shared/api/generated/culture-types';
import { CultureEditorShell } from './CultureEditorShell';
import { CulturePersonSelect } from './CulturePersonSelect';
import type { CultureBranchOption } from './cultureLibraryService';
import type { CultureEditorState } from './cultureEditorState';
import { confidenceOptions, privacyOptions, sensitiveOptions } from './cultureOptions';
import { createMigrationEvent, getMigrationEvent, updateMigrationEvent } from './migrationEventService';

import { feedback } from '../../shared/ui/OperationFeedback';

type MigrationFormValues = MigrationEventCreateRequest;

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

function canEdit(item: MigrationEventDetailResponse) {
  return item.allowedActions.includes('update') || item.allowedActions.includes('request_update');
}

export function MigrationEventEditorPage({ clanId, editor, branches, onCancel, onSaved, onDirtyChange }: Props) {
  const [form] = Form.useForm<MigrationFormValues>();
  const branchId = Form.useWatch('branchId', form);
  const requestVersion = useRef(0);
  
  const [detail, setDetail] = useState<MigrationEventDetailResponse | null>(null);
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
        sequenceNo: 1,
        confidenceLevel: 'unknown',
        privacyLevel: 'clan_only',
        sensitiveLevel: 'normal'
      });
      return;
    }

    if (!editor.id) {
      setLoading(false);
      setLoadError('缺少需要编辑的迁徙事件。');
      return;
    }

    setLoading(true);
    getMigrationEvent(editor.id)
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
          sequenceNo: data.sequenceNo,
          fromLocation: data.fromLocation || undefined,
          toLocation: data.toLocation || undefined,
          migrationTimeText: data.migrationTimeText || undefined,
          founderPersonId: data.founderPersonId || undefined,
          reason: data.reason || undefined,
          description: data.description || undefined,
          confidenceLevel: data.confidenceLevel,
          privacyLevel: data.privacyLevel,
          sensitiveLevel: data.sensitiveLevel
        });
      })
      .catch(error => {
        if (version === requestVersion.current) setLoadError(errorText(error, '迁徙事件加载失败'));
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
        ? await updateMigrationEvent(editor.id, { ...values, version: detail.version } as MigrationEventUpdateRequest)
        : await createMigrationEvent(clanId, values as MigrationEventCreateRequest);
      setDirty(false);
      feedback.success(detail?.dataStatus === 'official' ? '正式迁徙变更已提交审核' : '迁徙事件已保存为草稿');
      onSaved(saved.id);
    } catch (error) {
      setSubmitError(errorText(error, '迁徙事件保存失败'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Card loading title={editor.mode === 'create' ? '新增迁徙事件' : '正在加载迁徙事件'} />;
  }

  if (forbidden) {
    return (
      <Result
        status="403"
        title="暂无编辑权限"
        subTitle="当前账号不能修改该迁徙事件，请返回列表查看允许的操作。"
        extra={<Button onClick={onCancel}>返回迁徙列表</Button>}
      />
    );
  }

  if (loadError) {
    return (
      <Result
        status="error"
        title="迁徙事件加载失败"
        subTitle={loadError}
        extra={<Space><Button onClick={onCancel}>返回列表</Button><Button type="primary" onClick={() => setReloadVersion(value => value + 1)}>重新加载</Button></Space>}
      />
    );
  }

  const official = detail?.dataStatus === 'official';
  const rejected = detail?.dataStatus === 'rejected';
  const title = editor.mode === 'create' ? '新增迁徙事件' : official ? '提交正式迁徙变更申请' : '编辑迁徙事件';
  const primaryText = editor.mode === 'create' ? '保存草稿' : official ? '提交变更申请' : '保存修改';
  const statusAlert = official ? (
    <Alert type="warning" showIcon message="正式迁徙事件不会被直接覆盖" description="本次修改将创建审核任务，审核通过后才会更新正式内容。" />
  ) : rejected ? (
    <Alert type="info" showIcon message="请根据驳回意见修订" description={detail?.review.rejectedReason || '审核方未返回具体驳回说明。'} />
  ) : null;

  return (
    <>
      
      <Form form={form} layout="vertical" disabled={saving} onValuesChange={() => setDirty(true)}>
        <CultureEditorShell
          title={title}
          description="按真实支派、迁徙路线、历史时期和始迁祖维护迁徙事实；保存后继续遵循现有审核规则。"
          statusAlert={statusAlert}
          submitError={submitError}
          saving={saving}
          dirty={dirty}
          primaryText={primaryText}
          primaryDisabled={!clanId}
          onCancel={onCancel}
          onSubmit={() => void save()}
        >
          <Card title="迁徙范围">
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="branchId" label="所属支派" rules={[{ required: true, message: '请选择支派' }]}>
                  <Select showSearch optionFilterProp="label" options={branchOptions} placeholder="请选择迁徙事件所属支派" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="sequenceNo" label="迁徙顺序" rules={[{ required: true, message: '请输入迁徙顺序' }]}>
                  <InputNumber min={1} max={100000} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="路线与时期">
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="fromLocation" label="迁出地" rules={[{ required: true, whitespace: true, message: '请输入迁出地' }]}>
                  <Input maxLength={500} placeholder="例如：江西吉安" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="toLocation" label="迁入地" rules={[{ required: true, whitespace: true, message: '请输入迁入地' }]}>
                  <Input maxLength={500} placeholder="例如：湖南长沙" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="migrationTimeText" label="历史时期">
                  <Input maxLength={200} placeholder="例如：明洪武年间" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="始迁祖与原因">
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="founderPersonId" label="始迁祖" extra="输入人物姓名搜索；候选项展示支派和代次，不需要填写人物编号。">
                  <CulturePersonSelect
                    clanId={clanId}
                    branchId={branchId}
                    initialName={detail?.founderPersonName}
                    placeholder="输入姓名搜索始迁祖"
                  />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="reason" label="迁徙原因">
                  <Input.TextArea rows={3} maxLength={1000} showCount placeholder="记录迁居、避乱、任职、经商等有依据的原因" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="详细说明">
            <Form.Item name="description" label="迁徙说明">
              <Input.TextArea rows={8} maxLength={200000} showCount placeholder="补充迁徙过程、定居背景和可追溯说明" />
            </Form.Item>
          </Card>

          <Card title="治理与展示">
            <Row gutter={[16, 0]}>
              <Col xs={24} md={8}><Form.Item name="confidenceLevel" label="可信度" rules={[{ required: true, message: '请选择可信度' }]}><Select options={confidenceOptions} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="privacyLevel" label="可见范围" rules={[{ required: true, message: '请选择可见范围' }]}><Select options={privacyOptions} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="sensitiveLevel" label="敏感级别" rules={[{ required: true, message: '请选择敏感级别' }]}><Select options={sensitiveOptions} /></Form.Item></Col>
            </Row>
          </Card>
        </CultureEditorShell>
      </Form>
    </>
  );
}
