import { Alert, Descriptions, Drawer, Empty, Form, Input, InputNumber, List, Modal, Select, Space, Timeline, Typography } from 'antd';
import type { MigrationEventCreateRequest, MigrationEventDetailResponse } from '../../shared/api/generated/culture-types';
import { TrackingLinkButton } from '../../shared/navigation/TrackingLinkButton';
import { confidenceOptions, optionLabel, privacyOptions, sensitiveOptions } from './cultureOptions';
import type { MigrationBranchOption, MigrationPersonOption } from './migrationTimelineService';

const { Paragraph, Title } = Typography;

function branchLabel(item: MigrationBranchOption) {
  return item.branchName || item.branchPath || '未命名支派';
}

function personLabel(item: MigrationPersonOption) {
  return item.displayName || item.fullName || item.personName || '未命名人物';
}

export function MigrationDetailDrawer(props: {
  open: boolean;
  clanId: string;
  detail: MigrationEventDetailResponse | null;
  trace: any;
  onClose: () => void;
}) {
  const detail = props.detail;
  return (
    <Drawer
      open={props.open}
      width={720}
      title={<Title level={4} style={{ margin: 0 }}>{detail ? `${detail.fromLocation || '未知'} → ${detail.toLocation || '未知'}` : '迁徙事件详情'}</Title>}
      onClose={props.onClose}
    >
      {!detail ? <Empty description="事件不存在、已删除或当前无权查看" /> : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="所属支派">{detail.scope.branchName || '-'}</Descriptions.Item>
            <Descriptions.Item label="事件顺序">第 {detail.sequenceNo} 段</Descriptions.Item>
            <Descriptions.Item label="迁出地">{detail.fromLocation || '待补充'}</Descriptions.Item>
            <Descriptions.Item label="迁入地">{detail.toLocation || '待补充'}</Descriptions.Item>
            <Descriptions.Item label="迁徙时期">{detail.migrationTimeText || '待考'}</Descriptions.Item>
            <Descriptions.Item label="始迁祖">{detail.founderPersonName || '待补充'}</Descriptions.Item>
            <Descriptions.Item label="可信度">{optionLabel(confidenceOptions, detail.confidenceLevel)}</Descriptions.Item>
            <Descriptions.Item label="可见范围">{optionLabel(privacyOptions, detail.privacyLevel)}</Descriptions.Item>
            <Descriptions.Item label="迁徙原因" span={2}>{detail.reason || '待补充'}</Descriptions.Item>
          </Descriptions>
          <div><Title level={5}>说明</Title><Paragraph>{detail.description || '暂无说明'}</Paragraph></div>
          <div>
            <Title level={5}>来源证据</Title>
            {detail.sources.length ? <List bordered dataSource={detail.sources} renderItem={source => <List.Item><List.Item.Meta title={source.sourceName} description={source.excerpt || '未返回可见摘录'} /></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可见来源；不会据此补造迁徙结论" />}
          </div>
          {props.trace?.timeline?.length ? <div><Title level={5}>审核与追踪</Title><Timeline items={props.trace.timeline.map((event: any) => ({ children: `${event.title}${event.summary ? `：${event.summary}` : ''}` }))} /></div> : null}
          <TrackingLinkButton clanId={props.clanId} targetType="migration_event" targetId={detail.id} reviewTaskId={detail.review.reviewTaskId} label="完整追踪" />
        </Space>
      )}
    </Drawer>
  );
}

export function MigrationEventFormModal(props: {
  open: boolean;
  item: MigrationEventDetailResponse | null;
  branches: MigrationBranchOption[];
  persons: MigrationPersonOption[];
  saving: boolean;
  defaultSequence: number;
  onCancel: () => void;
  onSubmit: (values: MigrationEventCreateRequest) => Promise<void>;
}) {
  const [form] = Form.useForm<MigrationEventCreateRequest>();
  const official = props.item?.dataStatus === 'official';

  return (
    <Modal
      open={props.open}
      width={760}
      title={!props.item ? '新增迁徙事件' : official ? '申请变更正式迁徙事件' : '编辑迁徙事件'}
      okText={official ? '提交变更申请' : '保存'}
      confirmLoading={props.saving}
      onCancel={props.onCancel}
      onOk={() => form.submit()}
      afterOpenChange={open => {
        if (!open) return;
        form.setFieldsValue(props.item ? {
          branchId: props.item.scope.branchId!, sequenceNo: props.item.sequenceNo,
          fromLocation: props.item.fromLocation, toLocation: props.item.toLocation,
          migrationTimeText: props.item.migrationTimeText, founderPersonId: props.item.founderPersonId,
          reason: props.item.reason, description: props.item.description,
          confidenceLevel: props.item.confidenceLevel, privacyLevel: props.item.privacyLevel,
          sensitiveLevel: props.item.sensitiveLevel
        } : { sequenceNo: props.defaultSequence, confidenceLevel: 'unknown', privacyLevel: 'clan_only', sensitiveLevel: 'normal' });
      }}
      destroyOnHidden
    >
      {official ? <Alert type="warning" showIcon message="正式迁徙不会被直接覆盖" description="保存后创建审核申请，审核通过前现有正式时间轴保持不变。" style={{ marginBottom: 16 }} /> : null}
      <Form form={form} layout="vertical" preserve={false} onFinish={props.onSubmit}>
        <Form.Item name="branchId" label="所属支派" rules={[{ required: true, message: '请选择所属支派' }]}><Select showSearch optionFilterProp="label" options={props.branches.map(item => ({ value: item.id, label: branchLabel(item) }))} /></Form.Item>
        <Form.Item name="sequenceNo" label="事件顺序" rules={[{ required: true }]}><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="fromLocation" label="迁出地" rules={[{ required: true, message: '请输入迁出地' }, { max: 500 }]}><Input /></Form.Item>
        <Form.Item name="toLocation" label="迁入地" rules={[{ required: true, message: '请输入迁入地' }, { max: 500 }]}><Input /></Form.Item>
        <Form.Item name="migrationTimeText" label="迁徙时期" rules={[{ max: 200 }]}><Input placeholder="例如：清乾隆年间；不自动换算年代" /></Form.Item>
        <Form.Item name="founderPersonId" label="始迁祖"><Select allowClear showSearch optionFilterProp="label" options={props.persons.map(item => ({ value: item.id, label: personLabel(item) }))} /></Form.Item>
        <Form.Item name="reason" label="迁徙原因" rules={[{ max: 1000 }]}><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="description" label="迁徙说明" rules={[{ max: 200000 }]}><Input.TextArea rows={5} /></Form.Item>
        <Form.Item name="confidenceLevel" label="可信度" rules={[{ required: true }]}><Select options={confidenceOptions} /></Form.Item>
        <Form.Item name="privacyLevel" label="可见范围" rules={[{ required: true }]}><Select options={privacyOptions} /></Form.Item>
        <Form.Item name="sensitiveLevel" label="敏感级别" rules={[{ required: true }]}><Select options={sensitiveOptions} /></Form.Item>
      </Form>
    </Modal>
  );
}
