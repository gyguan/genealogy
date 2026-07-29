import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const patterns = readFileSync(new URL('../shared/ui/StandardPagePatterns.tsx', import.meta.url), 'utf8');
const registry = readFileSync(new URL('../app/moduleRegistry.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./shared/standard-page-patterns.css', import.meta.url), 'utf8');

const requiredComponents = [
  'StandardPage',
  'StandardPageHeader',
  'StandardQueryPanel',
  'StandardResultSection',
  'StandardTable',
  'StandardDetailDrawer',
  'StandardEditorPage',
  'StandardPageState'
];

const migratedModules = [
  'personArchive',
  'sourceLibrary',
  'editingWorkspace',
  'reviewCenter',
  'memberManage',
  'auditTrace'
];

test('Issue #942 exposes the complete typed standard page API', () => {
  for (const component of requiredComponents) {
    assert.match(patterns, new RegExp(`export function ${component}\\b`), `${component} must remain exported`);
    assert.match(patterns, new RegExp(`export type ${component}Props\\b`), `${component} must retain an explicit props contract`);
  }
});

test('six representative modules use the standard page shell', () => {
  assert.match(registry, /import \{ StandardPage \} from '\.\.\/shared\/ui\/StandardPagePatterns';/);
  for (const key of migratedModules) {
    assert.match(registry, new RegExp(`standardModulePage\\('${key}'`), `${key} must use StandardPage`);
  }
  assert.equal((registry.match(/standardModulePage\('/g) || []).length, migratedModules.length + 1, 'only the helper plus six migrated modules should define standard page entries');
});

test('standard page CSS remains token-driven and does not target Ant internals', () => {
  assert.doesNotMatch(styles, /!important\b/);
  assert.doesNotMatch(styles, /(^|[,{]\s*)\.ant-[\w-]+/m);
  assert.doesNotMatch(styles, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(styles, /style=\{\{/);
  assert.match(styles, /var\(--ant-/);
});

test('standard page patterns do not use runtime DOM rearrangement or static inline style objects', () => {
  assert.doesNotMatch(patterns, /appendChild|insertBefore|querySelector|MutationObserver/);
  assert.doesNotMatch(patterns, /style=\{\{/);
});
