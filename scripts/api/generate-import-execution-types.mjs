#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const contractFile = path.join(root, 'docs/api/openapi.import-execution.json');
const outputFile = path.join(root, 'frontend/genealogy-web/src/shared/api/generated/import-execution-types.ts');
const contract = JSON.parse(fs.readFileSync(contractFile, 'utf8'));
const schemas = contract.components?.schemas || {};

const requiredSchemas = [
  'ImportExecutionMode',
  'ImportExecutionStatus',
  'ImportExecutionStage',
  'ImportExecutionAction',
  'ImportJobExecutionResponse'
];
for (const name of requiredSchemas) {
  if (!schemas[name]) throw new Error(`Missing import execution schema: ${name}`);
}

function union(name) {
  const values = schemas[name].enum || [];
  if (!values.length) throw new Error(`Schema ${name} must define enum values`);
  return values.map(value => JSON.stringify(value)).join(' | ');
}

const content = `/* eslint-disable */
/**
 * Auto-generated import-execution DTOs from docs/api/openapi.import-execution.json.
 * Do not edit manually.
 */

export type ImportExecutionMode = ${union('ImportExecutionMode')};
export type ImportExecutionStatus = ${union('ImportExecutionStatus')};
export type ImportExecutionStage = ${union('ImportExecutionStage')};
export type ImportExecutionAction = ${union('ImportExecutionAction')};

export type ImportJobExecutionResponse = {
  jobId: number;
  executionMode: ImportExecutionMode;
  executionStatus: ImportExecutionStatus;
  executionStage: ImportExecutionStage;
  totalCount?: number | null;
  processedCount: number;
  publishedCount: number;
  remainingCount: number;
  progressPercent: number;
  cursorRowNo?: number | null;
  chunkSize?: number | null;
  retryCount: number;
  maxRetries: number;
  failureStage?: ImportExecutionStage | null;
  lastErrorCode?: string | null;
  errorSummary?: string | null;
  manualInterventionRequired: boolean;
  nextRetryAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  heartbeatAt?: string | null;
  allowedActions: ImportExecutionAction[];
};
`;

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, content, 'utf8');
console.log(`Generated ${path.relative(root, outputFile)}`);
