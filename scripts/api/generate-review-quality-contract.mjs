#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadEffectiveOpenApi, repositoryRoot } from './openapi-loader.mjs';

const operationOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/review-quality-api-contract.ts');
const typesOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/review-quality-types.ts');
const methods = ['get', 'post'];
const schemaNames = [
  'ReviewQualityCheckMode',
  'ReviewQualityCheckStatus',
  'ReviewQualityCheckScopeType',
  'ReviewQualityBlockLevel',
  'ReviewQualityRuleOutcome',
  'ReviewQualityCheckQueryScope',
  'ReviewQualityCheckTriggerRequest',
  'ReviewQualityCheckAcceptedResponse',
  'ReviewQualityCheckSummary',
  'ReviewQualityRuleResult',
  'ReviewQualityCheckResponse',
  'ReviewQualityErrorCode',
  'ReviewQualityErrorResponse',
  'ApiResponseReviewQualityCheckAcceptedResponse',
  'ApiResponseReviewQualityCheckResponse'
];

function refName(schema) {
  if (!schema) return null;
  if (schema.$ref) return schema.$ref.split('/').pop();
  return null;
}

function paramsOf(pathItem, operation, location) {
  return [...(pathItem.parameters || []), ...(operation.parameters || [])]
    .filter(item => item.in === location)
    .map(item => item.name)
    .filter(Boolean)
    .sort();
}

function collectOperations(openapi) {
  const result = {};
  for (const route of Object.keys(openapi.paths || {}).sort()) {
    const pathItem = openapi.paths[route] || {};
    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation || !(operation.tags || []).includes('ReviewQuality')) continue;
      const response = operation.responses?.['200'] || operation.responses?.['202'] || {};
      result[`${method.toUpperCase()} ${route}`] = {
        operationId: operation.operationId,
        method: method.toUpperCase(),
        path: route,
        pathParams: paramsOf(pathItem, operation, 'path'),
        queryParams: paramsOf(pathItem, operation, 'query'),
        requestBody: refName(operation.requestBody?.content?.['application/json']?.schema),
        response: refName(response.content?.['application/json']?.schema)
      };
    }
  }
  return result;
}

function propertyName(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function schemaToType(schema) {
  if (!schema) return 'unknown';
  let type;
  if (schema.$ref) type = schema.$ref.split('/').pop();
  else if (Array.isArray(schema.enum)) type = schema.enum.map(value => JSON.stringify(value)).join(' | ');
  else if (schema.type === 'array') type = `${schemaToType(schema.items)}[]`;
  else if (schema.type === 'integer' || schema.type === 'number') type = 'number';
  else if (schema.type === 'boolean') type = 'boolean';
  else if (schema.type === 'string') type = 'string';
  else if (schema.type === 'object' || schema.properties) {
    const required = new Set(schema.required || []);
    type = `{ ${Object.entries(schema.properties || {}).map(([name, property]) => `${propertyName(name)}${required.has(name) ? '' : '?'}: ${schemaToType(property)};`).join(' ')} }`;
  } else type = 'unknown';
  return schema.nullable ? `${type} | null` : type;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

const { openapi } = loadEffectiveOpenApi();
const operations = collectOperations(openapi);
if (Object.keys(operations).length !== 3) throw new Error(`Expected 3 ReviewQuality operations, found ${Object.keys(operations).length}`);
const schemas = openapi.components?.schemas || {};
const missing = schemaNames.filter(name => !schemas[name]);
if (missing.length) throw new Error(`Missing ReviewQuality schemas: ${missing.join(', ')}`);

write(operationOutput, `/* eslint-disable */\n/** Auto-generated from docs/api/openapi.review-quality.json. Do not edit manually. */\nexport const REVIEW_QUALITY_API_OPERATIONS = ${JSON.stringify(operations, null, 2)} as const;\nexport type ReviewQualityApiOperation = keyof typeof REVIEW_QUALITY_API_OPERATIONS;\n`);
write(typesOutput, `/* eslint-disable */\n/** Auto-generated from docs/api/openapi.review-quality.json. Do not edit manually. */\n${schemaNames.map(name => `export type ${name} = ${schemaToType(schemas[name])};`).join('\n\n')}\n`);
console.log('Generated review quality API contract and DTO types');
