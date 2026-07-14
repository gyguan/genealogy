#!/usr/bin/env node
import { loadEffectiveOpenApi } from './openapi-loader.mjs';

const { openapi } = loadEffectiveOpenApi();
const schemas = openapi.components?.schemas || {};

function fail(message) {
  throw new Error(message);
}

function sorted(values) {
  return [...values].sort();
}

function assertSameSet(actual, expected, label) {
  const actualSorted = sorted(actual || []);
  const expectedSorted = sorted(expected);
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    fail(`${label} mismatch. expected=${expectedSorted.join(',')} actual=${actualSorted.join(',')}`);
  }
}

const targetTypes = ['culture_item', 'migration_event', 'culture_site'];
const genealogyTargetTypes = schemas.GenealogyTargetType?.enum || [];
for (const targetType of targetTypes) {
  if (!genealogyTargetTypes.includes(targetType)) fail(`GenealogyTargetType must include ${targetType}`);
}

assertSameSet(
  schemas.CultureCategory?.enum,
  [
    'surname_origin',
    'hall_name',
    'commandery',
    'family_instruction',
    'ancestor_instruction',
    'clan_rule',
    'genealogy_preface',
    'genealogy_rule',
    'person_story',
    'custom_tradition',
    'other'
  ],
  'CultureCategory'
);
assertSameSet(
  schemas.CultureDataStatus?.enum,
  ['draft', 'pending_review', 'official', 'rejected', 'archived'],
  'CultureDataStatus'
);
assertSameSet(
  schemas.CulturePrivacyLevel?.enum,
  ['public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed'],
  'CulturePrivacyLevel'
);
assertSameSet(
  schemas.CultureSiteType?.enum,
  ['ancestral_hall', 'ancestral_home', 'cemetery', 'memorial', 'other'],
  'CultureSiteType'
);

console.log('Culture target types and core enums are valid.');
