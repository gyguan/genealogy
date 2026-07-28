import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve('src');
const bridge = readFileSync(path.join(ROOT, 'antd-bridge.css'), 'utf8');
const memberStyles = readFileSync(path.join(ROOT, 'member-permission-page.css'), 'utf8');
const relationshipStep = readFileSync(path.join(ROOT, 'features/mvp1/steps/relationship/RelationshipStep.tsx'), 'utf8');
const authPage = readFileSync(path.join(ROOT, 'features/auth/AuthPage.tsx'), 'utf8');
const authCommercial = readFileSync(path.join(ROOT, 'auth-commercial.css'), 'utf8');
const registry = JSON.parse(readFileSync(path.join(ROOT, 'styles/antd-override-exceptions.json'), 'utf8'));

const retiredAuthClasses = [
  'auth-page-shell',
  'auth-page-inner',
  'auth-layout',
  'auth-hero-card',
  'auth-demo-list',
  'auth-card',
  'auth-tip',
  'auth-result',
  'auth-register-card',
  'auth-inline-title'
];

test('retired auth and relationship preset styles stay out of the bridge', () => {
  for (const className of [...retiredAuthClasses, 'relationship-preset-grid']) {
    assert.equal(bridge.includes(`.${className}`), false, `${className} must not return to antd-bridge.css`);
  }
  assert.match(authCommercial, /\.commercial-auth-shell/);
});

test('active auth entry only uses the commercial auth system', () => {
  assert.match(authPage, /commercial-auth-/);
  for (const className of retiredAuthClasses) {
    const exactClassToken = new RegExp(`className=["'][^"']*(?:^|\\s)${className}(?:\\s|$)`);
    assert.doesNotMatch(authPage, exactClassToken);
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
