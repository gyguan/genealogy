import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.culture-shell-test/features/culture/cultureSiteUrlState.js');
const {
  buildCultureSiteLocation,
  cultureSiteSearchKey,
  defaultCultureSiteSearch,
  readCultureSiteLocation
} = await import(pathToFileURL(modulePath).href);

test('reads valid culture site filters and rejects invalid values', () => {
  const result = readCultureSiteLocation('https://example.test/?view=culture&tab=sites&siteKeyword=%20祠堂%20&siteType=ancestral_hall&siteBranch=12&siteAddress=杭州&siteCurrentStatus=存续&siteStatus=official&siteSort=updatedAt,desc&sitePage=3&sitePageSize=20&siteItem=99');
  assert.deepEqual(result, {
    search: {
      keyword: '祠堂',
      siteType: 'ancestral_hall',
      branchId: 12,
      addressText: '杭州',
      currentStatus: '存续',
      dataStatus: 'official',
      sort: 'updatedAt,desc',
      pageNo: 3,
      pageSize: 20
    },
    selectedId: 99
  });

  const invalid = readCultureSiteLocation('https://example.test/?tab=sites&siteType=invalid&siteStatus=bad&sitePage=-2&sitePageSize=999');
  assert.deepEqual(invalid.search, defaultCultureSiteSearch);
  assert.equal(invalid.selectedId, undefined);
});

test('writes site state without removing other tab state', () => {
  const href = buildCultureSiteLocation('https://example.test/?view=culture&tab=sites&cultureKeyword=家训&migrationKeyword=南迁', {
    keyword: '祠堂',
    siteType: 'ancestral_hall',
    branchId: 8,
    addressText: '宁波',
    currentStatus: '重建',
    dataStatus: 'official',
    sort: 'updatedAt,desc',
    pageNo: 2,
    pageSize: 20
  }, 66);
  const url = new URL(href, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'culture');
  assert.equal(url.searchParams.get('tab'), 'sites');
  assert.equal(url.searchParams.get('cultureKeyword'), '家训');
  assert.equal(url.searchParams.get('migrationKeyword'), '南迁');
  assert.equal(url.searchParams.get('siteKeyword'), '祠堂');
  assert.equal(url.searchParams.get('siteItem'), '66');
});

test('site search key changes with clan and filters', () => {
  const first = cultureSiteSearchKey('1', defaultCultureSiteSearch);
  const second = cultureSiteSearchKey('2', defaultCultureSiteSearch);
  const third = cultureSiteSearchKey('1', { ...defaultCultureSiteSearch, addressText: '绍兴' });
  assert.notEqual(first, second);
  assert.notEqual(first, third);
});
