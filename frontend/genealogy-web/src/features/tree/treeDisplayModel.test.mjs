import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.tree-test/features/tree/treeDisplayModel.js');
const lineageDoubleCardCss = readFileSync(new URL('./lineage-double-card.css', import.meta.url), 'utf8');
const {
  dataStatusText,
  graphCompletenessText,
  relationshipEndpointLabels,
  relationshipEndpointText,
  riskLevelText
} = await import(pathToFileURL(modulePath).href);

test('localizes data status and risk values', () => {
  assert.equal(dataStatusText('pending_review'), '待审核');
  assert.equal(dataStatusText('official'), '正式');
  assert.equal(riskLevelText('critical'), '严重风险');
});

test('describes graph truncation without presenting partial counts as totals', () => {
  assert.equal(graphCompletenessText({
    requestedDepth: 12,
    appliedDepth: 8,
    nodeCount: 500,
    edgeCount: 900,
    truncated: true,
    truncationReasons: ['max_nodes', 'max_depth'],
    cycleDetected: false,
    duplicateEdgeCount: 0,
    generatedAt: '2026-07-15T00:00:00Z'
  }), '已裁剪：达到人物数量上限、达到展开深度');
});

test('uses non-directional endpoints for spouse relationships', () => {
  const spouse = { relationCategory: 'marriage', relationType: 'spouse' };
  assert.equal(relationshipEndpointText(spouse, '甲', '乙'), '甲 ↔ 乙');
  assert.deepEqual(relationshipEndpointLabels(spouse), ['配偶一', '配偶二']);
});

test('uses peer endpoints for client-inferred sibling relationships', () => {
  const sibling = {
    relationCategory: 'blood',
    relationType: 'other',
    clientRelationKind: 'sibling'
  };
  assert.equal(relationshipEndpointText(sibling, '中心人物', '姐妹'), '中心人物 — 姐妹');
  assert.deepEqual(relationshipEndpointLabels(sibling), ['中心人物', '同辈人物']);
});

test('lineage result controls share the result title row on desktop', () => {
  assert.match(lineageDoubleCardCss, /\.lineage-double-card-result\s*\{\s*position:\s*relative;/);
  assert.match(lineageDoubleCardCss, /\.lineage-double-card-result > \.ant-card-head\s*\{\s*padding-right:\s*400px;/);
  assert.match(lineageDoubleCardCss, /\.lineage-result-toolbar--double-card\s*\{[\s\S]*position:\s*absolute;[\s\S]*top:\s*8px;[\s\S]*right:\s*16px;[\s\S]*width:\s*360px;/);
  assert.match(lineageDoubleCardCss, /@media \(max-width: 767px\)[\s\S]*\.lineage-result-toolbar--double-card,[\s\S]*position:\s*static;[\s\S]*width:\s*100%;/);
});
