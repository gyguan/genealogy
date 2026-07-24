import { Button, Space } from 'antd';
import { TrackingLinkButton } from '../../shared/navigation/TrackingLinkButton';

type Props = {
  clanId?: string;
  targetType?: string;
  targetId?: string | number;
  reviewTaskId?: string | number;
  pending: boolean;
  mobile: boolean;
  processing?: boolean;
  onApprove: () => void;
  onReject: () => void;
};

/**
 * 审核详情 Drawer Header 的统一操作区。
 *
 * 这里只承载审核详情相关动作；数据质量检查入口属于列表工具栏，
 * 不应进入详情 Header 或 Drawer Footer。
 */
export function ReviewDetailHeaderActions({
  clanId,
  targetType,
  targetId,
  reviewTaskId,
  pending,
  mobile,
  processing = false,
  onApprove,
  onReject
}: Props) {
  return (
    <Space wrap size={8}>
      <TrackingLinkButton
        clanId={clanId}
        targetType={targetType}
        targetId={targetId}
        reviewTaskId={reviewTaskId}
      />
      {pending ? (
        <>
          <Button
            danger
            disabled={processing}
            style={{ minHeight: mobile ? 44 : undefined }}
            onClick={onReject}
          >
            驳回整改
          </Button>
          <Button
            type="primary"
            loading={processing}
            style={{ minHeight: mobile ? 44 : undefined }}
            onClick={onApprove}
          >
            审核通过
          </Button>
        </>
      ) : null}
    </Space>
  );
}
