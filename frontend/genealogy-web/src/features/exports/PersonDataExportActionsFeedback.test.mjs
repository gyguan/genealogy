import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonDataExportActions.tsx', import.meta.url), 'utf8');

test('person data export uses semantic operation feedback', () => {
  assert.match(source, /import \{ feedback \} from '\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(source, /feedback\.warning\('请先选择宗族'\)/);
  assert.match(source, /feedback\.warning\('请先选择支派'\)/);
  assert.match(source, /feedback\.success\(`人物数据已导出：\$\{filename\}`\)/);
  assert.match(source, /feedback\.error\(\(error as Error\)\.message \|\| '人物数据导出失败'\)/);
  assert.doesNotMatch(source, /\bnotify\s*\(/);
});
