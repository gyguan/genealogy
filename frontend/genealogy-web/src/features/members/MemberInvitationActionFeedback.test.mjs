import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./MemberInvitationAction.tsx', import.meta.url), 'utf8');

test('member invitation entry uses semantic feedback without legacy notify props', () => {
  assert.match(source, /import \{ feedback \} from '\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(source, /feedback\.error/);
  assert.match(source, /export function MemberInvitationAction\(\)/);
  assert.match(source, /<MemberInvitationModal/);
  assert.doesNotMatch(source, /type Props/);
  assert.doesNotMatch(source, /\bnotify\b/);
});
