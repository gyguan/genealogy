#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadEffectiveOpenApi, repositoryRoot } from './openapi-loader.mjs';

const operationOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/api-contract.ts');
const cultureOperationOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/culture-api-contract.ts');
const riskOperationOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/risk-api-contract.ts');
const trackingTypesOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/tracking-types.ts');
const cultureTypesOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/culture-types.ts');
const homeTypesOutput = path.join(repositoryRoot, 'frontend/genealogy-web/src/shared/api/generated/home-types.ts');
const methods = ['get', 'post', 'put', 'patch', 'delete'];
const trackingSchemaNames = [
  'OperationLogResponse',
  'OperationLogPage',
  'OperationLogStatsItem',
  'OperationLogStatsResponse',
  'RiskLevel',
  'RiskEventType',
  'RiskDispositionStatus',
  'RiskAuditEventResponse',
  'RiskAuditEventPage',
  'RiskAuditStatsItem',
  'RiskAuditStatsResponse',
  'TrackingObjectResponse',
  'TrackingObjectPage',
  'TrackingTraceTimelineEventResponse',
  'TrackingTraceChangeChainResponse',
  'TrackingTraceRevisionResponse',
  'TrackingTraceReviewTaskResponse',
  'TrackingTraceSourceBindingResponse',
  'TrackingTraceCoverageResponse',
  'TrackingTraceDetailResponse',
  'CheckTaskResponse',
  'AuditRecordResponse',
  'ReviewTaskDetailResponse',
  'FieldDiff',
  'ReviewDiffResponse',
  'ReviewTaskView',
  'ReviewTaskScope',
  'ReviewTargetSummaryResponse',
  'ReviewTaskListItemResponse',
  'ReviewTaskPage',
  'ReviewTaskViewDetailResponse'
];
const cultureSchemaNames = [
  'GenealogyTargetType',
  'CultureCategory',
  'CultureSiteType',
  'CultureDataStatus',
  'CultureConfidenceLevel',
  'CulturePrivacyLevel',
  'CultureSensitiveLevel',
  'CultureScopeResponse',
  'CultureSourceSummaryResponse',
  'CultureAttachmentSummaryResponse',
  'CultureReviewSummaryResponse',
  'CulturePageMetadata',
  'CultureItemCreateRequest',
  'CultureItemUpdateRequest',
  'CultureItemSummaryResponse',
  'CultureItemDetailResponse',
  'CultureItemPage',
  'MigrationEventCreateRequest',
  'MigrationEventUpdateRequest',
  'MigrationEventSummaryResponse',
  'MigrationEventDetailResponse',
  'MigrationEventPage',
  'CultureSiteCreateRequest',
  'CultureSiteUpdateRequest',
  'CultureSiteSummaryResponse',
  'CultureSiteDetailResponse',
  'CultureSitePage',
  'CultureOverviewStatistics',
  'CultureOverviewResponse',
  'CultureQualityMetricResponse',
  'CultureQualityIssueResponse',
  'CultureQualityResponse',
  'CultureSubmitReviewRequest',
  'CultureArchiveRequest',
  'CultureCommandResponse'
];
const homeSchemaNames = [
  'HomeDashboardBucketResponse',
  'HomeDashboardCompletenessResponse',
  'HomeDashboardBranchCoverageResponse',
  'HomeDashboardResponse'
];

function refName(schema) {
  if (!schema) return null;
  if (schema['$ref']) return schema['$ref'].split('/').pop();
  if (schema.items && schema.items['$ref']) return `${schema.items['$ref'].split('/').pop()}[]`;
  return null;
}

function requestBodyName(operation) {
  const content = operation.requestBody?.content || {};
  return refName(content['application/json']?.schema || content['multipart/form-data']?.schema);
}

function responseName(operation) {
  const response = operation.responses?.['200'] || operation.responses?.['201'] || operation.responses?.default || {};
  return refName(response.content?.['application/json']?.schema);
}

function resolveParameter(openapi, parameter) {
  const reference = parameter?.['$ref'];
  const prefix = '#/components/parameters/';
  if (!reference || !reference.startsWith(prefix)) return parameter;
  const name = reference.slice(prefix.length);
  return openapi.components?.parameters?.[name] || parameter;
}

function paramsOf(openapi, pathItem, operation, location) {
  return [...(pathItem.parameters || []), ...(operation.parameters || [])]
    .map(item => resolveParameter(openapi, item))
    .filter(item => item.in === location)
    .map(item => item.name)
    .filter(Boolean)
    .sort();
}

function isCultureOperation(operation) {
  return (operation.tags || []).includes('Culture');
}

function isRiskOperation(operation) {
  return (operation.tags || []).includes('OperationRisk');
}

function isHomeDashboardOperation(operation) {
  return (operation.tags || []).includes('HomeDashboard');
}

function collectOperations(openapi, predicate = () => true) {
  const result = {};
  const allPaths = openapi.paths || {};
  for (const route of Object.keys(allPaths).sort()) {
    const pathItem = allPaths[route] || {};
    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation || !predicate(operation)) continue;
      const key = `${method.toUpperCase()} ${route}`;
      result[key] = {
        operationId: operation.operationId || key.replace(/[^a-zA-Z0-9]+/g, '_'),
        method: method.toUpperCase(),
        path: route,
        pathParams: paramsOf(openapi, pathItem, operation, 'path'),
        queryParams: paramsOf(openapi, pathItem, operation, 'query'),
        requestBody: requestBodyName(operation),
        response: responseName(operation)
      };
    }
  }
  return result;
}

function renderOperations(operations, sourceDescription = 'docs/api/openapi.json and overlays') {
  return `/* eslint-disable */
/**
 * Auto-generated by scripts/api/generate-frontend-client.mjs from ${sourceDescription}.
 * Do not edit manually.
 */

export const API_OPERATIONS = ${JSON.stringify(operations, null, 2)} as const;

export type ApiOperation = keyof typeof API_OPERATIONS;
export type ApiMethod<K extends ApiOperation = ApiOperation> = typeof API_OPERATIONS[K]['method'];
export type ApiPath<K extends ApiOperation> = typeof API_OPERATIONS[K]['path'];
export type ApiPathParamName<K extends ApiOperation> = typeof API_OPERATIONS[K]['pathParams'][number];
export type ApiQueryParamName<K extends ApiOperation> = typeof API_OPERATIONS[K]['queryParams'][number];
export type ApiPathParams<K extends ApiOperation> = [ApiPathParamName<K>] extends [never] ? never : Record<ApiPathParamName<K>, string | number>;
export type ApiQueryParams<K extends ApiOperation> = [ApiQueryParamName<K>] extends [never] ? never : Partial<Record<ApiQueryParamName<K>, string | number | boolean | undefined>>;
export type ApiRequestBodySchema<K extends ApiOperation> = typeof API_OPERATIONS[K]['requestBody'];
export type ApiResponseSchema<K extends ApiOperation> = typeof API_OPERATIONS[K]['response'];
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
  if (schema['$ref']) type = schema['$ref'].split('/').pop();
  else if (Array.isArray(schema.enum) && schema.enum.length > 0) type = schema.enum.map(value => JSON.stringify(value)).join(' | ');
  else if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) type = schema.oneOf.map(schemaToType).join(' | ');
  else if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) type = schema.anyOf.map(schemaToType).join(' | ');
  else if (Array.isArray(schema.allOf) && schema.allOf.length > 0) type = schema.allOf.map(schemaToType).join(' & ');
  else if (schema.type === 'array') type = `${arrayItemType(schemaToType(schema.items))}[]`;
  else if (schema.type === 'integer' || schema.type === 'number') type = 'number';
  else if (schema.type === 'boolean') type = 'boolean';
  else if (schema.type === 'string') type = 'string';
  else if (schema.type === 'object' || schema.properties) {
    const required = new Set(schema.required || []);
    const properties = Object.entries(schema.properties || {});
    if (properties.length === 0) {
      type = schema.additionalProperties ? `Record<string, ${schemaToType(schema.additionalProperties)}>` : 'Record<string, unknown>';
    } else {
      const fields = properties.map(([name, property]) => {
        const optional = required.has(name) ? '' : '?';
        return `${propertyName(name)}${optional}: ${schemaToType(property)};`;
      });
      type = `{ ${fields.join(' ')} }`;
    }
  } else type = 'unknown';
  return schema.nullable ? `${type} | null` : type;
}

function renderNamedSchema(name, schema) {
  if (schema.type !== 'object' && !schema.properties) return `export type ${name} = ${schemaToType(schema)};`;
  const required = new Set(schema.required || []);
  const fields = Object.entries(schema.properties || {}).map(([property, propertySchema]) => {
    const optional = required.has(property) ? '' : '?';
    return `  ${propertyName(property)}${optional}: ${schemaToType(propertySchema)};`;
  });
  return `export type ${name} = {
${fields.join('\n')}
};`;
}

function renderSchemaTypes(openapi, schemaNames, description) {
  const schemas = openapi.components?.schemas || {};
  const missing = schemaNames.filter(name => !schemas[name]);
  if (missing.length > 0) throw new Error(`Missing ${description} schemas in effective OpenAPI: ${missing.join(', ')}`);
  const body = schemaNames.map(name => renderNamedSchema(name, schemas[name])).join('\n\n');
  return `/* eslint-disable */
/**
 * Auto-generated ${description} DTOs from the effective OpenAPI contract.
 * Do not edit manually.
 */

${body}
`;
}

function writeGeneratedFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

const { openapi, overlayFiles } = loadEffectiveOpenApi();
writeGeneratedFile(operationOutput, renderOperations(collectOperations(openapi, operation => !isCultureOperation(operation) && !isRiskOperation(operation) && !isHomeDashboardOperation(operation))));
writeGeneratedFile(cultureOperationOutput, renderOperations(collectOperations(openapi, isCultureOperation), 'docs/api/openapi.culture.json'));
writeGeneratedFile(riskOperationOutput, renderOperations(collectOperations(openapi, isRiskOperation), 'docs/api/openapi.operation-risk-audit.json'));
writeGeneratedFile(trackingTypesOutput, renderSchemaTypes(openapi, trackingSchemaNames, 'tracking-center'));
writeGeneratedFile(cultureTypesOutput, renderSchemaTypes(openapi, cultureSchemaNames, 'culture-domain'));
writeGeneratedFile(homeTypesOutput, renderSchemaTypes(openapi, homeSchemaNames, 'home-dashboard'));

const overlays = overlayFiles.length ? ` with ${overlayFiles.join(', ')}` : '';
console.log(`Generated ${path.relative(repositoryRoot, operationOutput)}, ${path.relative(repositoryRoot, cultureOperationOutput)}, ${path.relative(repositoryRoot, riskOperationOutput)}, ${path.relative(repositoryRoot, trackingTypesOutput)}, ${path.relative(repositoryRoot, cultureTypesOutput)} and ${path.relative(repositoryRoot, homeTypesOutput)} from docs/api/openapi.json${overlays}`);
