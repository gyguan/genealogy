import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(process.cwd(), 'src');
const files = [
  'features/mvp1/StepRenderer.tsx',
  'features/mvp1/steps/generation/GenerationStep.tsx',
  'features/mvp1/steps/person/PersonStep.tsx',
  'features/mvp1/steps/relationship/RelationshipStep.tsx'
];

function read(relative) {
  return readFileSync(path.join(root, relative), 'utf8');
}
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(file);
    return /\.(ts|tsx)$/.test(entry.name) ? [file] : [];
  });
}

test('remaining wizard steps use only OperationFeedback', () => {
  for (const relative of files.slice(1)) {
    const source = read(relative);
    assert.match(source, /OperationFeedback/);
    assert.match(source, /feedback\.(success|error|warning|info)/);
    assert.doesNotMatch(source, /notify\??:|notify\?\.|\{ notify,/);
  }
});

test('StepRenderer and callers no longer pass notify', () => {
  const renderer = read(files[0]);
  assert.doesNotMatch(renderer, /notify/);
  const violations = walk(root).flatMap(file => {
    const source = readFileSync(file, 'utf8');
    return source.includes('<StepRenderer') && /<StepRenderer\b[\s\S]*?notify=/.test(source)
      ? [path.relative(process.cwd(), file)]
      : [];
  });
  assert.deepEqual(violations, []);
});
