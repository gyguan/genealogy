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

test('node indicators only reflect backend-provided summaries', () => {
  assert.deepEqual(nodeIndicators(node()), []);
  const indicators = nodeIndicators(node({
    evidenceSummary: { bindingCount: 1, officialBindingCount: 0, confidenceLevel: 'low', missingOfficialEvidence: true },
    reviewSummary: { state: 'rejected', pendingTaskCount: 0, rejectedTaskCount: 1 },
    anomalySummary: { codes: ['generation_mismatch', 'relationship_conflict'], count: 2, highestRisk: 'high' }
  }));
  assert.deepEqual(indicators.map(item => item.label), ['缺少正式证据', '审核驳回', '世次异常', '关系冲突']);
  assert.equal(indicators.find(item => item.code === 'relationship_conflict').tone, 'danger');
});

test('edge indicators expose evidence review and returned anomaly codes', () => {
  const indicators = edgeIndicators(edge({
    evidenceSummary: { bindingCount: 2, officialBindingCount: 2, confidenceLevel: 'low', missingOfficialEvidence: false },
    reviewSummary: { state: 'pending', pendingTaskCount: 1, rejectedTaskCount: 0 },
    anomalySummary: { codes: ['possible_duplicate'], count: 1, highestRisk: 'medium' }
  }));
  assert.deepEqual(indicators.map(item => item.label), ['低可信', '待审核', '疑似重复']);
});

test('masked objects never expose internal summary indicators', () => {
  assert.deepEqual(nodeIndicators(node({
    visibility: 'masked',
    evidenceSummary: { bindingCount: 9, officialBindingCount: 0, confidenceLevel: 'low', missingOfficialEvidence: true },
    anomalySummary: { codes: ['relationship_conflict'], count: 1, highestRisk: 'high' }
  })), [{ code: 'privacy', label: '隐私保护', tone: 'neutral' }]);
  assert.deepEqual(edgeIndicators(edge({
    visibility: 'masked',
    reviewSummary: { state: 'rejected', pendingTaskCount: 0, rejectedTaskCount: 1 }
  })), []);
});

test('summary text stays empty when backend omitted summaries', () => {
  assert.equal(summaryText(), '');
  assert.equal(summaryText(
    { bindingCount: 3, officialBindingCount: 2, confidenceLevel: 'high', missingOfficialEvidence: false },
    { state: 'pending', pendingTaskCount: 1, rejectedTaskCount: 0 },
    { codes: ['possible_duplicate'], count: 1, highestRisk: 'medium' }
  ), '证据 2/3 · 审核：pending · 异常 1');
});
