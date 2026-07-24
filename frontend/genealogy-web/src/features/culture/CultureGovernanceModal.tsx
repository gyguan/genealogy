import { Input, Modal, Space, Typography } from 'antd';

import { PageFeedback } from '../../shared/ui/Feedback';

const { Text } = Typography;

export type CultureGovernanceKind = 'review' | 'archive' | 'delete';

export type CultureGovernanceTarget = {
  id: number;
  name: string;
  kind: CultureGovernanceKind;
  reviewRequired?: boolean;
};

type Props = {
  target: CultureGovernanceTarget | null;
  reason: string;
  loading: boolean;
  error?: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

function copy(target: CultureGovernanceTarget) {
  if (target.kind === 'review') {
    return {
      title: `提交“${target.name}”审核`,
      okText: '确认提交',
      consequence: '提交后对象进入待审核状态，审核通过后才成为正式内容。',
      placeholder: '可填写本次提交说明',
      required: false,
      danger: false
    };
  }
  if (target.kind === 'archive') {
    return {
      title: target.reviewRequired ? `申请归档“${target.name}”` : `归档“${target.name}”`,
      okText: target.reviewRequired ? '提交归档申请' : '确认归档',
      consequence: target.reviewRequired
        ? '正式对象不会立即归档，将创建审核申请。'
        : '归档后对象将退出默认展示和正常维护范围。',
      placeholder: '请填写归档原因',
      required: true,
      danger: false
    };
  }
  return {
    title: target.reviewRequired ? `申请删除“${target.name}”` : `删除“${target.name}”`,
    okText: target.reviewRequired ? '提交删除申请' : '确认删除',
    consequence: target.reviewRequired
      ? '正式对象不会立即删除，将创建审核申请。'
      : '删除后将无法继续维护，请确认该对象已不再需要。',
    placeholder: '请填写删除原因或补充说明',
    required: false,
    danger: true
  };
}

export function CultureGovernanceModal(props: Props) {
  const target = props.target;
  if (!target) return null;
  const text = copy(target);
  return (
    <Modal
      open
      title={text.title}
      okText={text.okText}
      cancelText="取消"
      confirmLoading={props.loading}
      maskClosable={!props.loading}
      okButtonProps={{ danger: text.danger }}
      onCancel={props.onCancel}
      onOk={props.onConfirm}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Text>影响对象：{target.name}</Text>
        <PageFeedback tone={text.danger ? 'error' : target.kind === 'archive' ? 'warning' : 'info'} title={text.consequence} />
        {props.error ? <PageFeedback tone="error" title="操作失败，当前输入已保留" description={props.error} /> : null}
        <Input.TextArea
          value={props.reason}
          onChange={event => props.onReasonChange(event.target.value)}
          rows={4}
          maxLength={500}
          showCount
          placeholder={text.placeholder}
          aria-label={text.required ? '操作原因（必填）' : '操作说明'}
        />
        {text.required && !props.reason.trim() ? <Text type="secondary">归档操作必须填写原因。</Text> : null}
      </Space>
    </Modal>
  );
}
