import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const draftDeleteButtonSource = readFileSync(new URL('./DraftDeleteButton.tsx', import.meta.url), 'utf8');
const clanStepSource = readFileSync(new URL('../../features/mvp1/steps/clan/ClanStep.tsx', import.meta.url), 'utf8');

test('draft delete button uses standard confirmation and operation feedback entries', () => {
  assert.match(draftDeleteButtonSource, /import \{ ConfirmAction \} from '.\/Feedback'/);
  assert.match(draftDeleteButtonSource, /import \{ feedback \} from '.\/OperationFeedback'/);
  assert.match(draftDeleteButtonSource, /<ConfirmAction/);
  assert.match(draftDeleteButtonSource, /feedback\.success\(`/);
  assert.match(draftDeleteButtonSource, /showErrorFeedback = true/);
  assert.match(draftDeleteButtonSource, /if \(showErrorFeedback\) feedback\.error\(/);
  assert.doesNotMatch(draftDeleteButtonSource, /message\.useMessage|messageApi\.|<Popconfirm\b/);
  assert.match(draftDeleteButtonSource, /catch \(error\) \{\s*setOpen\(false\);\s*onError\?\.\(error\);\s*if \(showErrorFeedback\)/s);
});

test('clan step keeps backend delete errors visible without duplicate toast', () => {
  assert.match(clanStepSource, /const \[clanDeleteError, setClanDeleteError\] = useState\(''\)/);
  assert.match(clanStepSource, /onError=\{handleDeleteClanError\}/);
  assert.match(clanStepSource, /showErrorFeedback=\{false\}/);
  assert.match(clanStepSource, /<PageFeedback[\s\S]*title="宗族删除失败"/);
  assert.match(clanStepSource, /description=\{clanDeleteError\}/);
  assert.match(clanStepSource, /setClanDeleteError\(''\);\s*await apiClient\.delete/s);
  assert.doesNotMatch(clanStepSource, /<Alert\b/);
});
