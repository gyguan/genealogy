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

test('business source uses unified EmptyState instead of Ant Design Empty', () => {
  const violations = [];
  for (const file of walk(src)) {
    if (file.endsWith('shared/ui/Feedback.tsx') || /\.test\.|\.spec\./.test(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (/<Empty\b/.test(source) || /\bEmpty\.PRESENTED_IMAGE_/.test(source) || /import\s*\{[\s\S]*?\bEmpty\b[\s\S]*?\}\s*from\s*['"]antd['"]/.test(source)) {
      violations.push(path.relative(src, file));
    }
  }
  assert.deepEqual(violations, []);
});
