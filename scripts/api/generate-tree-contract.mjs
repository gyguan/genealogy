#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadEffectiveOpenApi, repositoryRoot } from './openapi-loader.mjs';

const operationOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/tree-api-contract.ts');
const typesOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/tree-types.ts');
const methods = ['get', 'post', 'put', 'patch', 'delete'];
const schemaNames = [
  'TreeDirection',
  'TreeDataView',
  'TreeRelationScope',
  'TreeNodeVisibility',
  'TreeEdgeVisibility',
  'TreeMaskReason',
  'TreeRelationCategory',
  'TreeRelationType',
  'TreeRitualRelationType',
  'TreeDataStatus',
  'TreePrivacyLevel',
  'TreeConfidenceLevel',
  'TreeReviewState',
  'TreeRiskLevel',
  'TreeAnomalyCode',
  'TreeWarningCode',
  'TreeTruncationReason',
  'TreeEvidenceSummary',
  'TreeReviewSummary',
  'TreeAnomalySummary',
  'TreeNodeResponse',
  'TreeEdgeResponse',
  'TreeGraphWarning',
  'TreeGraphMeta',
  'TreeGraphResponse',
  'ApiResponseTreeGraphResponse',
  'TreeErrorResponse'
];

function refName(schema) {
  if (!schema) return null;
  if (schema['$ref']) return schema['$ref'].split('/').pop();
  if (schema.items && schema.items['$ref']) return `${schema.items['$ref'].split('/').pop()}[]`;
  return null;
}

function resolveComponent(openapi, value, section) {
  const reference = value?.['$ref'];
  const prefix = `#/components/${section}/`;
  if (!reference || !reference.startsWith(prefix)) return value;
  return openapi.components?.[section]?.[reference.slice(prefix.length)] || value;
}

function requestBodyName(openapi, operation) {
  const body = resolveComponent(openapi, operation.requestBody, 'requestBodies') || {};
  const content = body.content || {};
  return refName(content['application/json']?.schema || content['multipart/form-data']?.schema);
}

function responseName(openapi, operation) {
  const raw = operation.responses?.['200'] || operation.responses?.['201'] || operation.responses?.default || {};
  const response = resolveComponent(openapi, raw, 'responses') || {};
  return refName(response.content?.['application/json']?.schema);
}

function paramsOf(openapi, pathItem, operation, location) {
  return [...(pathItem.parameters || []), ...(operation.parameters || [])]
    .map(item => resolveComponent(openapi, item, 'parameters'))
    .filter(item => item.in === location)
    .map(item => item.name)
    .filter(Boolean)
    .sort();
}

function isTreeOperation(operation) {
  return (operation.tags || []).includes('Tree');
}

function collectOperations(openapi) {
  const result = {};
  for (const route of Object.keys(openapi.paths || {}).sort()) {
    const pathItem = openapi.paths[route] || {};
    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation || !isTreeOperation(operation)) continue;
      const key = `${method.toUpperCase()} ${route}`;
      result[key] = {
        operationId: operation.operationId || key.replace(/[^a-zA-Z0-9]+/g, '_'),
        method: method.toUpperCase(),
        path: route,
        pathParams: paramsOf(openapi, pathItem, operation, 'path'),
        queryParams: paramsOf(openapi, pathItem, operation, 'query'),
        requestBody: requestBodyName(openapi, operation),
        response: responseName(openapi, operation),
        deprecated: Boolean(operation.deprecated)
      };
    }
  }
  return result;
}

function renderOperations(operations) {
  return `/* eslint-disable */
/**
 * Auto-generated Tree API operations from docs/api/openapi.tree.json.
 * Do not edit manually.
 */

export const TREE_API_OPERATIONS = ${JSON.stringify(operations, null, 2)} as const;

export type TreeApiOperation = keyof typeof TREE_API_OPERATIONS;
export type TreeApiMethod<K extends TreeApiOperation = TreeApiOperation> = typeof TREE_API_OPERATIONS[K]['method'];
export type TreeApiPath<K extends TreeApiOperation = TreeApiOperation> = typeof TREE_API_OPERATIONS[K]['path'];
export type TreeApiPathParamName<K extends TreeApiOperation> = typeof TREE_API_OPERATIONS[K]['pathParams'][number];
export type TreeApiQueryParamName<K extends TreeApiOperation> = typeof TREE_API_OPERATIONS[K]['queryParams'][number];
export type TreeApiPathParams<K extends TreeApiOperation> = [TreeApiPathParamName<K>] extends [never] ? never : Record<TreeApiPathParamName<K>, string | number>;
export type TreeApiQueryParams<K extends TreeApiOperation> = [TreeApiQueryParamName<K>] extends [never] ? never : Partial<Record<TreeApiQueryParamName<K>, string | number | boolean | readonly string[] | undefined>>;
export type TreeApiResponseSchema<K extends TreeApiOperation> = typeof TREE_API_OPERATIONS[K]['response'];
`;
}

function propertyName(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function arrayItemType(type) {
  return type.includes(' | ') || type.includes(' & ') ? `(${type})` : type;
}

function schemaToType(schema) {
  if (!schema) return 'unknown';

  let type;
  if (schema['$ref']) {
    type = schema['$ref'].split('/').pop();
  } else if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    type = schema.enum.map(value => JSON.stringify(value)).join(' | ');
  } else if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    type = schema.oneOf.map(schemaToType).join(' | ');
  } else if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    type = schema.anyOf.map(schemaToType).join(' | ');
  } else if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    type = schema.allOf.map(schemaToType).join(' & ');
  } else if (schema.type === 'array') {
    type = `${arrayItemType(schemaToType(schema.items))}[]`;
  } else if (schema.type === 'integer' || schema.type === 'number') {
    type = 'number';
  } else if (schema.type === 'boolean') {
    type = 'boolean';
  } else if (schema.type === 'string') {
    type = 'string';
  } else if (schema.type === 'object' || schema.properties) {
    const required = new Set(schema.required || []);
    const properties = Object.entries(schema.properties || {});
    if (properties.length === 0) {
      type = schema.additionalProperties
        ? `Record<string, ${schemaToType(schema.additionalProperties)}>`
        : 'Record<string, unknown>';
    } else {
      const fields = properties.map(([name, property]) => {
        const optional = required.has(name) ? '' : '?';
        return `${propertyName(name)}${optional}: ${schemaToType(property)};`;
      });
      type = `{ ${fields.join(' ')} }`;
    }
  } else {
    type = 'unknown';
  }

  return schema.nullable ? `${type} | null` : type;
}

function renderNamedSchema(name, schema) {
  if (schema.type !== 'object' && !schema.properties) {
    return `export type ${name} = ${schemaToType(schema)};`;
  }

  const required = new Set(schema.required || []);
  const fields = Object.entries(schema.properties || {}).map(([property, propertySchema]) => {
    const optional = required.has(property) ? '' : '?';
    return `  ${propertyName(property)}${optional}: ${schemaToType(propertySchema)};`;
  });
  return `export type ${name} = {
${fields.join('\n')}
};`;
}

function renderSchemaTypes(openapi) {
  const schemas = openapi.components?.schemas || {};
  const missing = schemaNames.filter(name => !schemas[name]);
  if (missing.length > 0) {
    throw new Error(`Missing Tree schemas in effective OpenAPI: ${missing.join(', ')}`);
  }

  return `/* eslint-disable */
/**
 * Auto-generated Tree DTOs from docs/api/openapi.tree.json.
 * Do not edit manually.
 */

${schemaNames.map(name => renderNamedSchema(name, schemas[name])).join('\n\n')}
`;
}

function writeGeneratedFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

const { openapi } = loadEffectiveOpenApi();
writeGeneratedFile(operationOutput, renderOperations(collectOperations(openapi)));
writeGeneratedFile(typesOutput, renderSchemaTypes(openapi));

console.log(
  `Generated ${path.relative(repositoryRoot, operationOutput)} and ${path.relative(repositoryRoot, typesOutput)} `
  + 'from docs/api/openapi.tree.json'
);
