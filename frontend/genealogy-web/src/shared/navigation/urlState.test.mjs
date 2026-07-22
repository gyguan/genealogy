import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.navigation-test/shared/navigation/urlState.js');
const { buildViewUrl } = await import(pathToFileURL(modulePath).href);

test('home keeps only home URL state', () => {
  const next = buildViewUrl('home', 'https://example.test/?reviewTab=submitted&mode=branch&personDepth=3&branchDepth=8&direction=both&relations=blood,ritual,marriage&personBranchId=12&personRelations=blood,marriage&branchRelations=blood,status&includeSubBranches=true&step=generation&quality=source_gap&sourceId=16&role=viewer&type=person&historyPage=1&historyPageSize=10&status=pending&branchId=10&personId=173&tab=object&clanId=4&objectType=review_task&auditAction=person_update&auditTarget=person&riskEvent=permission_change');
  assert.equal(next, '/?clanId=4');
});

test('target view keeps only its allowlisted parameters', () => {
  const next = buildViewUrl('reviewCenter', 'https://example.test/?clanId=4&mode=branch&personId=173&reviewTab=submitted&status=pending');
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'reviewCenter');
  assert.equal(url.searchParams.get('clanId'), '4');
  assert.equal(url.searchParams.get('reviewTab'), 'submitted');
  assert.equal(url.searchParams.get('status'), 'pending');
  assert.equal(url.searchParams.has('mode'), false);
  assert.equal(url.searchParams.has('personId'), false);
});

test('tree product navigation preserves independent tab query state', () => {
  const next = buildViewUrl('treeProduct', 'https://example.test/?view=treeProduct&clanId=4&branchId=20&personBranchId=10&personId=173&mode=branch&personDepth=2&branchDepth=8&direction=both&personRelations=blood,marriage&branchRelations=blood,status&includeSubBranches=false&reviewTab=submitted');
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'treeProduct');
  assert.equal(url.searchParams.get('clanId'), '4');
  assert.equal(url.searchParams.get('branchId'), '20');
  assert.equal(url.searchParams.get('personBranchId'), '10');
  assert.equal(url.searchParams.get('personId'), '173');
  assert.equal(url.searchParams.get('mode'), 'branch');
  assert.equal(url.searchParams.get('personDepth'), '2');
  assert.equal(url.searchParams.get('branchDepth'), '8');
  assert.equal(url.searchParams.get('direction'), 'both');
  assert.equal(url.searchParams.get('personRelations'), 'blood,marriage');
  assert.equal(url.searchParams.get('branchRelations'), 'blood,status');
  assert.equal(url.searchParams.get('includeSubBranches'), 'false');
  assert.equal(url.searchParams.has('reviewTab'), false);
});

test('explicit target parameters are filtered by the target allowlist', () => {
  const next = buildViewUrl('treeProduct', 'https://example.test/?clanId=4&reviewTab=submitted', {
    params: new URLSearchParams('branchId=10&personBranchId=12&mode=branch&personRelations=blood,marriage&branchRelations=blood,status&reviewTab=pending')
  });
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'treeProduct');
  assert.equal(url.searchParams.get('branchId'), '10');
  assert.equal(url.searchParams.get('personBranchId'), '12');
  assert.equal(url.searchParams.get('mode'), 'branch');
  assert.equal(url.searchParams.get('personRelations'), 'blood,marriage');
  assert.equal(url.searchParams.get('branchRelations'), 'blood,status');
  assert.equal(url.searchParams.has('reviewTab'), false);
});

test('person detail path does not inherit unrelated query state', () => {
  const next = buildViewUrl('personArchive', 'https://example.test/?clanId=4&mode=branch&reviewTab=submitted', {
    pathname: '/persons/173'
  });
  assert.equal(next, '/persons/173?clanId=4&view=personArchive');
});
