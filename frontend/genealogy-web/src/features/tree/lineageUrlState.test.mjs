import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.tree-test/features/tree/lineageUrlState.js');
const { readLineageUrlState, withLineageUrlState } = await import(pathToFileURL(modulePath).href);

test('reads valid lineage state and falls back from invalid values', () => {
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
    dataView: 'editing',
    includeSubBranches: false,
    searchScope: 'branch'
  });
});

test('writes lineage state without removing the global view parameter', () => {
  const next = withLineageUrlState('https://example.test/?view=treeProduct', {
    clanId: '11',
    branchId: '22',
    personId: '33',
    mode: 'person',
    personDepth: '5',
    branchDepth: '8',
    direction: 'both',
    relationScopes: ['blood', 'ritual', 'marriage'],
    dataView: 'official',
    includeSubBranches: true,
    searchScope: 'clan'
  });
  const url = new URL(next, 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'treeProduct');
  assert.equal(url.searchParams.get('personId'), '33');
  assert.equal(url.searchParams.get('relations'), 'blood,ritual,marriage');
});
