import test from 'node:test';
import assert from 'node:assert/strict';
import { relationshipName } from '../../../.person-edit-test/features/persons/personDetailModel.js';

const relationship = {
  fromPersonId: 101,
  fromPersonName: '黄甲',
  toPersonId: 202,
  toPersonName: '黄乙'
};

test('relationship name resolves the opposite endpoint for the current person', () => {
  assert.equal(relationshipName(relationship, '101'), '黄乙');
  assert.equal(relationshipName(relationship, '202'), '黄甲');
});

test('relationship name keeps explicit endpoint semantics', () => {
  assert.equal(relationshipName(relationship, 'from'), '黄甲');
  assert.equal(relationshipName(relationship, 'to'), '黄乙');
});
