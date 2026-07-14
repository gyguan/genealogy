#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const contractFile = path.join(root, 'docs/api/openapi.import-execution.json');
const generatedFile = path.join(root, 'frontend/genealogy-web/src/shared/api/generated/import-execution-types.ts');
const contract = JSON.parse(fs.readFileSync(contractFile, 'utf8'));

const expectedPaths = [
  '/api/v1/clans/{clanId}/imports/{jobId}/execution',
  '/api/v1/clans/{clanId}/imports/{jobId}/execution/pause',
  '/api/v1/clans/{clanId}/imports/{jobId}/execution/resume',
  '/api/v1/clans/{clanId}/imports/{jobId}/execution/cancel',
  '/api/v1/clans/{clanId}/imports/{jobId}/execution/retry'
];
for (const route of expectedPaths) {
  if (!contract.paths?.[route]) throw new Error(`Missing import execution path: ${route}`);
}

const schemas = contract.components?.schemas || {};
const expectedEnums = {
  ImportExecutionMode: ['sync', 'async'],
  ImportExecutionStatus: ['queued', 'running', 'paused', 'retry_wait', 'completed', 'failed', 'cancelled', 'dead_letter'],
  ImportExecutionStage: ['queued', 'parsing', 'drafting', 'ready_for_review', 'publishing', 'completed', 'failed', 'cancelled'],
  ImportExecutionAction: ['pause', 'resume', 'cancel', 'retry']
};
for (const [name, expected] of Object.entries(expectedEnums)) {
  const actual = schemas[name]?.enum || [];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected enum ${name}: ${JSON.stringify(actual)}`);
  }
}

const response = schemas.ImportJobExecutionResponse;
const required = new Set(response?.required || []);
for (const field of ['jobId', 'executionMode', 'executionStatus', 'executionStage', 'processedCount', 'publishedCount', 'remainingCount', 'progressPercent', 'retryCount', 'maxRetries', 'manualInterventionRequired', 'allowedActions']) {
  if (!required.has(field)) throw new Error(`ImportJobExecutionResponse must require ${field}`);
}
if (response?.properties?.progressPercent?.maximum !== 100) {
  throw new Error('progressPercent maximum must be 100');
}

const before = fs.existsSync(generatedFile) ? fs.readFileSync(generatedFile, 'utf8') : '';
const generated = spawnSync(process.execPath, [path.join(dir, 'generate-import-execution-types.mjs')], {
  cwd: root,
  encoding: 'utf8'
});
if (generated.status !== 0) {
  process.stderr.write(generated.stdout || '');
  process.stderr.write(generated.stderr || '');
  process.exit(generated.status || 1);
}
const after = fs.readFileSync(generatedFile, 'utf8');
if (before !== after) {
  throw new Error('Generated import execution types are stale. Run npm run api:generate.');
}
console.log('Import execution contract is valid.');
