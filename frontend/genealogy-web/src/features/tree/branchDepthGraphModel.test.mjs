import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const modulePath = path.resolve('.tree-test/features/tree/branchDepthGraphModel.js');
const { buildBranchDepthGraph } = await import(pathToFileURL(modulePath).href);

function node(id, generationNo, gender = 'unknown') {
  return {
    nodeId: id,
    personId: Number(id.replace(/\D/g, '')) || null,
    displayName: id,
    visibility: 'visible',
    generationNo,
    gender
  };
}

function edge(id, from, to, relationType = 'parent_child', relationCategory = 'blood') {
  return {
    edgeId: id,
    relationshipId: Number(id.replace(/\D/g, '')) || null,
    fromNodeId: from,
    toNodeId: to,
    relationType,
    relationCategory,
    visibility: 'visible',
    isLineageRelation: relationType !== 'spouse'
  };
}

function branchGraph() {
  const nodes = [
    node('founder-1', 1, 'male'),
    node('spouse-1', 1, 'female'),
    node('child-2', 2, 'male'),
    node('spouse-2', 2, 'female'),
    node('grandchild-3', 3, 'male'),
    node('spouse-3', 3, 'female'),
    node('great-grandchild-4', 4, 'male'),
    node('spouse-4', 4, 'female'),
    node('fifth-5', 5, 'male')
  ];
  const edges = [
    edge('marriage-1', 'founder-1', 'spouse-1', 'spouse', 'marriage'),
    edge('father-child-2', 'founder-1', 'child-2'),
    edge('mother-child-2', 'spouse-1', 'child-2'),
    edge('marriage-2', 'child-2', 'spouse-2', 'spouse', 'marriage'),
    edge('father-grandchild-3', 'child-2', 'grandchild-3'),
    edge('mother-grandchild-3', 'spouse-2', 'grandchild-3'),
    edge('marriage-3', 'grandchild-3', 'spouse-3', 'spouse', 'marriage'),
    edge('father-great-grandchild-4', 'grandchild-3', 'great-grandchild-4'),
    edge('mother-great-grandchild-4', 'spouse-3', 'great-grandchild-4'),
    edge('marriage-4', 'great-grandchild-4', 'spouse-4', 'spouse', 'marriage'),
    edge('father-fifth-5', 'great-grandchild-4', 'fifth-5'),
    edge('mother-fifth-5', 'spouse-4', 'fifth-5')
  ];
  return {
    rootNodeId: 'founder-1',
    direction: 'descendants',
    dataView: 'official',
    nodes,
    edges,
    meta: {
      requestedDepth: 12,
      appliedDepth: 12,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      truncated: false,
      truncationReasons: [],
      cycleDetected: false,
      duplicateEdgeCount: 0,
      generatedAt: '2026-07-22T00:00:00Z'
    },
    warnings: []
  };
}

test('three generations exclude fourth generation even when every spouse is a lineage seed candidate', () => {
  const result = buildBranchDepthGraph(branchGraph(), 3);
  assert.deepEqual(
    new Set(result.nodes.map(item => item.nodeId)),
    new Set(['founder-1', 'spouse-1', 'child-2', 'spouse-2', 'grandchild-3', 'spouse-3'])
  );
  assert.ok(!result.nodes.some(item => item.nodeId === 'great-grandchild-4'));
  assert.equal(result.meta.appliedDepth, 3);
  assert.ok(result.meta.truncationReasons.includes('max_depth'));
  assert.equal(result.warnings.find(item => item.code === 'depth_limit_reached')?.count, 3);
});

test('five generations expand beyond the three-generation result', () => {
  const source = branchGraph();
  const shallow = buildBranchDepthGraph(source, 3);
  const deep = buildBranchDepthGraph(source, 5);
  assert.ok(deep.nodes.length > shallow.nodes.length);
  assert.ok(deep.nodes.some(item => item.nodeId === 'great-grandchild-4'));
  assert.ok(deep.nodes.some(item => item.nodeId === 'fifth-5'));
  assert.equal(deep.nodes.length, source.nodes.length);
  assert.equal(deep.meta.appliedDepth, 5);
  assert.equal(deep.warnings.some(item => item.code === 'depth_limit_reached'), false);
});

test('one generation keeps the founder and same-generation spouse only', () => {
  const result = buildBranchDepthGraph(branchGraph(), 1);
  assert.deepEqual(
    new Set(result.nodes.map(item => item.nodeId)),
    new Set(['founder-1', 'spouse-1'])
  );
  assert.equal(result.edges.length, 1);
  assert.equal(result.edges[0].relationType, 'spouse');
});
