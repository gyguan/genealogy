import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WIZARD_SESSION_STORAGE_KEY,
  WIZARD_SESSION_VERSION,
  createLocalWizardSessionStore,
  createWizardSession,
  parseWizardSession,
  readWizardStepFromUrl,
  writeWizardStepToUrl
} from '../../../../.wizard-session-test/features/mvp1/services/wizardSessionService.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    value: key => values.get(key)
  };
}

function session() {
  return createWizardSession({
    activeStep: 'person',
    workspace: {
      clanId: '1',
      branchId: '2',
      personId: '3',
      relationshipId: '4',
      sourceId: '5',
      reviewTaskId: '6'
    },
    skipped: { relationship: false, source: true },
    drafts: { person: { 'input:text:0': '黄一', 'input:checkbox:1': true } }
  }, new Date('2026-07-16T00:00:00.000Z'));
}

test('legal step is read from URL and written without dropping other query state', () => {
  const url = new URL('https://example.test/?view=mvp1Wizard&step=person&foo=bar#top');
  assert.equal(readWizardStepFromUrl(url), 'person');
  assert.equal(writeWizardStepToUrl(url, 'source'), '/?view=mvp1Wizard&step=source&foo=bar#top');
});

test('illegal URL step is ignored safely', () => {
  assert.equal(readWizardStepFromUrl(new URL('https://example.test/?step=unknown')), undefined);
});

test('versioned session round trips workspace, skips and drafts', () => {
  const parsed = parseWizardSession(JSON.stringify(session()));
  assert.equal(parsed?.version, WIZARD_SESSION_VERSION);
  assert.equal(parsed?.activeStep, 'person');
  assert.equal(parsed?.workspace.relationshipId, '4');
  assert.equal(parsed?.skipped.source, true);
  assert.deepEqual(parsed?.drafts.person, { 'input:text:0': '黄一', 'input:checkbox:1': true });
});

test('unknown version and malformed JSON are discarded', () => {
  assert.equal(parseWizardSession('{bad'), undefined);
  assert.equal(parseWizardSession(JSON.stringify({ ...session(), version: 99 })), undefined);
});

test('local store removes incompatible payload and supports start-new clearing', () => {
  const storage = memoryStorage({ [WIZARD_SESSION_STORAGE_KEY]: JSON.stringify({ version: 99 }) });
  const store = createLocalWizardSessionStore(storage);
  assert.equal(store.load(), undefined);
  assert.equal(storage.value(WIZARD_SESSION_STORAGE_KEY), undefined);
  store.save(session());
  assert.equal(store.load()?.workspace.personId, '3');
  store.clear();
  assert.equal(store.load(), undefined);
});
