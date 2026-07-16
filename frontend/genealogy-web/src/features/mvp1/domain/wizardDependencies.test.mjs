import assert from 'node:assert/strict';
import test from 'node:test';
import { dependencyImpactText, planWizardDependencyChange } from '../../../../.wizard-dependency-test/features/mvp1/domain/wizardDependencies.js';

const complete = {
  clanId: 'c1',
  branchId: 'b1',
  generationSchemeId: 'g1',
  personId: 'p1',
  relationshipId: 'r1',
  sourceId: 's1',
  reviewTaskId: 't1'
};

test('changing clan clears every downstream selection', () => {
  const plan = planWizardDependencyChange(complete, 'clanId', 'c2');
  assert.deepEqual(plan.patch, {
    clanId: 'c2', branchId: '', generationSchemeId: '', personId: '', relationshipId: '', sourceId: '', reviewTaskId: ''
  });
  assert.deepEqual(plan.affectedSteps, ['branch', 'generation', 'person', 'relationship', 'source', 'review']);
  assert.equal(plan.hasSelectedImpact, true);
});

test('changing branch invalidates generation and later steps', () => {
  const plan = planWizardDependencyChange(complete, 'branchId', 'b2');
  assert.deepEqual(plan.affectedSteps, ['generation', 'person', 'relationship', 'source', 'review']);
  assert.match(dependencyImpactText(plan), /字辈、人物、关系、来源、审核/);
});

test('changing generation scheme invalidates people and later selections', () => {
  const plan = planWizardDependencyChange(complete, 'generationSchemeId', 'g2');
  assert.deepEqual(plan.affectedSteps, ['person', 'relationship', 'source', 'review']);
});

test('changing center person clears relationship, source and review', () => {
  const plan = planWizardDependencyChange(complete, 'personId', 'p2');
  assert.deepEqual(plan.patch, { personId: 'p2', relationshipId: '', sourceId: '', reviewTaskId: '' });
});

test('changing relationship clears source and review only', () => {
  const plan = planWizardDependencyChange(complete, 'relationshipId', 'r2');
  assert.deepEqual(plan.affectedSteps, ['source', 'review']);
});

test('a first selection without downstream data has no destructive impact', () => {
  const empty = { clanId: '', branchId: '', generationSchemeId: '', personId: '', relationshipId: '', sourceId: '', reviewTaskId: '' };
  const plan = planWizardDependencyChange(empty, 'clanId', 'c1');
  assert.equal(plan.hasSelectedImpact, false);
});
