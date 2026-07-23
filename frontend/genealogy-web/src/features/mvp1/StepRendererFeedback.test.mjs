import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./StepRenderer.tsx', import.meta.url), 'utf8');

test('step renderer no longer passes legacy notify to migrated steps', () => {
  assert.match(source, /<ClanStep onCreated=/);
  assert.match(source, /<BranchStep onSubmittedReview=/);
  assert.match(source, /<SourceStageStep onSubmittedReview=/);
  assert.doesNotMatch(source, /<ClanStep[^>]*notify=/);
  assert.doesNotMatch(source, /<BranchStep[^>]*notify=/);
  assert.doesNotMatch(source, /<SourceStageStep[^>]*notify=/);
});

test('step renderer keeps legacy notify only for pending migrations', () => {
  assert.match(source, /<GenerationStep notify=\{notify\}/);
  assert.match(source, /<PersonStep notify=\{notify\}/);
  assert.match(source, /<RelationshipStep notify=\{notify\}/);
});
