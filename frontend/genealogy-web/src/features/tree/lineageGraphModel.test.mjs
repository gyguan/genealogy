import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.tree-test/features/tree/lineageGraphModel.js');
const { buildLineageLayout } = await import(pathToFileURL(modulePath).href);

function node(id, generationNo) {
  return { nodeId: id, personId: Number(id.replace(/\D/g, '')) || null, displayName: id, visibility: 'visible', generationNo };
}

function edge(id, from, to, relationType = 'parent_child', relationCategory = 'blood') {
  return { edgeId: id, fromNodeId: from, toNodeId: to, relationType, relationCategory, visibility: 'visible', isLineageRelation: relationType !== 'spouse' };
}

function graph(nodes, edges, rootNodeId = nodes[0]?.nodeId || null, warnings = []) {
  return { rootNodeId, direction: 'both', dataView: 'official', nodes, edges, meta: { requestedDepth: 5, appliedDepth: 5, nodeCount: nodes.length, edgeCount: edges.length, truncated: false, truncationReasons: [], cycleDetected: false, duplicateEdgeCount: 0, generatedAt: '2026-07-14T00:00:00Z' }, warnings };
}

test('parent edges determine layers instead of generation peers', () => {
  const layout = buildLineageLayout(graph([node('p1', 1), node('p2', 1), node('p3', 2)], [edge('e1', 'p1', 'p3')]));
  const positions = new Map(layout.nodes.map(item => [item.id, item]));
  assert.equal(positions.get('p1').layer, 0);
  assert.equal(positions.get('p2').isolated, true);
  assert.ok(positions.get('p3').layer > positions.get('p1').layer);
  assert.equal(layout.edges.length, 1);
});

test('multi-parent DAG keeps one child node and both relationship edges', () => {
  const layout = buildLineageLayout(graph([node('father', 1), node('ritualFather', 1), node('child', 2)], [edge('blood', 'father', 'child'), edge('ritual', 'ritualFather', 'child', 'successor', 'ritual')]));
  assert.equal(layout.nodes.filter(item => item.id === 'child').length, 1);
  assert.deepEqual(new Set(layout.edges.map(item => item.id)), new Set(['blood', 'ritual']));
  assert.equal(layout.roots.length, 2);
  assert.ok(layout.notices.some(item => item.code === 'multiple_roots'));
});

test('spouses share one visual layer and use spouse edge semantics', () => {
  const layout = buildLineageLayout(graph([node('parent', 1), node('spouse', 2), node('child', 3)], [edge('marriage', 'parent', 'spouse', 'spouse', 'marriage'), edge('child', 'parent', 'child')]));
  const positions = new Map(layout.nodes.map(item => [item.id, item]));
  assert.equal(positions.get('parent').layer, positions.get('spouse').layer);
  assert.equal(layout.edges.find(item => item.id === 'marriage').kind, 'spouse');
  assert.ok(positions.get('child').layer > positions.get('parent').layer);
});

test('cycle data produces finite unique layout', () => {
  const input = graph([node('a', 1), node('b', 2), node('c', 3)], [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('ca', 'c', 'a')], 'a', [{ code: 'cycle_detected', message: '检测到环', count: 1 }]);
  input.meta.cycleDetected = true;
  const layout = buildLineageLayout(input);
  assert.equal(layout.nodes.length, 3);
  assert.equal(new Set(layout.nodes.map(item => item.id)).size, 3);
  assert.equal(layout.edges.length, 3);
  assert.ok(layout.notices.some(item => item.code === 'cycle_detected'));
});

test('collapsing one parent preserves a child reachable from another path', () => {
  const input = graph([node('root', 1), node('other', 1), node('child', 2), node('grandchild', 3)], [edge('r-child', 'root', 'child'), edge('o-child', 'other', 'child', 'successor', 'ritual'), edge('child-grand', 'child', 'grandchild')], 'root');
  const rootCollapsed = buildLineageLayout(input, new Set(['root']));
  assert.ok(rootCollapsed.nodes.some(item => item.id === 'child'));
  assert.ok(rootCollapsed.nodes.some(item => item.id === 'grandchild'));
  const allParentsCollapsed = buildLineageLayout(input, new Set(['root', 'other']));
  assert.ok(!allParentsCollapsed.nodes.some(item => item.id === 'child'));
});

test('isolated nodes and backend truncation warnings remain visible', () => {
  const input = graph([node('root', 1), node('isolated', 9)], [], 'root', [{ code: 'node_limit_reached', message: '节点已截断', count: 1 }]);
  input.meta.truncated = true;
  input.meta.truncationReasons = ['max_nodes'];
  const layout = buildLineageLayout(input);
  assert.deepEqual(new Set(layout.isolatedNodeIds), new Set(['root', 'isolated']));
  assert.ok(layout.notices.some(item => item.code === 'node_limit_reached'));
  assert.ok(layout.notices.some(item => item.code === 'isolated_nodes'));
});
