#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadEffectiveOpenApi } from './openapi-loader.mjs';

const { openapi } = loadEffectiveOpenApi();
const trigger = openapi.paths?.['/api/v1/clans/{clanId}/review-quality-checks']?.post;
const detail = openapi.paths?.['/api/v1/clans/{clanId}/review-quality-checks/{checkId}']?.get;
const latest = openapi.paths?.['/api/v1/clans/{clanId}/review-tasks/{reviewTaskId}/quality-check']?.get;

assert.equal(trigger?.operationId, 'triggerReviewQualityCheck');
assert.equal(detail?.operationId, 'getReviewQualityCheck');
assert.equal(latest?.operationId, 'getLatestReviewTaskQualityCheck');
assert.equal(trigger?.responses?.['202']?.content?.['application/json']?.schema?.$ref, '#/components/schemas/ApiResponseReviewQualityCheckAcceptedResponse');

const schemas = openapi.components?.schemas || {};
assert.deepEqual(schemas.ReviewQualityCheckMode?.enum, ['INCREMENTAL', 'FULL', 'REVIEW_GATE']);
assert.deepEqual(schemas.ReviewQualityCheckStatus?.enum, ['NOT_CHECKED', 'QUEUED', 'RUNNING', 'PASSED', 'ISSUES_FOUND', 'FAILED']);
assert.deepEqual(schemas.ReviewQualityCheckScopeType?.enum, ['TASK_IDS', 'QUERY']);
assert.deepEqual(schemas.ReviewQualityBlockLevel?.enum, ['NONE', 'WARNING', 'BLOCKING']);
assert.equal(schemas.ReviewQualityCheckSummary?.properties?.reviewBlocked?.type, 'boolean');
assert.equal(schemas.ReviewQualityCheckResponse?.properties?.lastCheckedAt?.format, 'date-time');
assert.match(trigger.description, /never changes the formal genealogy repository/i);
assert.match(latest.description, /Triggering remains a review-list action/i);

const errors = new Set(schemas.ReviewQualityErrorCode?.enum || []);
for (const code of [
  'REVIEW_QUALITY_INVALID_SCOPE',
  'REVIEW_QUALITY_CHECK_ALREADY_RUNNING',
  'REVIEW_QUALITY_TASK_STATE_CONFLICT',
  'REVIEW_QUALITY_FORBIDDEN',
  'REVIEW_QUALITY_NOT_REVIEWABLE',
  'REVIEW_QUALITY_NOT_FOUND'
]) assert.ok(errors.has(code), `Missing error code: ${code}`);

console.log('Review quality OpenAPI contract check passed');
