export type StatusLike = {
  dataStatus?: unknown;
  status?: unknown;
  verificationStatus?: unknown;
  reviewStatus?: unknown;
  taskStatus?: unknown;
};

const OFFICIAL_STATUSES = ['official', 'active', 'approved'];
const PASSED_STATUSES = [...OFFICIAL_STATUSES, 'passed', 'completed'];
const REJECTED_STATUSES = ['rejected', 'cancelled', 'canceled'];
const REVIEWABLE_STATUSES = ['draft', 'rejected'];

export function statusOf(row: StatusLike | undefined | null) {
  return String(row?.reviewStatus || row?.taskStatus || row?.dataStatus || row?.status || row?.verificationStatus || '').trim().toLowerCase();
}

export function isOfficial(row: StatusLike | undefined | null) {
  const status = statusOf(row);
  return OFFICIAL_STATUSES.includes(status);
}

export function isReviewable(row: StatusLike | undefined | null) {
  return REVIEWABLE_STATUSES.includes(statusOf(row));
}

export function statusText(row: StatusLike | undefined | null, emptyText = '-') {
  const status = statusOf(row);
  const dict: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    pending_review: '待审核',
    official: '已通过',
    active: '已通过',
    approved: '已通过',
    passed: '已通过',
    rejected: '已驳回',
    cancelled: '已取消',
    canceled: '已取消',
    completed: '已完成',
    archived: '已归档'
  };
  return dict[status] || status || emptyText;
}

export function statusColor(row: StatusLike | undefined | null) {
  const status = statusOf(row);
  if (!status || PASSED_STATUSES.includes(status)) return 'success';
  if (REJECTED_STATUSES.includes(status)) return 'error';
  if (status === 'draft') return 'default';
  return 'processing';
}
