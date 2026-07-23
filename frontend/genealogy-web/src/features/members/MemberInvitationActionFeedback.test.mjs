import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./MemberInvitationAction.tsx', import.meta.url), 'utf8');

test('member invitation entry uses semantic feedback without modal notify wiring', () => {
  assert.match(source, /import \{ feedback \} from '\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(source, /feedback\.error/);
  assert.match(source, /type Props = \{ notify: \(data: unknown, error\?: boolean\) => void \}/);
  assert.match(source, /export function MemberInvitationAction\(_props: Props\)/);
  assert.match(source, /<MemberInvitationModal/);
  assert.doesNotMatch(source, /<MemberInvitationModal[\s\S]*notify=/);
  assert.doesNotMatch(source, /\bnotify\s*\(/);
});