import fs from 'node:fs';

const statePath = 'frontend/genealogy-web/src/features/mvp1/domain/wizardStepState.ts';
let state = fs.readFileSync(statePath, 'utf8');

state = state.replace(
  "options?: { stateLabel?: string; blockingStep?: Mvp1StepKey }",
  "options?: { stateLabel?: string; blockingStep?: Mvp1StepKey; canEnter?: boolean }"
);
state = state.replace(
  "canEnter: state !== 'waiting',",
  "canEnter: options?.canEnter ?? state !== 'waiting',"
);
state = state.replace(
`function waitingDecision(key: Mvp1StepKey, prerequisite: WizardStepDecision) {
  const prerequisiteTitle = WIZARD_STEP_TITLES[prerequisite.key];
  return decision(
    key,
    'waiting',
    \`${'${prerequisiteTitle}'}步骤尚未完成（${'${prerequisite.stateLabel}'}）：${'${prerequisite.reason}'}\`,
    \`返回${'${prerequisiteTitle}'}步骤，${'${prerequisite.action}'}\`,
    { blockingStep: prerequisite.key }
  );
}`,
`function waitingDecision(key: Mvp1StepKey, prerequisite: WizardStepDecision) {
  const prerequisiteTitle = WIZARD_STEP_TITLES[prerequisite.key];
  const isCompletionStep = key === 'review';
  return decision(
    key,
    'waiting',
    isCompletionStep
      ? \`${'${prerequisiteTitle}'}步骤尚未完成（${'${prerequisite.stateLabel}'}）：${'${prerequisite.reason}'}\`
      : \`${'${prerequisiteTitle}'}步骤尚未完成，但可进入本步骤选择或维护已有数据。\`,
    isCompletionStep
      ? \`返回${'${prerequisiteTitle}'}步骤，${'${prerequisite.action}'}\`
      : \`在本步骤选择所需业务对象，提交时再校验依赖条件\`,
    {
      blockingStep: prerequisite.key,
      canEnter: !isCompletionStep,
      stateLabel: isCompletionStep ? undefined : '可进入'
    }
  );
}`
);

if (!state.includes("stateLabel: isCompletionStep ? undefined : '可进入'")) {
  throw new Error('wizardStepState patch failed');
}
fs.writeFileSync(statePath, state);

const testPath = 'frontend/genealogy-web/src/features/mvp1/domain/wizardStepState.test.mjs';
let test = fs.readFileSync(testPath, 'utf8');
test = test.replace(
  "test('illegal jump is blocked by the nearest incomplete prerequisite', () => {",
  "test('business steps remain enterable when earlier steps are incomplete', () => {"
);
test = test.replace(
`  assert.equal(byKey(steps, 'generation').state, 'waiting');
  const gate = getWizardStepGate(steps, 'generation');
  assert.equal(gate.allowed, false);
  assert.equal(gate.blockingStep, 'branch');
  assert.match(gate.reason || '', /支派步骤尚未完成/);`,
`  assert.equal(byKey(steps, 'generation').state, 'waiting');
  assert.equal(byKey(steps, 'generation').stateLabel, '可进入');
  const gate = getWizardStepGate(steps, 'generation');
  assert.equal(gate.allowed, true);`
);
test = test.replace(
`  assert.equal(byKey(steps, 'generation').state, 'waiting');
});`,
`  assert.equal(byKey(steps, 'generation').state, 'waiting');
  assert.equal(getWizardStepGate(steps, 'generation').allowed, true);
});`
);
test = test.replace(
`test('rejected step remains enterable for correction and blocks downstream steps', () => {`,
`test('rejected step remains enterable and downstream business steps can still be opened', () => {`
);
test = test.replace(
`  assert.equal(byKey(steps, 'relationship').state, 'waiting');
  assert.equal(getWizardStepGate(steps, 'relationship').blockingStep, 'person');`,
`  assert.equal(byKey(steps, 'relationship').state, 'waiting');
  assert.equal(getWizardStepGate(steps, 'relationship').allowed, true);`
);
test = test.replace(
`  assert.equal(byKey(steps, 'generation').state, 'waiting');
});

test('explicit relationship`,
`  assert.equal(byKey(steps, 'generation').state, 'waiting');
  assert.equal(getWizardStepGate(steps, 'generation').allowed, true);
});

test('explicit relationship`
);
test += `

test('completion step remains locked until business dependencies are complete', () => {
  const steps = deriveWizardStepStates(emptyWizardStateSnapshot());
  assert.equal(getWizardStepGate(steps, 'branch').allowed, true);
  assert.equal(getWizardStepGate(steps, 'generation').allowed, true);
  assert.equal(getWizardStepGate(steps, 'person').allowed, true);
  assert.equal(getWizardStepGate(steps, 'relationship').allowed, true);
  assert.equal(getWizardStepGate(steps, 'source').allowed, true);
  assert.equal(getWizardStepGate(steps, 'review').allowed, false);
});
`;
fs.writeFileSync(testPath, test);
