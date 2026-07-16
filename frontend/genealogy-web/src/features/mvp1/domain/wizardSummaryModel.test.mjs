import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWizardSummary } from '../../../../.wizard-summary-test/features/mvp1/domain/wizardSummaryModel.js';

const approved = { dataStatus: 'official' };
const completeInput = {
  clanSelected: true,
  branches: [approved],
  schemes: [approved],
  generationItemCount: 2,
  persons: [approved],
  relationships: [approved],
  sources: [approved],
  sourceLinkCount: 1
};

test('summary exposes blockers for missing and draft objects', () => {
  const result = buildWizardSummary({ ...completeInput, persons: [{ dataStatus: 'draft' }], relationships: [] });
  assert.equal(result.complete, false);
  assert.ok(result.blockers.some(item => item.step === 'person' && /草稿/.test(item.title)));
  assert.ok(result.blockers.some(item => item.step === 'relationship' && /尚未维护/.test(item.title)));
});

test('all approved objects produce a completable result', () => {
  const result = buildWizardSummary(completeInput);
  assert.equal(result.complete, true);
  assert.equal(result.blockers.length, 0);
});

test('reviewing objects are not counted as complete', () => {
  const result = buildWizardSummary({ ...completeInput, sources: [{ dataStatus: 'pending_review' }] });
  assert.equal(result.complete, false);
  assert.ok(result.blockers.some(item => /正在审核/.test(item.title)));
});

test('section load failure is isolated and actionable', () => {
  const result = buildWizardSummary({ ...completeInput, errors: { generation: '字辈查询失败' } });
  assert.equal(result.sections.find(item => item.key === 'person')?.counts.approved, 1);
  assert.ok(result.blockers.some(item => item.key === 'generation-error'));
});
