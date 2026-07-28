import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve('src');
const bridge = readFileSync(path.join(ROOT, 'antd-bridge.css'), 'utf8');
const registry = JSON.parse(readFileSync(path.join(ROOT, 'styles/antd-override-exceptions.json'), 'utf8'));

function executableCss(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').trim();
}

test('retired override ledger metadata is complete', () => {
  assert.equal(typeof registry.owner, 'string');
  assert.match(registry.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(registry.policy, /retired|feature-owned/i);
  assert.deepEqual(registry.importantSnapshot, []);
  assert.deepEqual(registry.exceptions, []);
});

test('Ant Design bridge contains no executable rules or important declarations', () => {
  assert.equal(executableCss(bridge), '');
  assert.doesNotMatch(bridge, /!important/);
  assert.doesNotMatch(bridge, /\.ant-[\w-]+/);
});

test('retired query and source exceptions do not return to the ledger', () => {
  const serialized = JSON.stringify(registry);
  for (const selector of ['archive-search-form', 'lineage-search-grid', 'lineage-search-results', 'xp-source-']) {
    assert.equal(serialized.includes(selector), false, `${selector} must not return to the override ledger`);
  }
  assert.equal(serialized.includes('"trackingIssue":897'), false);
});
