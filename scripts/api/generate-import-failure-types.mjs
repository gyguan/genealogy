#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const contractFile = path.join(root, 'docs/api/openapi.import-failure-bulk.json');
const outputFile = path.join(root, 'frontend/genealogy-web/src/shared/api/generated/import-failure-types.ts');
const contract = JSON.parse(fs.readFileSync(contractFile, 'utf8'));
const schemas = contract.components?.schemas || {};

const requiredSchemas = [
  'ImportRowSelectionMode',
  'ImportRowVersionReference',
  'ImportRowBulkSelectionRequest',
  'ImportRowBulkRetryRequest',
  'ImportRowBulkExcludeRequest',
  'ImportRowBulkItemResult',
  'ImportRowBulkOperationResponse'
];
for (const name of requiredSchemas) {
  if (!schemas[name]) throw new Error(`Missing import failure schema: ${name}`);
}

function union(name) {
  const values = schemas[name].enum || [];
  if (!values.length) throw new Error(`Schema ${name} must define enum values`);
  return values.map(value => JSON.stringify(value)).join(' | ');
}

const operationValues = schemas.ImportRowBulkOperationResponse?.properties?.operation?.enum || [];
if (!operationValues.length) throw new Error('ImportRowBulkOperationResponse.operation must define enum values');

const content = `/* eslint-disable */
/**
 * Auto-generated import failure remediation DTOs from docs/api/openapi.import-failure-bulk.json.
 * Do not edit manually.
 */

export type ImportRowSelectionMode = ${union('ImportRowSelectionMode')};
export type ImportRowBulkOperation = ${operationValues.map(value => JSON.stringify(value)).join(' | ')};

export type ImportRowVersionReference = {
  rowNo: number;
  expectedVersion: number;
};

export type ImportRowBulkSelectionRequest = {
  mode: ImportRowSelectionMode;
  rows?: ImportRowVersionReference[];
};

export type ImportRowBulkRetryRequest = {
  selection: ImportRowBulkSelectionRequest;
};

export type ImportRowBulkExcludeRequest = {
  selection: ImportRowBulkSelectionRequest;
  reason: string;
};

export type ImportRowBulkItemResult = {
  stableRowKey: string;
  rowNo: number;
  success: boolean;
  rowStatus: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  version: number;
};

export type ImportRowBulkOperationResponse = {
  operation: ImportRowBulkOperation;
  selectionMode: ImportRowSelectionMode;
  matchedCount: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  remainingFailureCount: number;
  excludedCount: number;
  processingStatus: string;
  items: ImportRowBulkItemResult[];
};
`;

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, content, 'utf8');
console.log(`Generated ${path.relative(root, outputFile)}`);
