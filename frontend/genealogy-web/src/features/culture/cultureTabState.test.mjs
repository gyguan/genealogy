import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.culture-shell-test/features/culture/cultureTabState.js');
const { buildCultureTabLocation, readCultureTabLocation, resolveCultureTabMounts } = await import(pathToFileURL(modulePath).href);

test('defaults missing tab to items and asks the caller to normalize the URL', () => {
  const state = readCultureTabLocation('https://example.test/?view=culture&culturePage=2');
  assert.deepEqual(state, { tab: 'items', needsNormalization: true });
});

test('accepts supported culture tabs without normalization', () => {
  assert.deepEqual(
    readCultureTabLocation('https://example.test/?view=culture&tab=migrations'),
    { tab: 'migrations', needsNormalization: false }
  );
  assert.deepEqual(
    readCultureTabLocation('https://example.test/?view=culture&tab=sites'),
    { tab: 'sites', needsNormalization: false }
  );
});

test('falls back from an unsupported tab and keeps unrelated URL state when rewritten', () => {
  const current = 'https://example.test/?view=culture&tab=unknown&cultureKeyword=%E5%AE%B6%E8%AE%AD#detail';
  assert.deepEqual(readCultureTabLocation(current), { tab: 'items', needsNormalization: true });

  const next = new URL(buildCultureTabLocation(current, 'items'), 'https://example.test');
  assert.equal(next.searchParams.get('view'), 'culture');
  assert.equal(next.searchParams.get('tab'), 'items');
  assert.equal(next.searchParams.get('cultureKeyword'), '家训');
  assert.equal(next.hash, '#detail');
});

test('switches tabs without deleting the active business tab query state', () => {
  const next = new URL(
    buildCultureTabLocation(
      'https://example.test/?view=culture&tab=items&cultureBranch=12&culturePage=3',
      'sites'
    ),
    'https://example.test'
  );
  assert.equal(next.searchParams.get('tab'), 'sites');
  assert.equal(next.searchParams.get('cultureBranch'), '12');
  assert.equal(next.searchParams.get('culturePage'), '3');
});

test('mount plan enables exactly the active tab so inactive tabs cannot start requests', () => {
  for (const tab of ['items', 'migrations', 'sites']) {
    const mounts = resolveCultureTabMounts(tab);
    assert.equal(Object.values(mounts).filter(Boolean).length, 1);
    assert.equal(mounts[tab], true);
  }
});
