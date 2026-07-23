import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./BookletActions.tsx', import.meta.url), 'utf8');

test('booklet export uses semantic operation feedback', () => {
  assert.match(source, /import \{ feedback \} from '\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(source, /feedback\.warning\('请先选择宗族'\)/);
  assert.match(source, /feedback\.warning\('请先选择支派'\)/);
  assert.match(source, /feedback\.success/);
  assert.match(source, /feedback\.error/);
  assert.doesNotMatch(source, /\bnotify\s*\(/);
});
