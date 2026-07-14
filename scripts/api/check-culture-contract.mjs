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

assertSameSet(schemas.CultureCategory?.enum, [
  'surname_origin', 'hall_name', 'commandery', 'family_instruction',
  'ancestor_instruction', 'clan_rule', 'genealogy_preface',
  'genealogy_rule', 'person_story', 'custom_tradition', 'other'
], 'CultureCategory');
assertSameSet(schemas.CultureDataStatus?.enum,
  ['draft', 'pending_review', 'official', 'rejected', 'archived'],
  'CultureDataStatus');
assertSameSet(schemas.CulturePrivacyLevel?.enum,
  ['public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed'],
  'CulturePrivacyLevel');
assertSameSet(schemas.CultureSiteType?.enum,
  ['ancestral_hall', 'ancestral_home', 'cemetery', 'memorial', 'other'],
  'CultureSiteType');

const requiredOperations = {
  '/api/v1/clans/{clanId}/culture-overview': ['get'],
  '/api/v1/clans/{clanId}/culture-items': ['get', 'post'],
  '/api/v1/culture-items/{cultureItemId}': ['get', 'put', 'delete'],
  '/api/v1/culture-items/{cultureItemId}/submit-review': ['post'],
  '/api/v1/culture-items/{cultureItemId}/archive': ['post'],
  '/api/v1/clans/{clanId}/migration-events': ['get', 'post'],
  '/api/v1/migration-events/{migrationEventId}': ['get', 'put', 'delete'],
  '/api/v1/migration-events/{migrationEventId}/submit-review': ['post'],
  '/api/v1/clans/{clanId}/culture-sites': ['get', 'post'],
  '/api/v1/culture-sites/{cultureSiteId}': ['get', 'put', 'delete'],
  '/api/v1/culture-sites/{cultureSiteId}/submit-review': ['post']
};

for (const [route, methods] of Object.entries(requiredOperations)) {
  const pathItem = openapi.paths?.[route];
  if (!pathItem) fail(`Missing culture path ${route}`);
  for (const method of methods) {
    const operation = pathItem[method];
    if (!operation) fail(`Missing ${method.toUpperCase()} ${route}`);
    if (!(operation.tags || []).includes('Culture')) fail(`${method.toUpperCase()} ${route} must use Culture tag`);
    if (!operation.operationId) fail(`${method.toUpperCase()} ${route} must define operationId`);
  }
}

console.log('Culture target types, enums and required operations are valid.');
