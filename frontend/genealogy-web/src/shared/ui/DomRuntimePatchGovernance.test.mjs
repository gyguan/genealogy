import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const sourceRoot = path.resolve('src');

function read(relativePath) {
  return readFileSync(path.join(sourceRoot, relativePath), 'utf8');
}

test('application entry contains no business DOM runtime patches', () => {
  const source = read('main.tsx');
  for (const forbidden of [
    'MutationObserver',
    'document.querySelector',
    'document.querySelectorAll',
    '.appendChild(',
    '.insertBefore(',
    'style.order',
    'textContent?.trim()'
  ]) {
    assert.equal(source.includes(forbidden), false, `main.tsx must not contain ${forbidden}`);
  }
});

test('member invitation is rendered inside the member module instead of the global header', () => {
  const app = read('app/App.tsx');
  const memberPage = read('features/members/MemberManagementPage.tsx');
  assert.equal(app.includes("import { MemberInvitationAction }"), false);
  assert.match(app, /case 'memberManage': return <MemberManagementPage \/>/);
  assert.match(memberPage, /<MemberInvitationAction \/>/);
});

test('runtime patch installers cannot be reintroduced', () => {
  const source = read('main.tsx');
  for (const installer of [
    'installTrackingMoreFilterTextSync',
    'installResultSortHeaderPlacement',
    'installMemberListHeaderPlacement',
    'installDetailActionUnification'
  ]) {
    assert.equal(source.includes(installer), false, `${installer} must remain removed`);
  }
});
