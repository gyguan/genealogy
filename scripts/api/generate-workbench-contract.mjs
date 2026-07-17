#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadEffectiveOpenApi, repositoryRoot } from './openapi-loader.mjs';

const operationOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/workbench-api-contract.ts');
const typesOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/workbench-types.ts');
const schemaNames = ['WorkbenchTaskResponse', 'WorkbenchTaskPage', 'ApiResponseWorkbenchTaskPage'];

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
    const operation = pathItem.get;
    if (!operation || operation.operationId !== 'listWorkbenchTasks') continue;
    const key = `GET ${route}`;
    result[key] = {
      operationId: operation.operationId,
      method: 'GET',
      path: route,
      pathParams: paramsOf(pathItem, operation, 'path'),
      queryParams: paramsOf(pathItem, operation, 'query'),
      response: responseName(operation)
    };
  }
  return result;
}

function renderOperations(operations) {
  return `/* eslint-disable */
/**
 * Auto-generated Workbench API operations from docs/api/openapi.workbench-query.json.
 * Do not edit manually.
 */

export const WORKBENCH_API_OPERATIONS = ${JSON.stringify(operations, null, 2)} as const;

export type WorkbenchApiOperation = keyof typeof WORKBENCH_API_OPERATIONS;
export type WorkbenchApiPath<K extends WorkbenchApiOperation = WorkbenchApiOperation> = typeof WORKBENCH_API_OPERATIONS[K]['path'];
export type WorkbenchApiQueryParamName<K extends WorkbenchApiOperation> = typeof WORKBENCH_API_OPERATIONS[K]['queryParams'][number];
export type WorkbenchApiQueryParams<K extends WorkbenchApiOperation> = [WorkbenchApiQueryParamName<K>] extends [never] ? never : Partial<Record<WorkbenchApiQueryParamName<K>, string | number | boolean | readonly string[] | undefined>>;
export type WorkbenchApiResponseSchema<K extends WorkbenchApiOperation> = typeof WORKBENCH_API_OPERATIONS[K]['response'];
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
  if (missing.length) throw new Error(`Missing Workbench schemas: ${missing.join(', ')}`);
  const body = schemaNames.map(name => `export type ${name} = ${schemaToType(schemas[name])};`).join('\n\n');
  return `/* eslint-disable */
/**
 * Auto-generated Workbench DTOs from docs/api/openapi.workbench-query.json.
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
console.log(`Generated ${path.relative(repositoryRoot, operationOutput)} and ${path.relative(repositoryRoot, typesOutput)} from docs/api/openapi.workbench-query.json`);
