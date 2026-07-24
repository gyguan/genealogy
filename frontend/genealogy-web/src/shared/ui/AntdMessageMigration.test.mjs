import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(process.cwd(), 'src');
const excluded = ['OperationFeedback.ts', '.test.', '.spec.'];
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(file);
    if (!/\.(ts|tsx)$/.test(entry.name) || excluded.some(token => file.includes(token))) return [];
    return [file];
  });
}

test('business source contains no direct Ant Design Message usage', () => {
  const pattern = /\b(message|messageApi)\.(success|info|warning|error|loading)\s*\(|\bmessage\.useMessage\s*\(|\bmessage\s*\[/;
  const violations = walk(root).filter(file => pattern.test(readFileSync(file, 'utf8'))).map(file => path.relative(process.cwd(), file));
  assert.deepEqual(violations, []);
});
