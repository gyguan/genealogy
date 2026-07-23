import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./ImportHistoryOverviewPanel.tsx', import.meta.url), 'utf8');

test('import history overview uses standard page and empty feedback', () => {
  assert.match(source, /import \{ EmptyState, PageFeedback \} from '\.\.\/\.\.\/shared\/ui\/Feedback'/);
  assert.match(source, /title="导入记录加载失败"/);
  assert.match(source, /重新加载/);
  assert.match(source, /<EmptyState/);
  assert.doesNotMatch(source, /<Alert\b|<Empty\b/);
  assert.doesNotMatch(source, /from 'antd'[^;]*\bAlert\b|from 'antd'[^;]*\bEmpty\b/);
});
