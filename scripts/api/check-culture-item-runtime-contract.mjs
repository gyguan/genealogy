#!/usr/bin/env node
import { loadEffectiveOpenApi } from './openapi-loader.mjs';

const { openapi } = loadEffectiveOpenApi();
const schemas = openapi.components?.schemas || {};

function fail(message) {
  throw new Error(message);
}

const listOperation = openapi.paths?.['/api/v1/clans/{clanId}/culture-items']?.get;
const pageSize = (listOperation?.parameters || []).find(parameter => parameter.name === 'pageSize');
if (pageSize?.schema?.maximum !== 100) {
  fail('culture item pageSize maximum must be 100');
}

const createRequest = schemas.CultureItemCreateRequest;
if (createRequest?.properties?.content?.maxLength !== 200000) {
  fail('CultureItemCreateRequest.content maxLength must be 200000');
}
for (const field of ['featuredOnHome', 'sortOrder']) {
  if (!(createRequest?.required || []).includes(field)) {
    fail(`CultureItemCreateRequest.${field} must be required`);
  }
}

const updateRequest = schemas.CultureItemUpdateRequest;
const versionSchema = (updateRequest?.allOf || []).find(item => item?.properties?.version);
if (!versionSchema || !(versionSchema.required || []).includes('version')) {
  fail('CultureItemUpdateRequest.version must be required');
}

const summary = schemas.CultureItemSummaryResponse;
if (summary?.properties?.content) {
  fail('CultureItemSummaryResponse must not expose full content');
}
for (const field of ['sourceCount', 'attachmentCount', 'reviewCount', 'allowedActions', 'version']) {
  if (!summary?.properties?.[field]) {
    fail(`CultureItemSummaryResponse must expose ${field}`);
  }
  if (!(summary?.required || []).includes(field)) {
    fail(`CultureItemSummaryResponse.${field} must be required`);
  }
}
for (const forbidden of ['storagePath', 'checksum', 'oldPayload', 'newPayload']) {
  if (summary?.properties?.[forbidden]) {
    fail(`CultureItemSummaryResponse must not expose ${forbidden}`);
  }
}

console.log('Culture item runtime limits, aggregate counts and minimum-disclosure contract are valid.');
