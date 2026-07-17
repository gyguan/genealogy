#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadEffectiveOpenApi, repositoryRoot } from './openapi-loader.mjs';

const operationOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/person-archive-api-contract.ts');
const typesOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/person-archive-types.ts');
const methods = ['get', 'post', 'put', 'patch', 'delete'];
const schemaNames = ['PersonArchiveItem', 'PersonArchivePage', 'ApiResponsePersonArchivePage'];

function refName(schema) {
  if (!schema) return null;
  if (schema['$ref']) return schema['$ref'].split('/').pop();
  if (schema.items?.['$ref']) return `${schema.items['$ref'].split('/').pop()}[]`;
  return null;
}

function paramsOf(pathItem, operation, location) {
  return [...(pathItem.parameters || []), ...(operation.parameters || [])]
    .filter(item => item.in === location)
    .map(item => item.name)
    .filter(Boolean)
    .sort();
}

function responseName(operation) {
  const response = operation.responses?.['200'] || operation.responses?.['201'] || operation.responses?.default || {};
  return refName(response.content?.['application/json']?.schema);
}

function collectOperations(openapi) {
  const result = {};
  for (const route of Object.keys(openapi.paths || {}).sort()) {
    const pathItem = openapi.paths[route] || {};
    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation || !(operation.tags || []).includes('PersonArchive')) continue;
      const key = `${method.toUpperCase()} ${route}`;
      result[key] = {
        operationId: operation.operationId || key.replace(/[^a-zA-Z0-9]+/g, '_'),
        method: method.toUpperCase(),
        path: route,
        pathParams: paramsOf(pathItem, operation, 'path'),
        queryParams: paramsOf(pathItem, operation, 'query'),
        response: responseName(operation)
      };
    }
  }
  return result;
}

function renderOperations(operations) {
  return `/* eslint-disable */
/**
 * Auto-generated Person Archive API operations from docs/api/openapi.person-archive-query.json.
 * Do not edit manually.
 */

export const PERSON_ARCHIVE_API_OPERATIONS = ${JSON.stringify(operations, null, 2)} as const;

export type PersonArchiveApiOperation = keyof typeof PERSON_ARCHIVE_API_OPERATIONS;
export type PersonArchiveApiPath<K extends PersonArchiveApiOperation = PersonArchiveApiOperation> = typeof PERSON_ARCHIVE_API_OPERATIONS[K]['path'];
export type PersonArchiveApiPathParamName<K extends PersonArchiveApiOperation> = typeof PERSON_ARCHIVE_API_OPERATIONS[K]['pathParams'][number];
export type PersonArchiveApiQueryParamName<K extends PersonArchiveApiOperation> = typeof PERSON_ARCHIVE_API_OPERATIONS[K]['queryParams'][number];
export type PersonArchiveApiPathParams<K extends PersonArchiveApiOperation> = [PersonArchiveApiPathParamName<K>] extends [never] ? never : Record<PersonArchiveApiPathParamName<K>, string | number>;
export type PersonArchiveApiQueryParams<K extends PersonArchiveApiOperation> = [PersonArchiveApiQueryParamName<K>] extends [never] ? never : Partial<Record<PersonArchiveApiQueryParamName<K>, string | number | boolean | readonly string[] | undefined>>;
export type PersonArchiveApiResponseSchema<K extends PersonArchiveApiOperation> = typeof PERSON_ARCHIVE_API_OPERATIONS[K]['response'];
`;
}

function propertyName(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function schemaToType(schema) {
  if (!schema) return 'unknown';
  let type;
  if (schema['$ref']) type = schema['$ref'].split('/').pop();
  else if (Array.isArray(schema.enum) && schema.enum.length) type = schema.enum.map(value => JSON.stringify(value)).join(' | ');
  else if (schema.type === 'array') type = `${schemaToType(schema.items)}[]`;
  else if (schema.type === 'integer' || schema.type === 'number') type = 'number';
  else if (schema.type === 'boolean') type = 'boolean';
  else if (schema.type === 'string') type = 'string';
  else if (schema.type === 'object' || schema.properties) {
    const required = new Set(schema.required || []);
    const fields = Object.entries(schema.properties || {}).map(([name, property]) => `${propertyName(name)}${required.has(name) ? '' : '?'}: ${schemaToType(property)};`);
    type = fields.length ? `{ ${fields.join(' ')} }` : 'Record<string, unknown>';
  } else type = 'unknown';
  return schema.nullable ? `${type} | null` : type;
}

function renderTypes(openapi) {
  const schemas = openapi.components?.schemas || {};
  const missing = schemaNames.filter(name => !schemas[name]);
  if (missing.length) throw new Error(`Missing Person Archive schemas: ${missing.join(', ')}`);
  const body = schemaNames.map(name => `export type ${name} = ${schemaToType(schemas[name])};`).join('\n\n');
  return `/* eslint-disable */
/**
 * Auto-generated Person Archive DTOs from docs/api/openapi.person-archive-query.json.
 * Do not edit manually.
 */

${body}
`;
}

function writeGeneratedFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

const { openapi } = loadEffectiveOpenApi();
writeGeneratedFile(operationOutput, renderOperations(collectOperations(openapi)));
writeGeneratedFile(typesOutput, renderTypes(openapi));
console.log(`Generated ${path.relative(repositoryRoot, operationOutput)} and ${path.relative(repositoryRoot, typesOutput)} from docs/api/openapi.person-archive-query.json`);