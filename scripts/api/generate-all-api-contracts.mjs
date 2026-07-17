#!/usr/bin/env node
const previousExclusions = process.env.OPENAPI_EXCLUDE_DOMAINS;
const exclusions = new Set(
  (previousExclusions || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);
exclusions.add('tree');
exclusions.add('person-archive-query');

process.env.OPENAPI_EXCLUDE_DOMAINS = [...exclusions].join(',');
try {
  await import('./generate-frontend-client.mjs');
} finally {
  if (previousExclusions === undefined) delete process.env.OPENAPI_EXCLUDE_DOMAINS;
  else process.env.OPENAPI_EXCLUDE_DOMAINS = previousExclusions;
}

await import('./generate-tree-contract.mjs');
await import('./generate-person-archive-contract.mjs');