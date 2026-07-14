import type { OperationLogResponse, TrackingObjectResponse } from '../../shared/api/generated/tracking-types';

export function businessActorText(value?: string | number | null): string;
export function businessLogTargetText(
  log: Partial<OperationLogResponse>,
  targetTypeLabel: (value?: string | null) => string
): string;
export function trackingObjectSelection(
  row: Partial<TrackingObjectResponse>,
  clanId: string | number,
  targetTypeLabel: (value?: string | null) => string
): {
  selection: {
    clanId: string;
    targetType: string;
    targetId: string;
    targetSummary: string;
    reviewTaskId: string;
  };
  summary: string;
};
