import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.tree-test/features/tree/personCenteredGraphModel.js');
const { buildDirectPersonGraph, buildPersonCenteredGraph } = await import(pathToFileURL(modulePath).href);
const css = readFileSync(new URL('./person-centered-direct.css', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('./treeService.ts', import.meta.url), 'utf8');
const portalSource = readFileSync(new URL('./LineageTreeProductPagePortal.tsx', import.meta.url), 'utf8');

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

function graph(nodes, edges, rootNodeId = 'center') {
  return {
    rootNodeId,
    direction: 'both',
    dataView: 'official',
    nodes,
    edges,
    meta: {
      requestedDepth: 5,
      appliedDepth: 5,
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

function familyGraph() {
  return graph(
    [
      node('great-grandfather', -1, 'male'),
      node('grandfather', 0, 'male'),
      node('father', 1, 'male'),
      node('mother', 1, 'female'),
      node('center', 2, 'male'),
      node('sister', 2, 'female'),
      node('brother-in-law', 2, 'male'),
      node('niece', 3, 'female'),
      node('spouse', 2, 'female'),
      node('son', 3, 'male'),
      node('grandson', 4, 'male'),
      node('great-grandson', 5, 'male')
    ],
    [
      edge('great-grandfather-grandfather', 'great-grandfather', 'grandfather'),
      edge('grandfather-father', 'grandfather', 'father'),
      edge('father-center', 'father', 'center'),
      edge('mother-center', 'mother', 'center'),
      edge('father-sister', 'father', 'sister'),
      edge('mother-sister', 'mother', 'sister'),
      edge('sister-brother-in-law', 'sister', 'brother-in-law', 'spouse', 'marriage'),
      edge('sister-niece', 'sister', 'niece'),
      edge('center-spouse', 'center', 'spouse', 'spouse', 'marriage'),
      edge('center-son', 'center', 'son'),
      edge('son-grandson', 'son', 'grandson'),
      edge('grandson-great-grandson', 'grandson', 'great-grandson')
    ]
  );
}

test('one generation keeps only the center and direct relatives', () => {
  const result = buildPersonCenteredGraph(familyGraph(), 1);
  assert.deepEqual(
    new Set(result.nodes.map(item => item.nodeId)),
    new Set(['father', 'mother', 'center', 'sister', 'spouse', 'son'])
  );
  assert.ok(!result.nodes.some(item => item.nodeId === 'grandfather'));
  assert.ok(!result.nodes.some(item => item.nodeId === 'grandson'));
  assert.equal(result.edges.find(item => item.edgeId === 'father-center')?.relationLabel, '父亲');
  assert.equal(result.edges.find(item => item.edgeId === 'mother-center')?.relationLabel, '母亲');
  assert.equal(result.edges.find(item => item.edgeId === 'center-spouse')?.relationLabel, '配偶');
  assert.equal(result.edges.find(item => item.edgeId === 'center-son')?.relationLabel, '儿子');
  assert.equal(result.edges.find(item => item.edgeId.includes('sibling'))?.relationLabel, '姐妹');
  assert.equal(result.meta.appliedDepth, 1);
});

test('two generations expand one additional relationship layer', () => {
  const result = buildPersonCenteredGraph(familyGraph(), 2);
  assert.deepEqual(
    new Set(result.nodes.map(item => item.nodeId)),
    new Set([
      'grandfather',
      'father',
      'mother',
      'center',
      'sister',
      'brother-in-law',
      'niece',
      'spouse',
      'son',
      'grandson'
    ])
  );
  assert.ok(!result.nodes.some(item => item.nodeId === 'great-grandfather'));
  assert.ok(!result.nodes.some(item => item.nodeId === 'great-grandson'));
  assert.equal(result.meta.appliedDepth, 2);
});

test('three generations expand at most three relationship layers', () => {
  const result = buildPersonCenteredGraph(familyGraph(), 3);
  assert.ok(result.nodes.some(item => item.nodeId === 'great-grandfather'));
  assert.ok(result.nodes.some(item => item.nodeId === 'great-grandson'));
  assert.equal(result.meta.appliedDepth, 3);
});

test('direct graph compatibility remains equivalent to one generation', () => {
  assert.deepEqual(buildDirectPersonGraph(familyGraph()), buildPersonCenteredGraph(familyGraph(), 1));
});

test('explicit direct custom relations remain visible while unrelated peers are removed', () => {
  const custom = edge('direct-custom', 'center', 'guardian', 'other', 'status');
  custom.relationLabel = '监护';
  custom.isLineageRelation = false;
  const unrelated = edge('unrelated', 'peer-a', 'peer-b', 'other', 'status');
  unrelated.isLineageRelation = false;

  const result = buildPersonCenteredGraph(graph(
    [node('center', 2), node('guardian', 2), node('peer-a', 2), node('peer-b', 2)],
    [custom, unrelated]
  ), 1);

  assert.deepEqual(new Set(result.nodes.map(item => item.nodeId)), new Set(['center', 'guardian']));
  assert.deepEqual(result.edges.map(item => item.edgeId), ['direct-custom']);
  assert.equal(result.edges[0].relationLabel, '监护');
});

test('ritual direct relations retain their business labels', () => {
  const successor = edge('successor', 'ritual-parent', 'center', 'successor', 'ritual');
  successor.relationLabel = '承嗣';
  successor.ritualRelationType = 'successor';
  const result = buildPersonCenteredGraph(graph(
    [node('ritual-parent', 1), node('center', 2)],
    [successor]
  ), 1);
  assert.equal(result.edges[0].relationLabel, '承嗣');
  assert.equal(result.edges[0].relationCategory, 'ritual');
});

test('prototype treatment is loaded and service applies selected depth', () => {
  assert.match(serviceSource, /return buildPersonCenteredGraph\(graph, input\.depth\);/);
  assert.match(portalSource, /import '\.\/person-centered-direct\.css';/);
  assert.match(css, /按所选深度展示相关人物/);
  assert.match(css, /\.lineage-logic-card--person \.lineage-graph-node\.is-active > rect/);
  assert.doesNotMatch(css, /\.lineage-graph-collapse\s*\{[\s\S]*?display:\s*none;/);
});
