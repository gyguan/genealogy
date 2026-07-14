import type {
  CheckTaskResponse,
  OperationLogResponse,
  ReviewDiffResponse,
  ReviewTaskDetailResponse
} from '../../shared/api/generated/tracking-types';

export type TraceSelection = {
  clanId: string;
  targetType: string;
  targetId: string;
  targetSummary: string;
  reviewTaskId: string;
};

export type TraceTarget = {
  targetType: string;
  targetId: string;
};

export type TraceContext = {
  clanId: string;
  reviewTaskId: string;
  selectedTarget: TraceTarget | null;
  businessTarget: TraceTarget | null;
  reviewTaskTrusted: boolean;
  diffTrusted: boolean;
  issues: string[];
};

export type OperationLogScope = TraceTarget & {
  key: 'object' | 'reviewTask';
};

export type TraceCoverage = {
  level: 'complete' | 'partial';
  title: string;
  message: string;
  covered: string[];
  missing: string[];
};

export type TraceResetSnapshot = {
  selection: TraceSelection;
  logs: OperationLogResponse[];
  reviewTask: null;
  reviewDiff: null;
  resolvedTarget: null;
  coverage: null;
};

export type TraceTimelineStatus = 'done' | 'pending' | 'warn' | 'info';

export type TraceTimelineEntry =
  | { kind: 'reviewTask'; key: string; time: string | null; source: 'review'; status: TraceTimelineStatus; task: CheckTaskResponse }
  | { kind: 'reviewResult'; key: string; time: string | null; source: 'review'; status: TraceTimelineStatus; task: CheckTaskResponse }
  | { kind: 'diff'; key: string; time: null; source: 'diff'; status: 'info'; diff: ReviewDiffResponse }
  | { kind: 'log'; key: string; time: string | null; source: 'log'; status: 'info'; log: OperationLogResponse };

export function normalizeTraceTargetType(value: unknown): string;
export function traceSelectionFromLog(log: Partial<OperationLogResponse>, fallbackClanId?: string | number, targetSummary?: string): TraceSelection;
export function traceResetFromLog(log: Partial<OperationLogResponse>, fallbackClanId?: string | number, targetSummary?: string): TraceResetSnapshot;
export function resolveTraceContext(
  selection: TraceSelection,
  detail?: ReviewTaskDetailResponse | null,
  diff?: ReviewDiffResponse | null
): TraceContext;
export function buildOperationLogScopes(context: TraceContext): OperationLogScope[];
export function mergeTraceLogs(...groups: Array<Array<OperationLogResponse | null | undefined>>): OperationLogResponse[];
export function timelineStatusFromReviewStatus(status: unknown): TraceTimelineStatus;
export function buildTraceTimelineEntries(logs: OperationLogResponse[], task?: CheckTaskResponse | null, diff?: ReviewDiffResponse | null): TraceTimelineEntry[];
export function evaluateTraceCoverage(input: {
  context: TraceContext;
  detailState?: 'not_requested' | 'loaded' | 'failed';
  diffState?: 'not_requested' | 'loaded' | 'failed';
  scopeStates?: Array<{ key: OperationLogScope['key']; loaded: boolean }>;
}): TraceCoverage;
