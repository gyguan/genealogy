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

function resolveLocalReference(reference) {
  if (!reference?.startsWith('#/')) return;
  const value = reference
    .slice(2)
    .split('/')
    .reduce((current, segment) => current?.[segment], openapi);
  if (!value) fail(`Unresolved local OpenAPI reference: ${reference}`);
}

function visit(value) {
  if (Array.isArray(value)) {
    value.forEach(visit);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.$ref) resolveLocalReference(value.$ref);
  Object.values(value).forEach(visit);
}

visit(openapi);

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

for (const pageName of ['CultureItemPage', 'MigrationEventPage', 'CultureSitePage']) {
  assertSameSet(Object.keys(schemas[pageName]?.properties || {}), ['items', 'page'], `${pageName} properties`);
  assertSameSet(schemas[pageName]?.required || [], ['items', 'page'], `${pageName} required`);
}

for (const summaryName of ['CultureItemSummaryResponse', 'MigrationEventSummaryResponse', 'CultureSiteSummaryResponse']) {
  const properties = schemas[summaryName]?.properties || {};
  if (!properties.allowedActions) fail(`${summaryName} must expose allowedActions`);
  if (!properties.version) fail(`${summaryName} must expose optimistic-lock version`);
  for (const forbidden of ['storagePath', 'checksum', 'oldPayload', 'newPayload']) {
    if (properties[forbidden]) fail(`${summaryName} must not expose ${forbidden}`);
  }
}

const cultureItemList = openapi.paths?.['/api/v1/clans/{clanId}/culture-items']?.get;
const pageSize = (cultureItemList?.parameters || []).find(parameter => parameter.name === 'pageSize');
if (!pageSize?.schema?.maximum) fail('culture item pageSize must have an upper bound');
if (schemas.CultureItemSummaryResponse?.properties?.content) {
  fail('CultureItemSummaryResponse must not expose full content');
}

const sourceTarget = schemas.SourceBindingCreateRequest?.properties?.targetType?.$ref;
if (sourceTarget !== '#/components/schemas/GenealogyTargetType') {
  fail('SourceBindingCreateRequest.targetType must use GenealogyTargetType');
}
const reviewTarget = schemas.ReviewSubmitRequest?.properties?.targetType?.$ref;
if (reviewTarget !== '#/components/schemas/GenealogyTargetType') {
  fail('ReviewSubmitRequest.targetType must use GenealogyTargetType');
}

console.log('Culture contract paths, schemas, target types, pagination bounds, privacy-safe summaries and local references are valid.');
