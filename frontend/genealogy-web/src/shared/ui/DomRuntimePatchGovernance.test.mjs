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
  const registry = read('app/moduleRegistry.tsx');
  const memberPage = read('features/members/MemberManagementPage.tsx');
  assert.equal(app.includes("import { MemberInvitationAction }"), false);
  assert.match(registry, /key: 'memberManage'[\s\S]*standardModulePage\('memberManage'[\s\S]*<MemberManagementPage \/>/);
  assert.match(memberPage, /<MemberInvitationAction \/>/);
});

test('source draft delete keeps a usable source detail action target', () => {
  const sourceDelete = read('features/sources/SourceDraftDeleteAction.tsx');
  assert.match(sourceDelete, /data-source-detail-actions/);
  assert.match(sourceDelete, /source-library-detail-title/);
  assert.match(sourceDelete, /createPortal/);
});

test('lineage drawer actions remain accessible without entry-layer node movement', () => {
  const styles = read('features/tree/lineage-tabbed-page.css');
  assert.match(styles, /\.lineage-inspector-drawer \.lineage-inspector-actions/);
  assert.match(styles, /order:\s*-1/);
  assert.match(styles, /position:\s*sticky/);
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
