import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');

test('review center adds pageSize=10 only when page size is absent', () => {
  assert.match(source, /url\.searchParams\.get\('view'\) !== 'reviewCenter'/);
  assert.match(source, /url\.searchParams\.has\('pageSize'\)/);
  assert.match(source, /url\.searchParams\.set\('pageSize', '10'\)/);
  assert.match(source, /installReviewCenterDefaultPageSize\(\)/);
});

test('review page keeps existing page size options', () => {
  const reviewSource = readFileSync(new URL('./ReviewCenterPage.tsx', import.meta.url), 'utf8');
  assert.match(reviewSource, /const PAGE_SIZE_OPTIONS = \[10, 20, 50, 100\];/);
});
