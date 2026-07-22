import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.tree-test/features/tree/lineageSemanticsModel.js');
const {
  edgeIndicators,
  edgeVisual,
  nodeIndicators,
  relationshipDisplayLabel,
  summaryText
} = await import(pathToFileURL(modulePath).href);

function edge(overrides = {}) {
  return {
    edgeId: 'relationship-1',
    relationshipId: 1,
    fromNodeId: 'person-1',
    toNodeId: 'person-2',
    relationType: 'parent_child',
    relationCategory: 'blood',
    visibility: 'visible',
    ...overrides
  };
}

function node(overrides = {}) {
  return {
    nodeId: 'person-1',
    personId: 1,
    displayName: '甲',
    visibility: 'visible',
    ...overrides
  };
}

test('relationship matrix exposes accessible Chinese semantics', () => {
  assert.deepEqual(edgeVisual(edge()), {
    tone: 'blood',
    label: '亲子',
    description: '亲子血缘关系，使用实线箭头表示',
    marker: 'arrow'
  });
  assert.equal(relationshipDisplayLabel(edge({ isBiological: false })), '法定亲子');

  const ritual = edgeVisual(edge({ relationType: 'successor', relationCategory: 'ritual', ritualRelationType: 'successor' }));
  assert.equal(ritual.tone, 'ritual');
  assert.equal(ritual.label, '承嗣');
  assert.equal(ritual.marker, 'ritual');

  const spouse = edgeVisual(edge({ relationType: 'spouse', relationCategory: 'marriage', isPrimary: false }));
  assert.equal(spouse.tone, 'marriage');
  assert.equal(spouse.label, '继配/侧室');
  assert.equal(spouse.marker, 'none');

  const status = edgeVisual(edge({ relationType: 'no_descendant', relationCategory: 'status' }));
  assert.equal(status.tone, 'status');
  assert.equal(status.label, '无嗣');
});

test('client-inferred siblings use explicit peer semantics without an arrow', () => {
  const sibling = edgeVisual(edge({
    relationType: 'other',
    relationCategory: 'blood',
    relationLabel: '姐妹',
    clientRelationKind: 'sibling',
    isLineageRelation: false
  }));
  assert.deepEqual(sibling, {
    tone: 'blood',
    label: '姐妹',
    description: '姐妹同辈关系，使用无箭头连线表示',
    marker: 'none'
  });

  const ritualSibling = edgeVisual(edge({
    relationType: 'other',
    relationCategory: 'ritual',
    relationLabel: '兄弟',
    clientRelationKind: 'sibling',
    isBiological: false,
    isLineageRelation: false
  }));
  assert.equal(ritualSibling.tone, 'ritual');
  assert.equal(ritualSibling.marker, 'none');
});

test('technical relation codes display as Chinese', () => {
  const values = [
    [104, 101, 105, 114, 95, 115, 111, 110],
    [104, 101, 105, 114, 95, 115, 117, 99, 99, 101, 115, 115, 111, 114],
    [104, 101, 105, 114, 95, 115, 117, 99, 101, 115, 115, 111, 114]
  ].map(codes => String.fromCharCode(...codes));
  for (const relationLabel of values) {
    assert.equal(relationshipDisplayLabel(edge({ relationType: 'other', relationCategory: 'ritual', relationLabel })), '嗣子');
  }
  assert.equal(relationshipDisplayLabel(edge({ relationType: 'other', relationLabel: '家族自定义关系' })), '家族自定义关系');
});

test('node indicators prioritize severe risks over evidence and review notices', () => {
  assert.deepEqual(nodeIndicators(node()), []);
  const indicators = nodeIndicators(node({
    evidenceSummary: { bindingCount: 1, officialBindingCount: 0, confidenceLevel: 'low', missingOfficialEvidence: true },
    reviewSummary: { state: 'rejected', pendingTaskCount: 0, rejectedTaskCount: 1 },
    anomalySummary: { codes: ['generation_mismatch', 'relationship_conflict'], count: 2, highestRisk: 'high' }
  }));
  assert.deepEqual(indicators.map(item => item.label), ['关系冲突', '审核驳回', '缺少正式证据', '世次异常']);
  assert.equal(indicators[0].tone, 'danger');
  assert.equal(indicators[0].glyph, '冲');
});

test('edge indicators expose distinct glyphs and severity ordering', () => {
  const indicators = edgeIndicators(edge({
    evidenceSummary: { bindingCount: 2, officialBindingCount: 2, confidenceLevel: 'low', missingOfficialEvidence: false },
    reviewSummary: { state: 'pending', pendingTaskCount: 1, rejectedTaskCount: 0 },
    anomalySummary: { codes: ['possible_duplicate'], count: 1, highestRisk: 'medium' }
  }));
  assert.deepEqual(indicators.map(item => item.label), ['低可信', '疑似重复', '待审核']);
  assert.deepEqual(indicators.map(item => item.glyph), ['低', '重', '审']);
});

test('masked objects never expose internal summary indicators', () => {
  assert.deepEqual(nodeIndicators(node({
    visibility: 'masked',
    evidenceSummary: { bindingCount: 9, officialBindingCount: 0, confidenceLevel: 'low', missingOfficialEvidence: true },
    anomalySummary: { codes: ['relationship_conflict'], count: 1, highestRisk: 'high' }
  })), [{ code: 'privacy', label: '隐私保护', tone: 'neutral', glyph: '私' }]);
  assert.deepEqual(edgeIndicators(edge({
    visibility: 'masked',
    reviewSummary: { state: 'rejected', pendingTaskCount: 0, rejectedTaskCount: 1 }
  })), []);
});

test('summary text localizes backend review and risk values', () => {
  assert.equal(summaryText(), '');
  assert.equal(summaryText(
    { bindingCount: 3, officialBindingCount: 2, confidenceLevel: 'high', missingOfficialEvidence: false },
    { state: 'pending', pendingTaskCount: 1, rejectedTaskCount: 0 },
    { codes: ['possible_duplicate'], count: 1, highestRisk: 'medium' }
  ), '证据 2/3 · 审核：待审核 · 异常 1 · 中风险');
});
