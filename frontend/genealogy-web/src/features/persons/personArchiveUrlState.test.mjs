import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PERSON_PAGE_SIZE,
  buildPersonArchiveUrl,
  emptyPersonArchiveSearch,
  readPersonArchiveSearch
} from '../../../.person-archive-test/features/persons/personArchiveUrlState.js';

test('reads repeated and comma-compatible multi-value filters', () => {
  const state = readPersonArchiveSearch(new URL(
    'http://localhost/?view=personArchive&branchId=8&gender=male&gender=female&generationWord=%E6%B0%B8,%E4%B8%96&generationNo=15&generationNo=16&dataStatus=official&dataStatus=draft&page=3&pageSize=50&sort=generationNo,asc'
  ));

  assert.deepEqual(state.genders, ['male', 'female']);
  assert.deepEqual(state.generationWords, ['永', '世']);
  assert.deepEqual(state.generationNos, ['15', '16']);
  assert.deepEqual(state.dataStatuses, ['official', 'draft']);
  assert.equal(state.branchId, '8');
  assert.equal(state.pageNo, 3);
  assert.equal(state.pageSize, 50);
  assert.equal(state.sort, 'generationNo,asc');
});

test('writes repeated parameters and preserves defaults compactly', () => {
  const href = buildPersonArchiveUrl({
    ...emptyPersonArchiveSearch(),
    name: '张',
    genders: ['male', 'female'],
    generationWords: ['永', '世'],
    generationNos: ['15', '16'],
    dataStatuses: ['official', 'draft'],
    pageNo: 2,
    pageSize: DEFAULT_PERSON_PAGE_SIZE
  }, 'http://localhost/?view=personArchive&tab=sources');
  const url = new URL(href, 'http://localhost');

  assert.equal(url.searchParams.get('name'), '张');
  assert.deepEqual(url.searchParams.getAll('gender'), ['male', 'female']);
  assert.deepEqual(url.searchParams.getAll('generationWord'), ['永', '世']);
  assert.deepEqual(url.searchParams.getAll('generationNo'), ['15', '16']);
  assert.deepEqual(url.searchParams.getAll('dataStatus'), ['official', 'draft']);
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.has('pageSize'), false);
  assert.equal(url.searchParams.has('tab'), false);
});

test('uses official status and ten rows as initial defaults', () => {
  const state = emptyPersonArchiveSearch();
  assert.deepEqual(state.dataStatuses, ['official']);
  assert.equal(state.pageSize, 10);
});
