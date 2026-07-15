import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.culture-shell-test/features/culture/migrationEventUrlState.js');
const { buildMigrationLocation, defaultMigrationSearch, readMigrationLocation } = await import(pathToFileURL(modulePath).href);

test('reads migration filters, paging and detail location', () => {
  const location = readMigrationLocation('https://example.test/?view=culture&tab=migrations&migrationKeyword=%E5%8D%97%E8%BF%81&migrationBranch=8&migrationFrom=%E6%B1%9F%E8%A5%BF&migrationTo=%E5%B9%BF%E4%B8%9C&migrationTime=%E6%98%8E%E4%BB%A3&migrationStatus=official&migrationSort=updatedAt%2Cdesc&migrationPage=3&migrationPageSize=20&migrationItem=91');
  assert.deepEqual(location, {
    search: {
      keyword: '南迁',
      branchId: 8,
      fromLocation: '江西',
      toLocation: '广东',
      migrationTimeText: '明代',
      dataStatus: 'official',
      sort: 'updatedAt,desc',
      pageNo: 3,
      pageSize: 20
    },
    selectedId: 91
  });
});

test('normalizes invalid values and preserves sibling tab parameters', () => {
  const location = readMigrationLocation('https://example.test/?view=culture&tab=migrations&migrationStatus=invalid&migrationPage=0&migrationPageSize=200');
  assert.equal(location.search.keyword, defaultMigrationSearch.keyword);
  assert.equal(location.search.dataStatus, undefined);
  assert.equal(location.search.pageNo, 1);
  assert.equal(location.search.pageSize, 10);
  assert.equal(location.search.sort, defaultMigrationSearch.sort);

  const next = buildMigrationLocation('https://example.test/?view=culture&tab=migrations&culturePage=2&sitePage=5', {
    ...defaultMigrationSearch,
    keyword: '迁粤',
    branchId: 12,
    pageNo: 4
  }, 27);
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'culture');
  assert.equal(url.searchParams.get('tab'), 'migrations');
  assert.equal(url.searchParams.get('culturePage'), '2');
  assert.equal(url.searchParams.get('sitePage'), '5');
  assert.equal(url.searchParams.get('migrationKeyword'), '迁粤');
  assert.equal(url.searchParams.get('migrationBranch'), '12');
  assert.equal(url.searchParams.get('migrationPage'), '4');
  assert.equal(url.searchParams.get('migrationItem'), '27');
});
