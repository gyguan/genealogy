import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveWizardCompletionControl } from '../../../../.wizard-completion-test/features/mvp1/domain/wizardCompletionModel.js';

test('blocked summary disables completion and keeps the action visible', () => {
  const control = deriveWizardCompletionControl({ activeStep: 'review', ready: true, completed: false, blockerCount: 2 });
  assert.equal(control.label, '完成建谱');
  assert.equal(control.disabled, true);
  assert.equal(control.hidden, false);
  assert.match(control.reason, /2/);
});

test('complete summary enables the fixed completion action', () => {
  const control = deriveWizardCompletionControl({ activeStep: 'review', ready: true, completed: false, blockerCount: 0 });
  assert.equal(control.disabled, false);
  assert.equal(control.hidden, false);
});

test('completed result hides the fixed action to avoid duplicate primary buttons', () => {
  const control = deriveWizardCompletionControl({ activeStep: 'review', ready: true, completed: true, blockerCount: 0 });
  assert.equal(control.hidden, true);
});
