import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const modal = readFileSync(new URL('./MemberInvitationModal.tsx', import.meta.url), 'utf8');
const action = readFileSync(new URL('./MemberInvitationAction.tsx', import.meta.url), 'utf8');

test('member invitation modal uses semantic feedback without notify wiring', () => {
  assert.match(modal, /import \{ feedback \} from '\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(modal, /feedback\.success\('成员邀请已生成，请通过安全渠道发送给受邀人'\)/);
  assert.match(modal, /feedback\.error\(error instanceof Error \? error\.message : '邀请生成失败'\)/);
  assert.match(modal, /feedback\.success\('邀请链接已复制'\)/);
  assert.doesNotMatch(modal, /\bnotify\s*[:(]/);
  assert.doesNotMatch(action, /<MemberInvitationModal[\s\S]*notify=/);
});
