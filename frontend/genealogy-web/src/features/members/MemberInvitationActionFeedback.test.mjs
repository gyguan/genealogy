import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./MemberInvitationAction.tsx', import.meta.url), 'utf8');

test('member invitation entry uses semantic feedback for context loading failures', () => {
  assert.match(source, /import \{ feedback \} from '\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(source, /feedback\.error/);
  assert.match(source, /<MemberInvitationModal/);
  assert.match(source, /notify=\{notify\}/);
  assert.doesNotMatch(source, /\bnotify\s*\(/);
});
