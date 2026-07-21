export const DEFAULT_REVIEW_PAGE_SIZE = 10;
export const REVIEW_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type ReviewPageSize = (typeof REVIEW_PAGE_SIZE_OPTIONS)[number];

function pageSizeValue(search: string) {
  const value = new URLSearchParams(search).get('pageSize');
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && REVIEW_PAGE_SIZE_OPTIONS.includes(parsed as ReviewPageSize)
    ? parsed as ReviewPageSize
    : undefined;
}

export function resolveReviewPageSize(search: string) {
  return pageSizeValue(search) ?? DEFAULT_REVIEW_PAGE_SIZE;
}

export function hasValidReviewPageSize(search: string) {
  return pageSizeValue(search) !== undefined;
}

export function withDefaultReviewPageSize(href: string) {
  const url = new URL(href);
  if (!hasValidReviewPageSize(url.search)) {
    url.searchParams.set('pageSize', String(DEFAULT_REVIEW_PAGE_SIZE));
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
