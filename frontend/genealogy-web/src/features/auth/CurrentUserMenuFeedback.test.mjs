import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const currentUserMenu = readFileSync(new URL('./CurrentUserMenu.tsx', import.meta.url), 'utf8');

test('current user sessions use standard feedback, confirmation and empty states', () => {
  assert.match(currentUserMenu, /import \{ ConfirmAction, EmptyState, PageFeedback \} from '\.\.\/\.\.\/shared\/ui\/Feedback'/);
  assert.match(currentUserMenu, /import \{ feedback \} from '\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(currentUserMenu, /title="登录设备加载失败"/);
  assert.match(currentUserMenu, /<ConfirmAction/g);
  assert.match(currentUserMenu, /<EmptyState/);
  assert.match(currentUserMenu, /feedback\.success/);
  assert.match(currentUserMenu, /feedback\.error/);
  assert.doesNotMatch(currentUserMenu, /locale=\{\{ emptyText: ['"]/);
});
