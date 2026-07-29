import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import test from 'node:test';

const projectRoot = new URL('../..', import.meta.url).pathname;
const jsonReport = '.antd-internal-overrides-test.json';
const markdownReport = '.antd-internal-overrides-test.md';

function runAudit(...args) {
  return execFileSync('node', ['scripts/audit-antd-internal-overrides.mjs', ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

test('production CSS contains no unregistered Ant Design internal selectors', () => {
  try {
    const output = runAudit(`--json=${jsonReport}`, `--markdown=${markdownReport}`);
    assert.match(output, /Result: \*\*PASSED\*\*/);
    const report = JSON.parse(readFileSync(new URL(`../../${jsonReport}`, import.meta.url), 'utf8'));
    assert.equal(report.totals.unregistered, 0);
    assert.equal(report.totals.unscoped, 0);
    assert.equal(report.totals.staleExceptions, 0);
  } finally {
    rmSync(new URL(`../../${jsonReport}`, import.meta.url), { force: true });
    rmSync(new URL(`../../${markdownReport}`, import.meta.url), { force: true });
  }
});

test('override registry only accepts unavoidable exact exceptions', () => {
  const registry = JSON.parse(readFileSync(new URL('../../antd-internal-overrides.json', import.meta.url), 'utf8'));
  assert.equal(registry.schemaVersion, 1);
  assert.ok(Array.isArray(registry.exceptions));
  for (const item of registry.exceptions) {
    assert.equal(item.replacementAssessment, 'unavoidable');
    assert.ok(Number.isInteger(item.trackingIssue));
    assert.match(item.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.entries.every(entry => entry.includes('|') && entry.includes('.ant-')));
  }
});
