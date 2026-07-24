import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(process.cwd(), 'src');
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(file);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.|\.spec\./.test(entry.name) || file.includes(path.sep + 'generated' + path.sep) || file.endsWith(path.join('shared', 'ui', 'Feedback.tsx'))) return [];
    return [file];
  });
}

test('business source no longer renders Ant Design Alert directly', () => {
  const violations = walk(root).flatMap(file => /<Alert\b/.test(readFileSync(file, 'utf8')) ? [path.relative(process.cwd(), file)] : []);
  assert.deepEqual(violations, []);
});

test('page alert audit baseline remains zero', () => {
  const baseline = JSON.parse(readFileSync(path.resolve(process.cwd(), 'feedback-audit-baseline.json'), 'utf8'));
  assert.equal(baseline.maxCounts.page_alert, 0);
});
