import { Alert, Button, Descriptions, Drawer, Empty, Form, Input, InputNumber, List, Modal, Select, Space, Tag, Timeline, Typography } from 'antd';
import type { MigrationEventCreateRequest, MigrationEventDetailResponse } from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { TrackingLinkButton } from '../../shared/navigation/TrackingLinkButton';
import {
  confidenceOptions,
  optionLabel,
  privacyOptions,
  sensitiveOptions,
  statusColor,
  statusOptions
} from './cultureOptions';
import type { MigrationBranchOption, MigrationPersonOption } from './migrationTimelineService';

const { Paragraph, Text, Title } = Typography;

function branchLabel(item: MigrationBranchOption) {
  return item.branchName || item.branchPath || '未命名支派';
}

function personLabel(item: MigrationPersonOption) {
  return item.name || '未命名人物';
}

function allowed(item: MigrationEventDetailResponse | null, ...actions: string[]) {
  return Boolean(item && actions.some(action => item.allowedActions.includes(action)));
}

export function MigrationDetailDrawer(props: {
  open: boolean;
  clanId: string;
  detail: MigrationEventDetailResponse | null;
  trace: TrackingTraceDetailResponse | null;
  loading: boolean;
  traceError?: string;
  actionLoading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSubmitReview: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const detail = props.detail;
  const routeTitle = detail ? `${detail.fromLocation || '未知'} → ${detail.toLocation || '未知'}` : '迁徙事件详情';
  const actions = detail ? (
    <Space wrap>
      {allowed(detail, 'update', 'request_update') ? <Button onClick={props.onEdit}>编辑</Button> : null}
      {allowed(detail, 'submit_review') ? <Button type="primary" loading={props.actionLoading} onClick={props.onSubmitReview}>提交审核</Button> : null}
      {allowed(detail, 'archive', 'request_archive') ? <Button loading={props.actionLoading} onClick={props.onArchive}>归档</Button> : null}
      {allowed(detail, 'delete', 'request_delete') ? <Button danger loading={props.actionLoading} onClick={props.onDelete}>删除</Button> : null}
      <TrackingLinkButton
        clanId={props.clanId}
        targetType="migration_event"
        targetId={detail.id}
        reviewTaskId={detail.review.reviewTaskId}
        label="完整追踪"
      />
    </Space>
  ) : null;

  return (
    <Drawer
      open={props.open}
      width={760}
      title={<Title level={4} style={{ margin: 0 }}>{routeTitle}</Title>}
      extra={actions}
      onClose={props.onClose}
      destroyOnHidden
    >
      {props.loading && !detail ? <Text type="secondary">正在加载迁徙事件详情…</Text> : null}
      {!props.loading && !detail ? <Empty description="事件不存在、已删除或当前无权查看" /> : null}
      {detail ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={statusColor(detail.dataStatus)}>{optionLabel(statusOptions, detail.dataStatus)}</Tag>
            <Tag>{optionLabel(privacyOptions, detail.privacyLevel)}</Tag>
            <Tag>{optionLabel(confidenceOptions, detail.confidenceLevel)}</Tag>
          </Space>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="所属宗族">{detail.scope.clanName}</Descriptions.Item>
            <Descriptions.Item label="所属支派">{detail.scope.branchName || '-'}</Descriptions.Item>
            <Descriptions.Item label="事件顺序">第 {detail.sequenceNo} 段</Descriptions.Item>
            <Descriptions.Item label="迁徙时期">{detail.migrationTimeText || '待考'}</Descriptions.Item>
            <Descriptions.Item label="迁出地">{detail.fromLocation || '待补充'}</Descriptions.Item>
            <Descriptions.Item label="迁入地">{detail.toLocation || '待补充'}</Descriptions.Item>
            <Descriptions.Item label="始迁祖">{detail.founderPersonName || '待补充'}</Descriptions.Item>
            <Descriptions.Item label="敏感级别">{optionLabel(sensitiveOptions, detail.sensitiveLevel)}</Descriptions.Item>
            <Descriptions.Item label="迁徙原因" span={2}>{detail.reason || '待补充'}</Descriptions.Item>
          </Descriptions>
          <div>
            <Title level={5}>迁徙说明</Title>
            <Paragraph className="culture-detail-content">{detail.description || '暂无说明'}</Paragraph>
          </div>
          <div>
            <Title level={5}>来源证据</Title>
            {detail.sources.length ? (
              <List
                bordered
                dataSource={detail.sources}
                renderItem={source => (
                  <List.Item>
                    <List.Item.Meta
                      title={source.sourceName}
                      description={source.excerpt || '当前响应未返回可见摘录'}
                    />
                  </List.Item>
                )}
              />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可见来源；不会据此补造迁徙结论" />}
          </div>
          <div>
            <Title level={5}>审核摘要</Title>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="当前审核状态">{detail.review.status || '暂无审核任务'}</Descriptions.Item>
              <Descriptions.Item label="提交人">{detail.review.submitterName || '-'}</Descriptions.Item>
              <Descriptions.Item label="审核人">{detail.review.reviewerName || '待分配'}</Descriptions.Item>
              <Descriptions.Item label="驳回原因">{detail.review.rejectedReason || '-'}</Descriptions.Item>
            </Descriptions>
          </div>
          {props.traceError ? <Alert type="warning" showIcon message="追踪时间线暂不可用" description={props.traceError} /> : null}
          {props.trace?.timeline?.length ? (
            <div>
              <Title level={5}>版本与操作时间线</Title>
              <Timeline items={props.trace.timeline.map(event => ({
                children: (
                  <Space direction="vertical" size={2}>
                    <Text strong>{event.title}</Text>
                    {event.summary ? <Text>{event.summary}</Text> : null}
                    <Text type="secondary">{event.actorDisplayName || '系统'} · {event.occurredAt || '-'}</Text>
                  </Space>
                )
              }))} />
            </div>
          ) : null}
        </Space>
      ) : null}
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
      okText={!props.item ? '保存草稿' : official ? '提交变更申请' : '保存修改'}
      cancelText="取消"
      confirmLoading={props.saving}
      maskClosable={!props.saving}
      onCancel={props.onCancel}
      onOk={() => form.submit()}
      afterOpenChange={open => {
        if (!open) return;
        form.setFieldsValue(props.item ? {
          branchId: props.item.scope.branchId!,
          sequenceNo: props.item.sequenceNo,
          fromLocation: props.item.fromLocation || '',
          toLocation: props.item.toLocation || '',
          migrationTimeText: props.item.migrationTimeText,
          founderPersonId: props.item.founderPersonId,
          reason: props.item.reason,
          description: props.item.description,
          confidenceLevel: props.item.confidenceLevel,
          privacyLevel: props.item.privacyLevel,
          sensitiveLevel: props.item.sensitiveLevel
        } : {
          sequenceNo: props.defaultSequence,
          confidenceLevel: 'unknown',
          privacyLevel: 'clan_only',
          sensitiveLevel: 'normal'
        });
      }}
      destroyOnHidden
    >
      {official ? (
        <Alert
          type="warning"
          showIcon
          message="正式迁徙不会被直接覆盖"
          description="保存后创建审核申请，审核通过前现有正式时间轴保持不变。"
          style={{ marginBottom: 16 }}
        />
      ) : null}
      {props.item?.dataStatus === 'rejected' ? (
        <Alert
          type="info"
          showIcon
          message="请根据驳回意见修订后重新提交"
          description={props.item.review.rejectedReason || '审核方未返回具体驳回说明。'}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Form form={form} layout="vertical" preserve={false} disabled={props.saving} onFinish={props.onSubmit}>
        <Form.Item name="branchId" label="所属支派" rules={[{ required: true, message: '请选择所属支派' }]}>
          <Select showSearch optionFilterProp="label" options={props.branches.map(item => ({ value: item.id, label: branchLabel(item) }))} />
        </Form.Item>
        <Form.Item name="sequenceNo" label="事件顺序" extra="同一支派的有效迁徙事件顺序不能重复" rules={[{ required: true, message: '请输入事件顺序' }]}>
          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="fromLocation" label="迁出地" rules={[{ required: true, whitespace: true, message: '请输入迁出地' }, { max: 500 }]}>
          <Input placeholder="录入来源中明确记载的迁出地" />
        </Form.Item>
        <Form.Item
          name="toLocation"
          label="迁入地"
          dependencies={['fromLocation']}
          rules={[
            { required: true, whitespace: true, message: '请输入迁入地' },
            { max: 500 },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const from = String(getFieldValue('fromLocation') || '').trim().replace(/\s+/g, ' ').toLowerCase();
                const to = String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
                return from && to && from === to ? Promise.reject(new Error('迁出地和迁入地不能相同')) : Promise.resolve();
              }
            })
          ]}
        >
          <Input placeholder="录入来源中明确记载的迁入地" />
        </Form.Item>
        <Form.Item name="migrationTimeText" label="迁徙时期" rules={[{ max: 200 }]}>
          <Input placeholder="例如：清乾隆年间；不自动换算年代" />
        </Form.Item>
        <Form.Item name="founderPersonId" label="始迁祖" extra="仅可选择当前宗族人物，最终归属由后端校验">
          <Select allowClear showSearch optionFilterProp="label" options={props.persons.map(item => ({ value: item.id, label: personLabel(item) }))} />
        </Form.Item>
        <Form.Item name="reason" label="迁徙原因" rules={[{ max: 1000 }]}><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="description" label="迁徙说明" rules={[{ max: 200000 }]}><Input.TextArea rows={6} showCount maxLength={200000} /></Form.Item>
        <Form.Item name="confidenceLevel" label="可信度" rules={[{ required: true }]}><Select options={confidenceOptions} /></Form.Item>
        <Form.Item name="privacyLevel" label="可见范围" rules={[{ required: true }]}><Select options={privacyOptions} /></Form.Item>
        <Form.Item name="sensitiveLevel" label="敏感级别" rules={[{ required: true }]}><Select options={sensitiveOptions} /></Form.Item>
      </Form>
    </Modal>
  );
}
