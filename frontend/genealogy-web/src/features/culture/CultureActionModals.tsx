import { Input, Modal, Typography } from 'antd';
import type { CultureItemSummaryResponse } from '../../shared/api/generated/culture-types';

import { PageFeedback } from '../../shared/ui/Feedback';

const { Text } = Typography;

type Props = {
  reviewTarget: CultureItemSummaryResponse | null;
  reviewComment: string;
  archiveTarget: CultureItemSummaryResponse | null;
  archiveReason: string;
  loading: boolean;
  onReviewCommentChange: (value: string) => void;
  onArchiveReasonChange: (value: string) => void;
  onCancelReview: () => void;
  onConfirmReview: () => void;
  onCancelArchive: () => void;
  onConfirmArchive: () => void;
};

export function CultureActionModals(props: Props) {
  const archiveNeedsReview = Boolean(props.archiveTarget?.allowedActions.includes('request_archive'));
  return (
    <>
      <Modal
        open={Boolean(props.reviewTarget)}
        title="提交文化资料审核"
        okText="确认提交"
        cancelText="取消"
        confirmLoading={props.loading}
        maskClosable={!props.loading}
        onCancel={props.onCancelReview}
        onOk={props.onConfirmReview}
      >
        <Text>资料：{props.reviewTarget?.title}</Text>
        <PageFeedback tone="info" title="提交后资料进入待审核状态，审核通过后才成为正式内容。" style={{ margin: '12px 0' }} />
        <Input.TextArea
          value={props.reviewComment}
          onChange={event => props.onReviewCommentChange(event.target.value)}
          maxLength={500}
          showCount
          rows={4}
          placeholder="可填写本次提交说明"
        />
      </Modal>

      <Modal
        open={Boolean(props.archiveTarget)}
        title={archiveNeedsReview ? '申请归档正式文化资料' : '归档文化资料'}
        okText={archiveNeedsReview ? '提交归档申请' : '确认归档'}
        cancelText="取消"
        confirmLoading={props.loading}
        maskClosable={!props.loading}
        onCancel={props.onCancelArchive}
        onOk={props.onConfirmArchive}
      >
        <Text>影响对象：{props.archiveTarget?.title}</Text>
        <PageFeedback
          tone="warning"
          title={archiveNeedsReview ? '正式资料不会立即归档，将创建审核申请。' : '归档后资料将退出正常维护和默认展示。'}
          style={{ margin: '12px 0' }}
        />
        <Input.TextArea
          value={props.archiveReason}
          onChange={event => props.onArchiveReasonChange(event.target.value)}
          maxLength={500}
          showCount
          rows={4}
          placeholder="请填写归档原因"
        />
      </Modal>
    </>
  );
}
