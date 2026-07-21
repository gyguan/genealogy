import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const relationshipStepSource = readFileSync(new URL('./RelationshipStep.tsx', import.meta.url), 'utf8');
const relationshipServiceSource = readFileSync(new URL('../../services/relationshipService.ts', import.meta.url), 'utf8');
const wizardEnhancementStyles = readFileSync(new URL('../../../../mvp1-wizard-enhancements.css', import.meta.url), 'utf8');

test('wizard relationship list exposes the shared draft delete action', () => {
  assert.match(relationshipStepSource, /import \{ DraftDeleteButton \}/);
  assert.match(relationshipStepSource, /label="删除草稿"/);
  assert.match(relationshipStepSource, /objectType="关系"/);
  assert.match(relationshipStepSource, /onDelete=\{\(\) => deleteRelationshipApi\(row\.id!\)\}/);
  assert.match(relationshipStepSource, /onDeleted=\{\(\) => afterDeleteRelationship\(row\)\}/);
});

test('wizard relationship delete uses the existing relationship DELETE endpoint', () => {
  assert.match(relationshipServiceSource, /apiClient\.delete\(`\/relationships\/\$\{relationshipId\}`\)/);
});

test('relationship delete completion clears stale selection and reloads the list', () => {
  assert.match(relationshipStepSource, /setSelectedRelationshipRowKeys\(prev => prev\.filter/);
  assert.match(relationshipStepSource, /workspace\.setRelationshipId\(''\)/);
  assert.match(relationshipStepSource, /await loadRelationships\(centerPersonId \|\| workspace\.personId\)/);
});

test('relationship delete remains in the existing operation column with tracking', () => {
  assert.match(relationshipStepSource, /<TrackingLinkButton[^>]+targetType="relationship"/);
  assert.match(relationshipStepSource, /<Space size=\{4\} wrap>/);
  assert.match(relationshipStepSource, /buttonProps=\{\{ size: 'small', type: 'link' \}\}/);
});

test('relationship save actions are right aligned within the wizard step', () => {
  assert.match(
    wizardEnhancementStyles,
    /\.relationship-step-panel > \.ant-space-vertical > \.ant-space-item > \.ant-space:has\(> \.ant-space-item > button\),[\s\S]*?\{\s*justify-content:\s*flex-end;\s*width:\s*100%;/
  );
});
