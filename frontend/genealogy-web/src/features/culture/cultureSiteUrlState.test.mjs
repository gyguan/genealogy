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

test('reads valid culture site multi-select filters and rejects invalid values', () => {
  const result = readCultureSiteLocation('https://example.test/?view=culture&tab=sites&siteKeyword=%20祠堂%20&siteType=ancestral_hall&siteType=ancestral_home&siteBranch=12&siteBranch=13&siteAddress=杭州&siteCurrentStatus=存续&siteStatus=official&siteStatus=draft&siteSort=updatedAt,desc&sitePage=3&sitePageSize=20&siteItem=99');
  assert.deepEqual(result, {
    search: {
      keyword: '祠堂',
      siteType: ['ancestral_hall', 'ancestral_home'],
      branchId: [12, 13],
      addressText: '杭州',
      currentStatus: '存续',
      dataStatus: ['official', 'draft'],
      sort: 'updatedAt,desc',
      pageNo: 3,
      pageSize: 20
    },
    selectedId: 99
  });

  const invalid = readCultureSiteLocation('https://example.test/?tab=sites&siteType=invalid&siteBranch=0&siteStatus=bad&sitePage=-2&sitePageSize=999');
  assert.equal(invalid.search.keyword, defaultCultureSiteSearch.keyword);
  assert.equal(invalid.search.siteType, undefined);
  assert.equal(invalid.search.branchId, undefined);
  assert.equal(invalid.search.addressText, defaultCultureSiteSearch.addressText);
  assert.equal(invalid.search.currentStatus, defaultCultureSiteSearch.currentStatus);
  assert.equal(invalid.search.dataStatus, undefined);
  assert.equal(invalid.search.sort, defaultCultureSiteSearch.sort);
  assert.equal(invalid.search.pageNo, defaultCultureSiteSearch.pageNo);
  assert.equal(invalid.search.pageSize, defaultCultureSiteSearch.pageSize);
  assert.equal(invalid.selectedId, undefined);
});

test('keeps old single-value culture site links compatible', () => {
  const result = readCultureSiteLocation('https://example.test/?siteType=ancestral_hall&siteBranch=8&siteStatus=official');
  assert.deepEqual(result.search.siteType, ['ancestral_hall']);
  assert.deepEqual(result.search.branchId, [8]);
  assert.deepEqual(result.search.dataStatus, ['official']);
});

test('writes repeated site parameters without removing other tab state', () => {
  const href = buildCultureSiteLocation('https://example.test/?view=culture&tab=sites&cultureKeyword=家训&migrationKeyword=南迁', {
    keyword: '祠堂',
    siteType: ['ancestral_hall', 'ancestral_home'],
    branchId: [8, 9],
    addressText: '宁波',
    currentStatus: '重建',
    dataStatus: ['official', 'draft'],
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
  assert.deepEqual(url.searchParams.getAll('siteType'), ['ancestral_hall', 'ancestral_home']);
  assert.deepEqual(url.searchParams.getAll('siteBranch'), ['8', '9']);
  assert.deepEqual(url.searchParams.getAll('siteStatus'), ['official', 'draft']);
  assert.equal(url.searchParams.get('siteItem'), '66');
});

test('site search key changes with clan and multi-select filters', () => {
  const first = cultureSiteSearchKey('1', defaultCultureSiteSearch);
  const second = cultureSiteSearchKey('2', defaultCultureSiteSearch);
  const third = cultureSiteSearchKey('1', { ...defaultCultureSiteSearch, branchId: [8, 9] });
  assert.notEqual(first, second);
  assert.notEqual(first, third);
});
