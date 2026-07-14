#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadEffectiveOpenApi, repositoryRoot } from './openapi-loader.mjs';

const { openapi } = loadEffectiveOpenApi();
const schemas = openapi.components?.schemas || {};

const dtoMappings = {
  OperationLogResponse: ['backend/genealogy-backend/src/main/java/com/genealogy/operationlog/dto/OperationLogResponse.java', 'OperationLogResponse'],
  OperationLogStatsResponse: ['backend/genealogy-backend/src/main/java/com/genealogy/operationlog/dto/OperationLogStatsResponse.java', 'OperationLogStatsResponse'],
  OperationLogStatsItem: ['backend/genealogy-backend/src/main/java/com/genealogy/operationlog/dto/OperationLogStatsResponse.java', 'Item'],
  CheckTaskResponse: ['backend/genealogy-backend/src/main/java/com/genealogy/review/dto/CheckTaskResponse.java', 'CheckTaskResponse'],
  AuditRecordResponse: ['backend/genealogy-backend/src/main/java/com/genealogy/review/dto/AuditRecordResponse.java', 'AuditRecordResponse'],
  ReviewTaskDetailResponse: ['backend/genealogy-backend/src/main/java/com/genealogy/review/dto/ReviewTaskDetailResponse.java', 'ReviewTaskDetailResponse'],
  ReviewDiffResponse: ['backend/genealogy-backend/src/main/java/com/genealogy/review/dto/ReviewDiffResponse.java', 'ReviewDiffResponse'],
  FieldDiff: ['backend/genealogy-backend/src/main/java/com/genealogy/review/dto/ReviewDiffResponse.java', 'FieldDiff']
};

function fail(message) {
  throw new Error(message);
}

function sorted(values) {
  return [...values].sort();
}

function assertSameSet(actual, expected, label) {
  const actualSorted = sorted(actual);
  const expectedSorted = sorted(expected);
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    fail(`${label} mismatch. expected=${expectedSorted.join(',')} actual=${actualSorted.join(',')}`);
  }
}

function javaRecordFields(relativePath, recordName) {
  const source = fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
  const expression = new RegExp(`(?:public\\s+)?record\\s+${recordName}\\s*\\(([\\s\\S]*?)\\)\\s*\\{`);
  const match = source.match(expression);
  if (!match) fail(`Cannot find Java record ${recordName} in ${relativePath}`);
  return match[1]
    .split(',')
    .map(component => component.trim())
    .filter(Boolean)
    .map(component => {
      const name = component.match(/([A-Za-z_$][A-Za-z0-9_$]*)\s*$/)?.[1];
      if (!name) fail(`Cannot parse component '${component}' in ${recordName}`);
      return name;
    });
}

for (const [schemaName, [javaPath, recordName]] of Object.entries(dtoMappings)) {
  const schema = schemas[schemaName];
  if (!schema) fail(`Missing schema ${schemaName}`);
  const propertyNames = Object.keys(schema.properties || {});
  const recordFields = javaRecordFields(javaPath, recordName);
  assertSameSet(propertyNames, recordFields, `${schemaName} properties vs ${recordName}`);
  const expectedRequired = propertyNames.filter(name => !schema.properties?.[name]?.nullable);
  assertSameSet(schema.required || [], expectedRequired, `${schemaName} required fields`);
}

assertSameSet(
  Object.keys(schemas.OperationLogPage?.properties || {}),
  ['records', 'total', 'pageNo', 'pageSize', 'totalPages'],
  'OperationLogPage properties'
);
assertSameSet(
  schemas.OperationLogPage?.required || [],
  ['records', 'total', 'pageNo', 'pageSize', 'totalPages'],
  'OperationLogPage required fields'
);

const operationExpectations = {
  '/api/v1/logs/operations': {
    query: ['clanId', 'actorId', 'actionType', 'targetType', 'targetId', 'startTime', 'endTime', 'keyword', 'pageNo', 'pageSize'],
    response: 'ApiResponseOperationLogPage'
  },
  '/api/v1/logs/operations/stats': {
    query: ['clanId', 'actorId', 'actionType', 'targetType', 'targetId', 'startTime', 'endTime', 'keyword'],
    response: 'ApiResponseOperationLogStats'
  },
  '/api/v1/logs/operations/export.csv': {
    query: ['clanId', 'actorId', 'actionType', 'targetType', 'targetId', 'startTime', 'endTime', 'keyword'],
    response: null
  }
};

function resolveParameter(parameter) {
  const prefix = '#/components/parameters/';
  const reference = parameter?.['$ref'];
  if (!reference?.startsWith(prefix)) return parameter;
  return openapi.components?.parameters?.[reference.slice(prefix.length)] || parameter;
}

for (const [route, expectation] of Object.entries(operationExpectations)) {
  const operation = openapi.paths?.[route]?.get;
  if (!operation) fail(`Missing GET ${route}`);
  const queryParameters = (operation.parameters || [])
    .map(resolveParameter)
    .filter(parameter => parameter.in === 'query')
    .map(parameter => parameter.name);
  assertSameSet(queryParameters, expectation.query, `${route} query parameters`);

  const clanId = (operation.parameters || [])
    .map(resolveParameter)
    .find(parameter => parameter.name === 'clanId');
  if (!clanId?.required) fail(`${route} clanId must be required`);

  for (const status of ['400', '401', '403']) {
    if (!operation.responses?.[status]) fail(`${route} must define ${status} response`);
  }

  if (expectation.response) {
    const reference = operation.responses?.['200']?.content?.['application/json']?.schema?.['$ref'];
    if (reference !== `#/components/schemas/${expectation.response}`) {
      fail(`${route} response mismatch: ${reference}`);
    }
  } else if (!operation.responses?.['200']?.content?.['text/csv']) {
    fail(`${route} must define text/csv response`);
  }
}

const operationLogRequired = new Set(schemas.OperationLogResponse?.required || []);
for (const field of ['detail', 'requestId', 'clientIp']) {
  const property = schemas.OperationLogResponse?.properties?.[field];
  if (!property?.nullable) fail(`OperationLogResponse.${field} must remain nullable for minimum disclosure`);
  if (operationLogRequired.has(field)) fail(`OperationLogResponse.${field} must remain optional because null values are omitted`);
}

if (!schemas.ReviewTaskDetailResponse?.properties?.auditRecord) {
  fail('ReviewTaskDetailResponse must expose auditRecord');
}
if (schemas.ReviewTaskDetailResponse?.properties?.record) {
  fail('ReviewTaskDetailResponse must not expose stale field record');
}
if (!schemas.ReviewDiffResponse?.properties?.reviewTaskId || schemas.ReviewDiffResponse?.properties?.taskId) {
  fail('ReviewDiffResponse must use reviewTaskId');
}
if (!schemas.FieldDiff?.properties?.fieldName || schemas.FieldDiff?.properties?.field) {
  fail('FieldDiff must use fieldName');
}

console.log('Tracking contract matches backend DTO records, operation parameters, errors, optional nullable fields, and privacy semantics.');
