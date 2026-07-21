import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_REVIEW_PAGE_SIZE,
  REVIEW_PAGE_SIZE_OPTIONS,
  hasValidReviewPageSize,
  resolveReviewPageSize,
  withDefaultReviewPageSize
} from './reviewCenterPagination.js';

test('all review center tabs default to 10 rows', () => {
  assert.equal(DEFAULT_REVIEW_PAGE_SIZE, 10);
  assert.deepEqual(REVIEW_PAGE_SIZE_OPTIONS, [10, 20, 50, 100]);
  for (const tab of ['pending', 'submitted', 'processed']) {
    assert.equal(resolveReviewPageSize(`?reviewTab=${tab}`), 10);
  }
});

test('explicit supported page sizes remain available', () => {
  for (const size of REVIEW_PAGE_SIZE_OPTIONS) {
    assert.equal(resolveReviewPageSize(`?pageSize=${size}`), size);
    assert.equal(hasValidReviewPageSize(`?pageSize=${size}`), true);
  }
});

test('missing or invalid page size is normalized to 10', () => {
  assert.equal(hasValidReviewPageSize(''), false);
  assert.equal(hasValidReviewPageSize('?pageSize=999'), false);
  assert.equal(resolveReviewPageSize('?pageSize=999'), 10);
  assert.equal(
    withDefaultReviewPageSize('https://example.test/?view=reviews&reviewTab=processed#result'),
    '/?view=reviews&reviewTab=processed&pageSize=10#result'
  );
});
