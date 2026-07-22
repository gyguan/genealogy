import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.tree-test/features/tree/personCenteredGraphModel.js');
const { buildDirectPersonGraph } = await import(pathToFileURL(modulePath).href);
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

test('person center graph keeps only the center and first-degree relatives', () => {
  const input = graph(
    [
      node('grandfather', 0, 'male'),
      node('father', 1, 'male'),
      node('mother', 1, 'female'),
      node('center', 2, 'male'),
      node('sister', 2, 'female'),
      node('spouse', 2, 'female'),
      node('son', 3, 'male'),
      node('grandson', 4, 'male')
    ],
    [
      edge('grandfather-father', 'grandfather', 'father'),
      edge('father-center', 'father', 'center'),
      edge('mother-center', 'mother', 'center'),
      edge('father-sister', 'father', 'sister'),
      edge('mother-sister', 'mother', 'sister'),
      edge('center-spouse', 'center', 'spouse', 'spouse', 'marriage'),
      edge('center-son', 'center', 'son'),
      edge('son-grandson', 'son', 'grandson')
    ]
  );

  const result = buildDirectPersonGraph(input);
  assert.deepEqual(
    new Set(result.nodes.map(item => item.nodeId)),
    new Set(['father', 'mother', 'center', 'sister', 'spouse', 'son'])
  );
  assert.ok(!result.nodes.some(item => item.nodeId === 'grandfather'));
  assert.ok(!result.nodes.some(item => item.nodeId === 'grandson'));
  assert.deepEqual(
    new Set(result.edges.map(item => item.edgeId)),
    new Set([
      'father-center',
      'mother-center',
      'center-spouse',
      'center-son',
      'client-direct-sibling-center-sister'
    ])
  );
  assert.equal(result.edges.find(item => item.edgeId === 'father-center')?.relationLabel, '父亲');
  assert.equal(result.edges.find(item => item.edgeId === 'mother-center')?.relationLabel, '母亲');
  assert.equal(result.edges.find(item => item.edgeId === 'center-spouse')?.relationLabel, '配偶');
  assert.equal(result.edges.find(item => item.edgeId === 'center-son')?.relationLabel, '儿子');
  const siblingEdge = result.edges.find(item => item.edgeId.includes('sibling'));
  assert.equal(siblingEdge?.relationLabel, '姐妹');
  assert.equal(siblingEdge?.clientRelationKind, 'sibling');
  assert.equal(siblingEdge?.isBiological, true);
  assert.equal(result.rootNodeId, 'center');
  assert.equal(result.clientLayoutMode, 'person-centered');
  assert.equal(result.meta.appliedDepth, 1);
  assert.equal(result.meta.nodeCount, 6);
  assert.equal(result.meta.edgeCount, 5);
});

test('ritual parent subtypes retain their business label and infer non-biological peers', () => {
  const centerSuccession = edge('ritual-center', 'ritual-parent', 'center', 'successor', 'ritual');
  centerSuccession.relationLabel = '承嗣';
  centerSuccession.ritualRelationType = 'successor';
  centerSuccession.isBiological = false;
  const siblingSuccession = edge('ritual-sibling', 'ritual-parent', 'ritual-sibling-person', 'successor', 'ritual');
  siblingSuccession.relationLabel = '承嗣';
  siblingSuccession.ritualRelationType = 'successor';
  siblingSuccession.isBiological = false;

  const result = buildDirectPersonGraph(graph(
    [node('ritual-parent', 1), node('center', 2), node('ritual-sibling-person', 2, 'male')],
    [centerSuccession, siblingSuccession]
  ));

  assert.equal(result.edges.find(item => item.edgeId === 'ritual-center')?.relationLabel, '承嗣');
  const siblingEdge = result.edges.find(item => item.edgeId.includes('client-direct-sibling'));
  assert.equal(siblingEdge?.relationLabel, '兄弟');
  assert.equal(siblingEdge?.clientRelationKind, 'sibling');
  assert.equal(siblingEdge?.relationCategory, 'ritual');
  assert.equal(siblingEdge?.isBiological, false);
});

test('explicit direct custom relations remain visible while unrelated peers are removed', () => {
  const custom = edge('direct-custom', 'center', 'guardian', 'other', 'status');
  custom.relationLabel = '监护';
  custom.isLineageRelation = false;
  const unrelated = edge('unrelated', 'peer-a', 'peer-b', 'other', 'status');
  unrelated.isLineageRelation = false;

  const result = buildDirectPersonGraph(graph(
    [node('center', 2), node('guardian', 2), node('peer-a', 2), node('peer-b', 2)],
    [custom, unrelated]
  ));

  assert.deepEqual(new Set(result.nodes.map(item => item.nodeId)), new Set(['center', 'guardian']));
  assert.deepEqual(result.edges.map(item => item.edgeId), ['direct-custom']);
  assert.equal(result.edges[0].relationLabel, '监护');
});

test('prototype treatment is loaded and explains the direct-relation view', () => {
  assert.match(serviceSource, /return buildDirectPersonGraph\(graph\);/);
  assert.match(portalSource, /import '\.\/person-centered-direct\.css';/);
  assert.match(css, /当前视图仅展示中心人物的直接关联人物/);
  assert.match(css, /\.lineage-logic-card--person \.lineage-graph-node\.is-active > rect/);
  assert.match(css, /\.lineage-logic-card--person \.lineage-graph-collapse\s*\{[\s\S]*?display:\s*none;/);
});
