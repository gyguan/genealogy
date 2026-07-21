import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_ENTITY_NAVIGATION_GUARD,
  entityNavigationDecision,
  entityNavigationPrompt
} from '../../../.entity-navigation-test/shared/navigation/entityNavigationGuard.js';

test('clean page can leave directly', () => {
  assert.equal(entityNavigationDecision(EMPTY_ENTITY_NAVIGATION_GUARD), 'allow');
});

test('dirty page requires confirmation', () => {
  assert.equal(entityNavigationDecision({ dirty: true, busy: false }), 'confirm_dirty');
  assert.match(entityNavigationPrompt(), /尚未保存/);
});

test('submitting page blocks navigation before dirty confirmation', () => {
  assert.equal(entityNavigationDecision({ dirty: true, busy: true }), 'block_busy');
  assert.equal(entityNavigationDecision({ dirty: false, busy: true }), 'block_busy');
});
