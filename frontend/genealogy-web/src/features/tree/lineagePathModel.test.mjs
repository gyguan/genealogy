import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.tree-test/features/tree/lineagePathModel.js');
const { findLineagePath } = await import(pathToFileURL(modulePath).href);

function graph() {
  return {
    rootNodeId: 'a',
    direction: 'both',
    dataView: 'official',
    nodes: ['a', 'b', 'c', 'd'].map((nodeId, index) => ({ nodeId, personId: index + 1, displayName: nodeId, visibility: 'visible' })),
    edges: [
      { edgeId: 'ab', fromNodeId: 'a', toNodeId: 'b', relationType: 'parent_child', relationCategory: 'blood', visibility: 'visible' },
      { edgeId: 'bc', fromNodeId: 'b', toNodeId: 'c', relationType: 'successor', relationCategory: 'ritual', visibility: 'visible' },
      { edgeId: 'bd', fromNodeId: 'b', toNodeId: 'd', relationType: 'spouse', relationCategory: 'marriage', visibility: 'visible' }
    ],
    meta: { requestedDepth: 5, appliedDepth: 5, nodeCount: 4, edgeCount: 3, truncated: false, truncationReasons: [], cycleDetected: false, duplicateEdgeCount: 0, generatedAt: '2026-07-15T00:00:00Z' },
    warnings: []
  };
}

test('finds the shortest visible path across blood and ritual edges', () => {
  assert.deepEqual(findLineagePath(graph(), 'a', 'c'), {
    nodeIds: ['a', 'b', 'c'],
    edgeIds: ['ab', 'bc']
  });
});

test('treats visible spouse relationships as navigable without adding direction', () => {
  assert.deepEqual(findLineagePath(graph(), 'd', 'a'), {
    nodeIds: ['d', 'b', 'a'],
    edgeIds: ['bd', 'ab']
  });
});

test('returns empty path when either endpoint is outside the authorized graph', () => {
  assert.deepEqual(findLineagePath(graph(), 'a', 'hidden'), { nodeIds: [], edgeIds: [] });
});
