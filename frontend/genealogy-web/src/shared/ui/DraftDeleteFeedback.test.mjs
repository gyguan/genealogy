import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const draftDeleteButtonSource = readFileSync(new URL('./DraftDeleteButton.tsx', import.meta.url), 'utf8');
const clanStepSource = readFileSync(new URL('../../features/mvp1/steps/clan/ClanStep.tsx', import.meta.url), 'utf8');

test('draft delete button uses a mounted message holder and closes confirmation on error', () => {
  assert.match(draftDeleteButtonSource, /const \[messageApi, contextHolder\] = message\.useMessage\(\)/);
  assert.match(draftDeleteButtonSource, /\{contextHolder\}/);
  assert.match(draftDeleteButtonSource, /catch \(error\) \{\s*setOpen\(false\);\s*onError\?\.\(error\);\s*messageApi\.error/s);
});

test('clan step keeps backend delete errors visible in the result area', () => {
  assert.match(clanStepSource, /const \[clanDeleteError, setClanDeleteError\] = useState\(''\)/);
  assert.match(clanStepSource, /onError=\{handleDeleteClanError\}/);
  assert.match(clanStepSource, /<PageFeedback[\s\S]*title="宗族删除失败"/);
  assert.match(clanStepSource, /description=\{clanDeleteError\}/);
  assert.match(clanStepSource, /setClanDeleteError\(''\);\s*await apiClient\.delete/s);
  assert.doesNotMatch(clanStepSource, /<Alert\b/);
});
