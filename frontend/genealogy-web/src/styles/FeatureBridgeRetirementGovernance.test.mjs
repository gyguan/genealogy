import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve('src');
const bridge = readFileSync(path.join(ROOT, 'antd-bridge.css'), 'utf8');
const memberStyles = readFileSync(path.join(ROOT, 'member-permission-page.css'), 'utf8');
const relationshipStep = readFileSync(path.join(ROOT, 'features/mvp1/steps/relationship/RelationshipStep.tsx'), 'utf8');
const authCommercial = readFileSync(path.join(ROOT, 'auth-commercial.css'), 'utf8');
const registry = JSON.parse(readFileSync(path.join(ROOT, 'styles/antd-override-exceptions.json'), 'utf8'));

function sourceFiles(directory) {
  return readdirSync(directory).flatMap(name => {
    const file = path.join(directory, name);
    if (statSync(file).isDirectory()) return sourceFiles(file);
    return /\.(?:ts|tsx|js|jsx)$/.test(name) && !/\.test\./.test(name) ? [file] : [];
  });
}

const applicationSource = sourceFiles(ROOT)
  .map(file => readFileSync(file, 'utf8'))
  .join('\n');

const retiredClasses = [
  'auth-page-shell',
  'auth-page-inner',
  'auth-layout',
  'auth-hero-card',
  'auth-demo-list',
  'auth-card',
  'auth-tip',
  'auth-result',
  'auth-register-card',
  'auth-inline-title',
  'relationship-preset-grid'
];

test('retired auth and relationship preset styles stay out of the bridge', () => {
  for (const className of retiredClasses) {
    assert.equal(bridge.includes(`.${className}`), false, `${className} must not return to antd-bridge.css`);
  }
  assert.match(authCommercial, /\.commercial-auth-shell/);
});

test('retired selectors have no application source references', () => {
  for (const className of retiredClasses) {
    assert.equal(applicationSource.includes(className), false, `${className} is retired and must not be referenced`);
  }
});

test('member role presentation is feature-owned', () => {
  for (const selector of ['.member-role-page', '.member-role-tip', '.role-card-grid']) {
    assert.match(memberStyles, new RegExp(selector.replace('.', '\\.')));
    assert.equal(bridge.includes(selector), false, `${selector} must remain in member-permission-page.css`);
  }
});

test('relationship type selection uses Ant Design semantics', () => {
  assert.match(relationshipStep, /<Select value=\{mode\} onChange=\{changeMode\}/);
  assert.match(relationshipStep, /disabled=\{!centerPerson \|\| !expectedNo \|\| !relativeOptions\.length\}/);
  assert.doesNotMatch(relationshipStep, /relationship-preset-grid/);
  assert.doesNotMatch(relationshipStep, /<button/);
});

test('issue 896 exception domains are retired', () => {
  const serialized = JSON.stringify(registry);
  assert.doesNotMatch(serialized, /legacy authentication presentation/);
  assert.doesNotMatch(serialized, /member role presentation/);
  assert.deepEqual(registry.exceptions.map(item => item.trackingIssue), [897]);
});
