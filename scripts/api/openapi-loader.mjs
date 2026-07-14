import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = path.resolve(dir, '../..');
export const apiDirectory = path.join(repositoryRoot, 'docs/api');
export const baseOpenApiPath = path.join(apiDirectory, 'openapi.json');

export function mergeComponents(baseComponents = {}, overlayComponents = {}) {
  const merged = { ...baseComponents, ...overlayComponents };
  for (const section of ['schemas', 'parameters', 'responses', 'requestBodies', 'headers', 'securitySchemes', 'links', 'callbacks']) {
    merged[section] = {
      ...(baseComponents[section] || {}),
      ...(overlayComponents[section] || {})
    };
    if (Object.keys(merged[section]).length === 0) {
      delete merged[section];
    }
  }
  return merged;
}

export function loadEffectiveOpenApi() {
  const base = JSON.parse(fs.readFileSync(baseOpenApiPath, 'utf8'));
  const overlayFiles = fs.readdirSync(apiDirectory)
    .filter(filename => /^openapi\..+\.json$/.test(filename))
    .sort();

  for (const filename of overlayFiles) {
    const overlay = JSON.parse(fs.readFileSync(path.join(apiDirectory, filename), 'utf8'));
    base.paths = { ...(base.paths || {}), ...(overlay.paths || {}) };
    base.components = mergeComponents(base.components, overlay.components);
  }

  return { openapi: base, overlayFiles };
}
