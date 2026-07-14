import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import { navigateToTracking, normalizeTrackingTarget } from './trackingDeepLink.js';

export type TrackingLinkButtonProps = Omit<ButtonProps, 'href' | 'onClick'> & {
  clanId?: string | number | null;
  targetType?: string | null;
  targetId?: string | number | null;
  reviewTaskId?: string | number | null;
  label?: string;
  stopPropagation?: boolean;
};

export function TrackingLinkButton({
  clanId,
  targetType,
  targetId,
  reviewTaskId,
  label = '查看追踪',
  stopPropagation = true,
  ...buttonProps
}: TrackingLinkButtonProps) {
  const target = normalizeTrackingTarget({ clanId: clanId ?? '', targetType: targetType ?? '', targetId: targetId ?? '', reviewTaskId });
  if (!target) return null;

  return (
    <Button
      {...buttonProps}
      onClick={event => {
        if (stopPropagation) event.stopPropagation();
        navigateToTracking(target);
      }}
    >
      {label}
    </Button>
  );
}
