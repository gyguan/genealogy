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

test('production CSS contains no unscoped Ant Design internal selectors', () => {
  try {
    runAudit(`--json=${jsonReport}`, `--markdown=${markdownReport}`, '--report-only');
    const report = JSON.parse(readFileSync(new URL(`../../${jsonReport}`, import.meta.url), 'utf8'));
    const failures = [
      ...report.blocking.map(item => `blocking: ${item.entry}`),
      ...report.staleExceptions.map(value => `stale exception: ${value}`)
    ];
    assert.deepEqual(failures, [], failures.join('\n'));
    assert.equal(report.categories['unscoped-internal'] ?? 0, 0);
    assert.ok(report.totals.selectors > 0, 'audit must inventory production Ant Design selector usage');
    assert.ok(report.records.every(item => item.file.startsWith('src/') && !item.file.startsWith('src/prototypes/')));
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
    assert.ok(item.entries.every(entry => entry.split('|').length >= 3 && entry.includes('.ant-')));
  }
});
