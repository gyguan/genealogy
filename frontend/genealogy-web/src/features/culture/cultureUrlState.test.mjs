import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.culture-shell-test/features/culture/cultureUrlState.js');
const { buildCultureLocation, buildCultureQueryString, defaultCultureSearch, readCultureLocation } = await import(pathToFileURL(modulePath).href);

test('reads repeated culture item filters and keeps legacy single values compatible', () => {
  const location = readCultureLocation('https://example.test/?view=culture&tab=items&cultureKeyword=%E5%AE%B6%E8%AE%AD&cultureCategory=family_instruction&cultureCategory=clan_rule&cultureBranch=7&cultureBranch=8&cultureStatus=official&cultureStatus=draft&culturePrivacy=branch_only&culturePrivacy=clan_only&cultureHasSource=true&cultureHasSource=false&cultureFeatured=true&cultureSort=title%2Casc&culturePage=3&culturePageSize=20&cultureItem=88');
  assert.deepEqual(location, {
    search: {
      keyword: '家训',
      category: ['family_instruction', 'clan_rule'],
      branchId: [7, 8],
      dataStatus: ['official', 'draft'],
      privacyLevel: ['branch_only', 'clan_only'],
      hasSource: [true, false],
      featuredOnHome: [true],
      sort: 'title,asc',
      pageNo: 3,
      pageSize: 20
    },
    selectedItemId: 88
  });
});

test('falls back from invalid values without touching other tab state', () => {
  const location = readCultureLocation('https://example.test/?view=culture&tab=items&cultureCategory=invalid&culturePage=0&culturePageSize=999&migrationPage=4&sitePage=6');
  assert.equal(location.search.keyword, defaultCultureSearch.keyword);
  assert.equal(location.search.sort, defaultCultureSearch.sort);
  assert.equal(location.search.pageNo, defaultCultureSearch.pageNo);
  assert.equal(location.search.pageSize, defaultCultureSearch.pageSize);
  assert.equal(location.search.category, undefined);
  assert.equal(location.search.branchId, undefined);
  assert.equal(location.search.dataStatus, undefined);
  assert.equal(location.search.privacyLevel, undefined);

  const next = buildCultureLocation('https://example.test/?view=culture&tab=items&migrationPage=4&sitePage=6', {
    ...defaultCultureSearch,
    keyword: '堂号',
    category: ['hall_name', 'commandery'],
    branchId: [3, 5],
    pageNo: 2
  }, 19);
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'culture');
  assert.equal(url.searchParams.get('tab'), 'items');
  assert.equal(url.searchParams.get('migrationPage'), '4');
  assert.equal(url.searchParams.get('sitePage'), '6');
  assert.deepEqual(url.searchParams.getAll('cultureCategory'), ['hall_name', 'commandery']);
  assert.deepEqual(url.searchParams.getAll('cultureBranch'), ['3', '5']);
  assert.equal(url.searchParams.get('cultureKeyword'), '堂号');
  assert.equal(url.searchParams.get('culturePage'), '2');
  assert.equal(url.searchParams.get('cultureItem'), '19');
});

test('serializes repeated API query parameters for every multiselect dimension', () => {
  const query = buildCultureQueryString({
    ...defaultCultureSearch,
    category: ['family_instruction', 'clan_rule'],
    branchId: [7, 8],
    dataStatus: ['draft', 'official'],
    privacyLevel: ['clan_only', 'branch_only'],
    hasSource: [true, false],
    featuredOnHome: [true]
  });
  const params = new URLSearchParams(query);
  assert.deepEqual(params.getAll('category'), ['family_instruction', 'clan_rule']);
  assert.deepEqual(params.getAll('branchId'), ['7', '8']);
  assert.deepEqual(params.getAll('dataStatus'), ['draft', 'official']);
  assert.deepEqual(params.getAll('privacyLevel'), ['clan_only', 'branch_only']);
  assert.deepEqual(params.getAll('hasSource'), ['true', 'false']);
  assert.deepEqual(params.getAll('featuredOnHome'), ['true']);
});
