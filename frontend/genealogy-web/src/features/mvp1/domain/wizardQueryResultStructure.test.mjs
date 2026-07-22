import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const stepFiles = [
  'steps/clan/ClanStep.tsx',
  'steps/branch/BranchStep.tsx',
  'steps/generation/GenerationStep.tsx',
  'steps/person/PersonStep.tsx',
  'steps/relationship/RelationshipStep.tsx',
  'steps/source/SourceStageStep.tsx'
];

test('wizard ResultListCard renders one query result card with a direct table and no nested card', () => {
  const source = readFileSync(new URL('../../../shared/ui/ResultListCard.tsx', import.meta.url), 'utf8');
  assert.match(source, /<QueryResultCard[\s\S]*<Table<RecordType>/);
  assert.doesNotMatch(source, /<Card\b/);
  assert.doesNotMatch(source, /business-result-card/);
});

test('all active wizard nodes use the shared strict two-layer result implementation', () => {
  for (const relativePath of stepFiles) {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
    assert.match(source, /ResultListCard/, `${relativePath} must render ResultListCard`);
    assert.doesNotMatch(source, /step-draft-review-header/, `${relativePath} must not keep a separate result header`);
    assert.doesNotMatch(source, /business-result-card/, `${relativePath} must not render a nested business card`);
  }
});

test('source binding results are rendered as a table instead of record cards', () => {
  const source = readFileSync(new URL('../steps/source/SourceStageStep.tsx', import.meta.url), 'utf8');
  assert.match(source, /ResultListCard<SourceLinkLike>/);
  assert.doesNotMatch(source, /pagedLinks\.rows\.map\([\s\S]*?<Card/);
});
