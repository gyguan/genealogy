#!/usr/bin/env node
import { loadEffectiveOpenApi } from './openapi-loader.mjs';

const { openapi } = loadEffectiveOpenApi();
const paths = openapi.paths || {};
const schemas = openapi.components?.schemas || {};
const parameters = openapi.components?.parameters || {};

function fail(message) {
  throw new Error(`Tree contract check failed: ${message}`);
}

function operation(route) {
  const value = paths[route]?.get;
  if (!value) fail(`missing GET ${route}`);
  return value;
}

function resolvedParameters(value) {
  return (value.parameters || []).map(item => {
    const reference = item?.['$ref'];
    const prefix = '#/components/parameters/';
    return reference?.startsWith(prefix)
      ? parameters[reference.slice(prefix.length)]
      : item;
  });
}

function parameterNames(value) {
  return new Set(resolvedParameters(value).map(item => item?.name).filter(Boolean));
}

const canonical = operation('/api/v1/tree/person/{personId}');
const branch = operation('/api/v1/tree/clans/{clanId}/branches/{branchId}/lineage');
const family = operation('/api/v1/tree/person/{personId}/family');
const ancestors = operation('/api/v1/tree/ancestors');
const descendants = operation('/api/v1/tree/descendants');

if (canonical.operationId !== 'getPersonLineageGraph') fail('canonical person operationId mismatch');
if (branch.operationId !== 'getBranchLineageGraph') fail('branch operationId mismatch');
if (canonical.deprecated) fail('canonical person route must not be deprecated');
if (branch.deprecated) fail('branch route must not be deprecated');
for (const [name, value] of Object.entries({ family, ancestors, descendants })) {
  if (!value.deprecated) fail(`${name} compatibility route must be deprecated`);
}

for (const name of ['direction', 'relationScopes', 'dataView', 'maxDepth', 'maxNodes', 'maxEdges']) {
  if (!parameterNames(canonical).has(name)) fail(`canonical person route missing ${name}`);
}
for (const name of ['includeSubBranches', 'relationScopes', 'dataView', 'maxDepth', 'maxNodes', 'maxEdges']) {
  if (!parameterNames(branch).has(name)) fail(`branch route missing ${name}`);
}

if (parameters.TreeMaxDepthQuery?.schema?.maximum !== 20) fail('maxDepth hard limit must be 20');
if (parameters.TreeMaxNodesQuery?.schema?.maximum !== 2000) fail('maxNodes hard limit must be 2000');
if (parameters.TreeMaxEdgesQuery?.schema?.maximum !== 4000) fail('maxEdges hard limit must be 4000');

for (const name of [
  'TreeDirection',
  'TreeDataView',
  'TreeRelationScope',
  'TreeNodeResponse',
  'TreeEdgeResponse',
  'TreeGraphMeta',
  'TreeGraphWarning',
  'TreeGraphResponse',
  'ApiResponseTreeGraphResponse',
  'TreeErrorResponse'
]) {
  if (!schemas[name]) fail(`missing schema ${name}`);
}

const dataViews = schemas.TreeDataView?.enum || [];
if (!dataViews.includes('official') || !dataViews.includes('editing')) fail('TreeDataView must include official and editing');

const nodeRequired = new Set(schemas.TreeNodeResponse?.required || []);
for (const name of ['nodeId', 'displayName', 'visibility']) {
  if (!nodeRequired.has(name)) fail(`TreeNodeResponse must require ${name}`);
}

const edgeRequired = new Set(schemas.TreeEdgeResponse?.required || []);
for (const name of ['edgeId', 'fromNodeId', 'toNodeId', 'relationType', 'relationCategory', 'visibility']) {
  if (!edgeRequired.has(name)) fail(`TreeEdgeResponse must require ${name}`);
}

if (paths['/api/v1/tree/branches/{branchId}']) fail('obsolete ambiguous branch path must not be present');

console.log('Tree OpenAPI contract check passed.');
