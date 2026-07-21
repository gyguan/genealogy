#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadEffectiveOpenApi, repositoryRoot } from './openapi-loader.mjs';

const output = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/generation-api-contract.ts');
const methods = ['get', 'post', 'put', 'patch', 'delete'];

function resolveParameter(openapi, parameter) {
  const reference = parameter?.['$ref'];
  const prefix = '#/components/parameters/';
  if (!reference || !reference.startsWith(prefix)) return parameter;
  return openapi.components?.parameters?.[reference.slice(prefix.length)] || parameter;
}

function parametersOf(openapi, pathItem, operation, location) {
  return [...(pathItem.parameters || []), ...(operation.parameters || [])]
    .map(parameter => resolveParameter(openapi, parameter))
    .filter(parameter => parameter?.in === location)
    .map(parameter => parameter.name)
    .filter(Boolean)
    .sort();
}

function collectOperations(openapi) {
  const operations = {};
  for (const route of Object.keys(openapi.paths || {}).sort()) {
    const pathItem = openapi.paths[route] || {};
    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation || !(operation.tags || []).includes('Generation')) continue;
      const key = `${method.toUpperCase()} ${route}`;
      operations[key] = {
        operationId: operation.operationId || key.replace(/[^a-zA-Z0-9]+/g, '_'),
        method: method.toUpperCase(),
        path: route,
        pathParams: parametersOf(openapi, pathItem, operation, 'path'),
        queryParams: parametersOf(openapi, pathItem, operation, 'query')
      };
    }
  }
  return operations;
}

function render(operations) {
  return `/* eslint-disable */
/**
 * Auto-generated Generation API operations from docs/api/openapi.generation.json.
 * Do not edit manually.
 */

export const GENERATION_API_OPERATIONS = ${JSON.stringify(operations, null, 2)} as const;

export type GenerationApiOperation = keyof typeof GENERATION_API_OPERATIONS;
export type GenerationApiPath<K extends GenerationApiOperation = GenerationApiOperation> = typeof GENERATION_API_OPERATIONS[K]['path'];
export type GenerationApiPathParamName<K extends GenerationApiOperation> = typeof GENERATION_API_OPERATIONS[K]['pathParams'][number];
export type GenerationApiPathParams<K extends GenerationApiOperation> = [GenerationApiPathParamName<K>] extends [never]
  ? never
  : Record<GenerationApiPathParamName<K>, string | number>;
`;
}

const { openapi } = loadEffectiveOpenApi();
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, render(collectOperations(openapi)), 'utf8');
console.log(`Generated ${path.relative(repositoryRoot, output)} from docs/api/openapi.generation.json`);
