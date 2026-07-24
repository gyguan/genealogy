import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(process.cwd(), 'src');
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(file);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.|\.spec\./.test(entry.name) || file.includes(path.sep + 'generated' + path.sep)) return [];
    return [file];
  });
}

test('application source no longer exposes the legacy notify interface', () => {
  const violations = walk(root).flatMap(file => /\bnotify\b/.test(readFileSync(file, 'utf8')) ? [path.relative(process.cwd(), file)] : []);
  assert.deepEqual(violations, []);
});

test('OperationFeedback supports migrated application feedback payloads', () => {
  const source = readFileSync(path.join(root, 'shared/ui/OperationFeedback.ts'), 'utf8');
  assert.match(source, /from: \(data: unknown, error = false\)/);
  assert.match(source, /record\?\.type/);
});
