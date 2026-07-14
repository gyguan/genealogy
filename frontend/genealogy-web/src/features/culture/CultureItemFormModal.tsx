import { useEffect } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import type {
  CultureItemCreateRequest,
  CultureItemDetailResponse,
  CultureItemUpdateRequest
} from '../../shared/api/generated/culture-types';
import type { CultureBranchOption } from './cultureLibraryService';
import { categoryOptions, confidenceOptions, privacyOptions, sensitiveOptions } from './cultureOptions';

export type CultureItemFormValues = CultureItemCreateRequest & { version?: number };

type Props = {
  open: boolean;
  item: CultureItemDetailResponse | null;
  branches: CultureBranchOption[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: CultureItemCreateRequest | CultureItemUpdateRequest) => Promise<void>;
};

function branchLabel(branch: CultureBranchOption) {
  return branch.branchName || branch.branchPath || '未命名支派';
}

export function CultureItemFormModal({ open, item, branches, saving, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<CultureItemFormValues>();
  const official = item?.dataStatus === 'official';

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(item ? {
      branchId: item.scope.branchId ?? undefined,
      category: item.category,
      title: item.title,
      summary: item.summary ?? undefined,
      content: item.content ?? undefined,
      historicalPeriod: item.historicalPeriod ?? undefined,
      locationText: item.locationText ?? undefined,
      confidenceLevel: item.confidenceLevel,
      privacyLevel: item.privacyLevel,
      sensitiveLevel: item.sensitiveLevel,
      featuredOnHome: item.featuredOnHome,
      sortOrder: item.sortOrder,
      version: item.version
    } : {
      category: 'other',
      confidenceLevel: 'unknown',
      privacyLevel: 'clan_only',
      sensitiveLevel: 'normal',
      featuredOnHome: false,
      sortOrder: 0
    });
  }, [form, item, open]);

  async function finish(values: CultureItemFormValues) {
    try {
      if (item) {
        await onSubmit({ ...values, version: item.version } as CultureItemUpdateRequest);
      } else {
        const { version: _version, ...createValues } = values;
        await onSubmit(createValues as CultureItemCreateRequest);
      }
    } catch {
      // Parent keeps the modal open and has already shown the backend error.
    }
  }

  const submitText = !item ? '保存草稿' : official ? '提交变更申请' : '保存修改';

  return (
    <Modal
      open={open}
      title={!item ? '新增文化资料' : official ? '申请变更正式文化资料' : '编辑文化资料'}
      width={760}
      okText={submitText}
      cancelText="取消"
      confirmLoading={saving}
      maskClosable={!saving}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      {official ? (
        <Alert
          type="warning"
          showIcon
          message="正式资料不会被直接覆盖"
          description="保存后将创建变更审核申请；审核通过前，当前正式内容保持不变。"
          style={{ marginBottom: 16 }}
        />
      ) : null}
      {item?.dataStatus === 'rejected' ? (
        <Alert
          type="info"
          showIcon
          message="请根据驳回意见修订后重新提交审核"
          description={item.review.rejectedReason || '审核方未返回具体驳回说明。'}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Form form={form} layout="vertical" onFinish={finish} disabled={saving} preserve={false}>
        <Form.Item name="title" label="资料标题" rules={[{ required: true, message: '请输入资料标题' }, { max: 200 }]}>
          <Input placeholder="例如：敦本堂堂号源流" />
        </Form.Item>
        <Form.Item name="category" label="资料分类" rules={[{ required: true, message: '请选择资料分类' }]}>
          <Select options={categoryOptions} />
        </Form.Item>
        <Form.Item name="branchId" label="所属支派" extra="不选择表示宗族级文化资料">
          <Select allowClear showSearch optionFilterProp="label" options={branches.filter(item => item.id).map(branch => ({ value: branch.id, label: branchLabel(branch) }))} />
        </Form.Item>
        <Form.Item name="summary" label="摘要" rules={[{ max: 1000 }]}>
          <Input.TextArea rows={3} showCount maxLength={1000} placeholder="概述资料内容、价值和适用范围" />
        </Form.Item>
        <Form.Item name="content" label="正文" rules={[{ max: 200000 }]}>
          <Input.TextArea rows={10} showCount maxLength={200000} placeholder="录入真实文化资料正文；封存或敏感内容请设置相应可见范围" />
        </Form.Item>
        <Form.Item name="historicalPeriod" label="历史时期" rules={[{ max: 200 }]}>
          <Input placeholder="例如：清代中期" />
        </Form.Item>
        <Form.Item name="locationText" label="相关地点" rules={[{ max: 500 }]}>
          <Input placeholder="例如：湖南长沙某支祠堂" />
        </Form.Item>
        <Form.Item name="confidenceLevel" label="可信度" rules={[{ required: true }]}>
          <Select options={confidenceOptions} />
        </Form.Item>
        <Form.Item name="privacyLevel" label="可见范围" rules={[{ required: true }]}>
          <Select options={privacyOptions} />
        </Form.Item>
        <Form.Item name="sensitiveLevel" label="敏感级别" rules={[{ required: true }]}>
          <Select options={sensitiveOptions} />
        </Form.Item>
        <Form.Item name="sortOrder" label="展示顺序" rules={[{ required: true }]}>
          <InputNumber min={0} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="featuredOnHome" label="首页精选" valuePropName="checked" extra="正式资料的精选变化同样需要审核">
          <Switch checkedChildren="精选" unCheckedChildren="普通" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
