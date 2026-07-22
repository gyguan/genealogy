import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_PERSON_PAGE_SIZE,
  buildPersonArchiveUrl,
  emptyPersonArchiveSearch,
  readPersonArchiveSearch,
  writePersonDetailTab
} from '../../../.person-archive-test/features/persons/personArchiveUrlState.js';

const personArchivePageSource = readFileSync(new URL('./PersonArchiveSearchPage.tsx', import.meta.url), 'utf8');

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

test('person detail tabs replace the current history entry instead of stacking return steps', () => {
  const previousWindow = globalThis.window;
  const returnState = {
    genealogyPersonDetailReturnUrl: '/?view=personArchive&name=%E5%BC%A0&page=2',
    genealogyPersonArchiveScrollY: 480
  };
  const calls = { push: 0, replace: 0 };
  const location = { href: 'http://localhost/persons/42?view=personArchive&name=%E5%BC%A0&page=2' };

  globalThis.window = {
    location,
    history: {
      state: returnState,
      pushState() {
        calls.push += 1;
      },
      replaceState(state, _title, href) {
        calls.replace += 1;
        assert.equal(state, returnState);
        location.href = new URL(href, location.href).href;
      }
    }
  };

  try {
    writePersonDetailTab('events', 'push');
    writePersonDetailTab('sources', 'push');
    writePersonDetailTab('tracking', 'push');

    assert.equal(calls.push, 0);
    assert.equal(calls.replace, 3);
    assert.equal(new URL(location.href).searchParams.get('tab'), 'tracking');
    assert.equal(globalThis.window.history.state.genealogyPersonDetailReturnUrl, returnState.genealogyPersonDetailReturnUrl);

    writePersonDetailTab('basic', 'push');
    assert.equal(calls.push, 0);
    assert.equal(calls.replace, 4);
    assert.equal(new URL(location.href).searchParams.has('tab'), false);
  } finally {
    globalThis.window = previousWindow;
  }
});

test('renders advanced filters with Collapse before the trailing query actions', () => {
  assert.match(personArchivePageSource, /Card, Collapse, Dropdown/);
  assert.match(personArchivePageSource, /className="person-archive-advanced-collapse"/);
  assert.match(personArchivePageSource, /activeKey=\{advancedOpen \? \['advanced'\] : \[\]\}/);
  assert.match(personArchivePageSource, /styles: \{ header: \{ display: 'none' \}, body: \{ padding: 0 \} \}/);
  assert.match(personArchivePageSource, /aria-expanded=\{advancedOpen\}/);
  assert.match(personArchivePageSource, /aria-controls="person-archive-advanced-filters"/);
  const collapseIndex = personArchivePageSource.indexOf('className="person-archive-advanced-collapse"');
  const actionsIndex = personArchivePageSource.indexOf('<Space className="person-archive-query-actions">');
  assert.ok(collapseIndex >= 0 && actionsIndex > collapseIndex);
});
