export type TrackingTarget = {
  clanId: string | number;
  targetType: string;
  targetId: string | number;
  reviewTaskId?: string | number | null;
};

export type NormalizedTrackingTarget = {
  clanId: string;
  targetType: 'person' | 'relationship' | 'source' | 'branch' | 'culture_item';
  targetId: string;
  reviewTaskId: string;
};

export const TRACKABLE_TARGET_TYPES: readonly NormalizedTrackingTarget['targetType'][];
export function normalizeTrackingTargetType(value: unknown): NormalizedTrackingTarget['targetType'] | '';
export function normalizeTrackingTarget(input?: Partial<TrackingTarget>): NormalizedTrackingTarget | null;
export function buildTrackingDeepLink(currentHref: string, input: TrackingTarget): string;
export function navigateToTracking(input: TrackingTarget, browser?: Window): boolean;
