import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const read = relative => readFileSync(path.join(ROOT, relative), 'utf8');

const loader = read('shared/styles/loadFeatureStyles.ts');
const wizardLegacy = read('mvp1-wizard.css');
const wizardContract = read('features/mvp1/wizard-form-system.css');
const personContract = read('features/persons/person-form-system.css');

const personPages = [
  read('features/persons/PersonArchiveSearchPage.tsx'),
  read('features/persons/PersonEditPage.tsx'),
  read('features/persons/PersonDetailPage.tsx')
].join('\n');

const wizardPages = [
  read('features/mvp1/Mvp1WizardPage.tsx'),
  read('features/mvp1/WizardShell.tsx')
].join('\n');

test('wizard and person form contracts are feature-owned and loaded explicitly', () => {
  assert.match(loader, /features\/mvp1\/wizard-form-system\.css/);
  assert.match(loader, /features\/persons\/person-form-system\.css/);
  assert.match(wizardContract, /font-size:\s*14px/);
  assert.match(wizardContract, /font-weight:\s*500/);
  assert.match(wizardContract, /line-height:\s*20px/);
  assert.match(personContract, /font-size:\s*14px/);
  assert.match(personContract, /font-weight:\s*500/);
  assert.match(personContract, /line-height:\s*20px/);
});

test('wizard stylesheet no longer owns person archive styles', () => {
  assert.doesNotMatch(wizardLegacy, /\.person-archive-|\.archive-search-|\.archive-drawer/);
});

test('legacy field and actions rules stay inside feature scopes', () => {
  assert.doesNotMatch(wizardLegacy, /(^|})\s*\.field\s+/gm);
  assert.doesNotMatch(wizardLegacy, /(^|})\s*\.actions\s+/gm);
  assert.doesNotMatch(wizardLegacy, /(^|})\s*\.archive-search-panel\s+/gm);
});

test('wizard and person pages use Ant Design or shared feedback components', () => {
  for (const component of ['Button', 'Card', 'Form', 'Input', 'Select']) {
    assert.match(`${wizardPages}\n${personPages}`, new RegExp(`\\b${component}\\b`));
  }
  assert.match(personPages, /Table|Descriptions/);
  assert.match(personPages, /PageFeedback|EmptyState/);
  assert.doesNotMatch(`${wizardPages}\n${personPages}`, /document\.createElement\(['"](?:button|input|select|table)['"]\)/);
});

test('deprecated tweak and override person styles do not return', () => {
  for (const file of [
    'person-archive-tweaks.css',
    'person-edit-overrides.css',
    'person-detail-tweaks.css',
    'person-page-unification.css'
  ]) {
    assert.equal(existsSync(path.join(ROOT, file)), false, `${file} must remain retired`);
  }
});
