import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.tree-test/features/tree/lineageUrlState.js');
const { readLineageUrlState, withLineageUrlState } = await import(pathToFileURL(modulePath).href);

test('reads independent person and branch tab state', () => {
  const state = readLineageUrlState('https://example.test/?view=treeProduct&clanId=1&branchId=20&personBranchId=10&personId=3&mode=branch&personDepth=2&branchDepth=12&direction=ancestors&personRelations=blood,marriage&branchRelations=blood,status&includeSubBranches=false');
  assert.deepEqual(state, {
    clanId: '1',
    branchId: '20',
    personBranchId: '10',
    personId: '3',
    mode: 'branch',
    personDepth: '2',
    branchDepth: '12',
    direction: 'ancestors',
    relationScopes: ['blood', 'status'],
    personRelationScopes: ['blood', 'marriage'],
    branchRelationScopes: ['blood', 'status'],
    includeSubBranches: false
  });
});

test('normalizes person depth to one through three and keeps legacy links compatible', () => {
  const state = readLineageUrlState('https://example.test/?view=treeProduct&branchId=2&personId=3&personDepth=8&relations=blood,status,invalid');
  assert.equal(state.personDepth, '1');
  assert.equal(state.personBranchId, '2');
  assert.deepEqual(state.personRelationScopes, ['blood', 'status']);
  assert.deepEqual(state.branchRelationScopes, ['blood', 'status']);
  assert.deepEqual(state.relationScopes, ['blood', 'status']);
});

test('writes only non-default independent tab state and removes unrelated parameters', () => {
  const next = withLineageUrlState('https://example.test/?view=reviewCenter&reviewTab=submitted&status=pending', {
    clanId: '11',
    branchId: '22',
    personBranchId: '33',
    personId: '44',
    mode: 'person',
    personDepth: '1',
    branchDepth: '8',
    direction: 'both',
    relationScopes: ['blood', 'ritual', 'marriage'],
    personRelationScopes: ['blood', 'ritual', 'marriage'],
    branchRelationScopes: ['blood', 'ritual', 'marriage'],
    includeSubBranches: true
  });
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'treeProduct');
  assert.equal(url.searchParams.get('branchId'), '22');
  assert.equal(url.searchParams.get('personBranchId'), '33');
  assert.equal(url.searchParams.get('personId'), '44');
  assert.equal(url.searchParams.has('mode'), false);
  assert.equal(url.searchParams.has('personDepth'), false);
  assert.equal(url.searchParams.has('branchDepth'), false);
  assert.equal(url.searchParams.has('personRelations'), false);
  assert.equal(url.searchParams.has('branchRelations'), false);
  assert.equal(url.searchParams.has('reviewTab'), false);
  assert.equal(url.searchParams.has('status'), false);
});

test('writes non-default options for both tabs', () => {
  const next = withLineageUrlState('https://example.test/', {
    clanId: '11',
    branchId: '22',
    personBranchId: '22',
    personId: '',
    mode: 'branch',
    personDepth: '3',
    branchDepth: '12',
    direction: 'ancestors',
    relationScopes: ['blood', 'status'],
    personRelationScopes: ['blood', 'marriage'],
    branchRelationScopes: ['ritual', 'status'],
    includeSubBranches: false
  });
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('mode'), 'branch');
  assert.equal(url.searchParams.get('personDepth'), '3');
  assert.equal(url.searchParams.get('branchDepth'), '12');
  assert.equal(url.searchParams.get('direction'), 'ancestors');
  assert.equal(url.searchParams.get('personRelations'), 'blood,marriage');
  assert.equal(url.searchParams.get('branchRelations'), 'ritual,status');
  assert.equal(url.searchParams.get('includeSubBranches'), 'false');
  assert.equal(url.searchParams.has('personBranchId'), false);
});
