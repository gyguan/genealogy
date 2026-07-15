import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.culture-shell-test/features/culture/cultureUrlState.js');
const { buildCultureLocation, defaultCultureSearch, readCultureLocation } = await import(pathToFileURL(modulePath).href);

test('reads valid culture item query and detail state', () => {
  const location = readCultureLocation('https://example.test/?view=culture&tab=items&cultureKeyword=%E5%AE%B6%E8%AE%AD&cultureCategory=family_instruction&cultureBranch=7&cultureStatus=official&culturePrivacy=branch_only&cultureHasSource=true&cultureSort=title%2Casc&culturePage=3&culturePageSize=20&cultureItem=88');
  assert.deepEqual(location, {
    search: {
      keyword: '家训',
      category: 'family_instruction',
      branchId: 7,
      dataStatus: 'official',
      privacyLevel: 'branch_only',
      hasSource: true,
      featuredOnHome: undefined,
      sort: 'title,asc',
      pageNo: 3,
      pageSize: 20
    },
    selectedItemId: 88
  });
});

test('falls back from invalid values without touching other tab state', () => {
  const location = readCultureLocation('https://example.test/?view=culture&tab=items&cultureCategory=invalid&culturePage=0&culturePageSize=999&migrationPage=4&sitePage=6');
  assert.deepEqual(location.search, defaultCultureSearch);

  const next = buildCultureLocation('https://example.test/?view=culture&tab=items&migrationPage=4&sitePage=6', {
    ...defaultCultureSearch,
    keyword: '堂号',
    pageNo: 2
  }, 19);
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'culture');
  assert.equal(url.searchParams.get('tab'), 'items');
  assert.equal(url.searchParams.get('migrationPage'), '4');
  assert.equal(url.searchParams.get('sitePage'), '6');
  assert.equal(url.searchParams.get('cultureKeyword'), '堂号');
  assert.equal(url.searchParams.get('culturePage'), '2');
  assert.equal(url.searchParams.get('cultureItem'), '19');
});
