import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveWizardStepStates,
  emptyWizardStateSnapshot,
  getWizardStepGate
} from '../../../../.wizard-state-test/features/mvp1/domain/wizardStepState.js';

function completedSnapshot() {
  return {
    ...emptyWizardStateSnapshot(),
    clanId: 'c1',
    branchId: 'b1',
    personId: 'p1',
    relationshipId: 'r1',
    sourceId: 's1',
    clans: [{ id: 'c1', status: 'approved' }],
    branches: [{ id: 'b1', status: 'approved' }],
    schemes: [{ id: 'g1', branchId: 'b1', status: 'approved' }],
    persons: [{ id: 'p1', status: 'approved' }],
    relationships: [{ id: 'r1', status: 'approved' }],
    sources: [{ id: 's1', status: 'approved' }],
    generationItemCounts: { g1: 2 },
    sourceLinkCount: 1,
    tasks: []
  };
}

function byKey(steps, key) {
  const step = steps.find(item => item.key === key);
  assert.ok(step, `missing step ${key}`);
  return step;
}

test('normal progression marks all seven steps completed', () => {
  const steps = deriveWizardStepStates(completedSnapshot());
  assert.deepEqual(steps.map(step => step.state), [
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'completed'
  ]);
  assert.equal(getWizardStepGate(steps, 'review').allowed, true);
});

test('business steps remain enterable when earlier steps are incomplete', () => {
  const snapshot = emptyWizardStateSnapshot();
  snapshot.clanId = 'c1';
  snapshot.clans = [{ id: 'c1', status: 'approved' }];
  const steps = deriveWizardStepStates(snapshot);

  assert.equal(byKey(steps, 'branch').state, 'editing');
  assert.equal(byKey(steps, 'generation').state, 'waiting');
  assert.equal(byKey(steps, 'generation').stateLabel, '可进入');
  assert.equal(getWizardStepGate(steps, 'generation').allowed, true);
});

test('pending review task is not treated as completed', () => {
  const snapshot = emptyWizardStateSnapshot();
  snapshot.clanId = 'c1';
  snapshot.branchId = 'b1';
  snapshot.clans = [{ id: 'c1', status: 'approved' }];
  snapshot.branches = [{ id: 'b1', status: 'draft' }];
  snapshot.tasks = [{ id: 't1', targetType: 'branch', targetId: 'b1', status: 'pending' }];

  const steps = deriveWizardStepStates(snapshot);
  assert.equal(byKey(steps, 'branch').state, 'reviewing');
  assert.equal(byKey(steps, 'branch').complete, false);
  assert.equal(byKey(steps, 'generation').state, 'waiting');
  assert.equal(getWizardStepGate(steps, 'generation').allowed, true);
});

test('rejected step remains enterable and downstream business steps can still be opened', () => {
  const snapshot = completedSnapshot();
  snapshot.persons = [{ id: 'p1', status: 'rejected' }];
  snapshot.relationships = [];
  snapshot.sourceLinkCount = 0;

  const steps = deriveWizardStepStates(snapshot);
  assert.equal(byKey(steps, 'person').state, 'rejected');
  assert.equal(getWizardStepGate(steps, 'person').allowed, true);
  assert.equal(byKey(steps, 'relationship').state, 'waiting');
  assert.equal(getWizardStepGate(steps, 'relationship').allowed, true);
});

test('one step load error does not close other already available steps', () => {
  const snapshot = completedSnapshot();
  snapshot.errors = { source: '来源接口暂不可用' };
  snapshot.sourceLinkCount = 0;

  const steps = deriveWizardStepStates(snapshot);
  assert.equal(byKey(steps, 'relationship').state, 'completed');
  assert.equal(byKey(steps, 'source').state, 'error');
  assert.equal(getWizardStepGate(steps, 'source').allowed, true);
  assert.equal(getWizardStepGate(steps, 'branch').allowed, true);
  assert.equal(byKey(steps, 'review').state, 'waiting');
});

test('stale selected object is marked invalid instead of completed', () => {
  const snapshot = completedSnapshot();
  snapshot.branches = [{ id: 'b2', status: 'approved' }];

  const steps = deriveWizardStepStates(snapshot);
  assert.equal(byKey(steps, 'branch').state, 'invalid');
  assert.equal(byKey(steps, 'branch').complete, false);
  assert.equal(byKey(steps, 'generation').state, 'waiting');
  assert.equal(getWizardStepGate(steps, 'generation').allowed, true);
});

test('explicit relationship and source skips satisfy completion rules', () => {
  const snapshot = completedSnapshot();
  snapshot.relationshipId = '';
  snapshot.sourceId = '';
  snapshot.relationships = [];
  snapshot.sources = [];
  snapshot.sourceLinkCount = 0;
  snapshot.skipped = { relationship: true, source: true };

  const steps = deriveWizardStepStates(snapshot);
  assert.equal(byKey(steps, 'relationship').stateLabel, '已跳过');
  assert.equal(byKey(steps, 'source').stateLabel, '已跳过');
  assert.equal(byKey(steps, 'review').state, 'completed');
});

test('completion step remains locked until business dependencies are complete', () => {
  const steps = deriveWizardStepStates(emptyWizardStateSnapshot());
  assert.equal(getWizardStepGate(steps, 'branch').allowed, true);
  assert.equal(getWizardStepGate(steps, 'generation').allowed, true);
  assert.equal(getWizardStepGate(steps, 'person').allowed, true);
  assert.equal(getWizardStepGate(steps, 'relationship').allowed, true);
  assert.equal(getWizardStepGate(steps, 'source').allowed, true);
  assert.equal(getWizardStepGate(steps, 'review').allowed, false);
});
