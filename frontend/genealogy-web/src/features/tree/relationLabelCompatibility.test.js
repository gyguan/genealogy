import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const modulePath = path.resolve('.tree-test/features/tree/lineageSemanticsModel.js');
const { relationshipDisplayLabel } = await import(pathToFileURL(modulePath).href);
const edge = relationLabel => ({ edgeId: 'e', fromNodeId: 'person-1', toNodeId: 'person-2', relationType: 'other', relationLabel, relationCategory: 'ritual', visibility: 'visible' });
test('relation labels use Chinese text', () => {
  for (const value of ['\u0068\u0065\u0069\u0072_son', '\u0068\u0065\u0069\u0072_successor', '\u0068\u0065\u0069\u0072_sucessor']) assert.equal(relationshipDisplayLabel(edge(value)), '嗣子');
  assert.equal(relationshipDisplayLabel(edge('家族自定义关系')), '家族自定义关系');
});
