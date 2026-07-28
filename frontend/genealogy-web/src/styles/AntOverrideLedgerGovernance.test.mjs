import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve('src');
const bridge = readFileSync(path.join(ROOT, 'antd-bridge.css'), 'utf8');
const registry = JSON.parse(readFileSync(path.join(ROOT, 'styles/antd-override-exceptions.json'), 'utf8'));

function normalize(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function bridgeRules() {
  const rules = [];
  let media = '';
  for (const rawLine of bridge.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('/*')) continue;
    if (line.startsWith('@media') && line.endsWith('{')) {
      media = normalize(line.slice(0, -1));
      continue;
    }
    if (line === '}') {
      media = '';
      continue;
    }
    const open = line.indexOf('{');
    const close = line.lastIndexOf('}');
    if (open < 0 || close < open) continue;
    rules.push({
      media,
      selector: normalize(line.slice(0, open)),
      declarations: line.slice(open + 1, close).split(';').map(normalize).filter(Boolean)
    });
  }
  return rules;
}

const rules = bridgeRules();

function importantSnapshot() {
  return rules.flatMap(rule => rule.declarations
    .filter(declaration => declaration.includes('!important'))
    .map(declaration => {
      const property = normalize(declaration.split(':', 1)[0]);
      const context = rule.media ? `${rule.media}::` : '';
      return `${context}${rule.selector}|${property}`;
    }))
    .sort();
}

test('override ledger metadata is complete and reviewed', () => {
  assert.equal(typeof registry.owner, 'string');
  assert.match(registry.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(registry.exceptions) && registry.exceptions.length > 0);
  for (const item of registry.exceptions) {
    assert.ok(item.scope);
    assert.ok(item.reason);
    assert.ok(item.exitCondition);
    assert.ok(Number.isInteger(item.trackingIssue));
    assert.match(item.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(item.selectorPrefixes) && item.selectorPrefixes.length > 0);
  }
});

test('important declarations match the exact only-shrink snapshot', () => {
  assert.deepEqual(importantSnapshot(), [...registry.importantSnapshot].sort());
});

test('every Ant Design internal selector is registered', () => {
  const prefixes = registry.exceptions.flatMap(item => item.selectorPrefixes);
  const antSelectors = rules.map(rule => rule.selector).filter(selector => selector.includes('.ant-'));
  const uncovered = antSelectors.filter(selector => !prefixes.some(prefix => selector.includes(prefix)));
  assert.deepEqual(uncovered, [], `unregistered Ant Design internal selectors: ${uncovered.join(', ')}`);
});

test('registered selector prefixes are real and stale entries are rejected', () => {
  for (const item of registry.exceptions) {
    for (const prefix of item.selectorPrefixes) {
      assert.ok(rules.some(rule => rule.selector.includes(prefix)), `${prefix} is registered but absent from antd-bridge.css`);
    }
  }
});

test('retired tree and source exceptions do not return to the ledger', () => {
  const serialized = JSON.stringify(registry);
  assert.doesNotMatch(serialized, /lineage-search-results/);
  assert.doesNotMatch(serialized, /xp-source-/);
});
