import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.tree-test/features/tree/lineageUrlState.js');
const { readLineageUrlState, withLineageUrlState } = await import(pathToFileURL(modulePath).href);

test('reads applied lineage state and ignores legacy view controls', () => {
  const state = readLineageUrlState('https://example.test/?view=treeProduct&clanId=1&branchId=2&personId=3&mode=branch&personDepth=99&branchDepth=12&direction=ancestors&relations=blood,status,invalid&dataView=editing&includeSubBranches=false&searchScope=branch');
  assert.deepEqual(state, {
    clanId: '1',
    branchId: '2',
    personId: '3',
    mode: 'branch',
    personDepth: '3',
    branchDepth: '12',
    direction: 'ancestors',
    relationScopes: ['blood', 'status'],
    includeSubBranches: false
  });
});

test('writes only non-default lineage state and removes unrelated parameters', () => {
  const next = withLineageUrlState('https://example.test/?view=reviewCenter&reviewTab=submitted&status=pending', {
    clanId: '11',
    branchId: '22',
    personId: '33',
    mode: 'person',
    personDepth: '3',
    branchDepth: '8',
    direction: 'both',
    relationScopes: ['blood', 'ritual', 'marriage'],
    includeSubBranches: true
  });
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'treeProduct');
  assert.equal(url.searchParams.get('personId'), '33');
  assert.equal(url.searchParams.has('mode'), false);
  assert.equal(url.searchParams.has('personDepth'), false);
  assert.equal(url.searchParams.has('branchDepth'), false);
  assert.equal(url.searchParams.has('direction'), false);
  assert.equal(url.searchParams.has('relations'), false);
  assert.equal(url.searchParams.has('includeSubBranches'), false);
  assert.equal(url.searchParams.has('reviewTab'), false);
  assert.equal(url.searchParams.has('status'), false);
});

test('writes non-default lineage options', () => {
  const next = withLineageUrlState('https://example.test/', {
    clanId: '11',
    branchId: '22',
    personId: '',
    mode: 'branch',
    personDepth: '5',
    branchDepth: '12',
    direction: 'ancestors',
    relationScopes: ['blood', 'status'],
    includeSubBranches: false
  });
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('mode'), 'branch');
  assert.equal(url.searchParams.get('personDepth'), '5');
  assert.equal(url.searchParams.get('branchDepth'), '12');
  assert.equal(url.searchParams.get('direction'), 'ancestors');
  assert.equal(url.searchParams.get('relations'), 'blood,status');
  assert.equal(url.searchParams.get('includeSubBranches'), 'false');
});
