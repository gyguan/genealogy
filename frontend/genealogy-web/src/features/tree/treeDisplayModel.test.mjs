import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.tree-test/features/tree/treeDisplayModel.js');
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
