import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

test('business source uses unified confirmation entry points', () => {
  const violations = [];
  for (const file of walk(src)) {
    if (file.endsWith('shared/ui/Feedback.tsx') || /\.test\.|\.spec\./.test(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (/<Popconfirm\b/.test(source) || /\b(?:Modal|modal)\.confirm\s*\(/.test(source) || /import\s*\{[\s\S]*?\bPopconfirm\b[\s\S]*?\}\s*from\s*['"]antd['"]/.test(source)) violations.push(path.relative(src, file));
  }
  assert.deepEqual(violations, []);
});

test('standard feedback module exposes declarative and imperative confirmation APIs', () => {
  const source = fs.readFileSync(path.join(src, 'shared/ui/Feedback.tsx'), 'utf8');
  assert.match(source, /export function ConfirmAction/);
  assert.match(source, /export function confirmAction/);
});
