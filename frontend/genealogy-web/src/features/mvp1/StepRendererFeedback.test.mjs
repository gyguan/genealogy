import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./StepRenderer.tsx', import.meta.url), 'utf8');

test('step renderer no longer passes legacy notify to any wizard step', () => {
  assert.match(source, /<ClanStep onCreated=/);
  assert.match(source, /<BranchStep onSubmittedReview=/);
  assert.match(source, /<GenerationStep onSubmittedReview=/);
  assert.match(source, /<PersonStep onSubmittedReview=/);
  assert.match(source, /<RelationshipStep onSubmittedReview=/);
  assert.match(source, /<SourceStageStep onSubmittedReview=/);
  assert.doesNotMatch(source, /notify/);
});
