import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const registry = readFileSync(new URL('./moduleRegistry.tsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('./AuthenticatedShell.tsx', import.meta.url), 'utf8');
const providers = readFileSync(new URL('./AppProviders.tsx', import.meta.url), 'utf8');

test('App keeps orchestration while providers, registry and authenticated layout are separated', () => {
  assert.match(app, /AppProviders/);
  assert.match(app, /AuthenticatedShell/);
  assert.match(app, /getModule/);
  assert.doesNotMatch(app, /const navItems/);
  assert.doesNotMatch(app, /switch \(active\)/);
  assert.doesNotMatch(app, /renderModuleActions/);
  assert.doesNotMatch(app, /from '..\/features\/(culture|imports|home|logs|members|mvp1|reviews|sources|tree|workbench)/);
  assert.match(providers, /ConfigProvider/);
  assert.match(providers, /WorkspaceProvider/);
  assert.match(shell, /moduleRegistry\.map/);
});

test('module metadata, page renderer and header actions share one typed registry', () => {
  assert.match(registry, /export type ModuleKey/);
  assert.match(registry, /render: \(navigate: ModuleNavigate\)/);
  assert.match(registry, /renderHeaderActions\?/);
  for (const key of ['home', 'mvp1Wizard', 'personArchive', 'treeProduct', 'sourceLibrary', 'culture', 'imports', 'editingWorkspace', 'reviewCenter', 'memberManage', 'auditTrace']) {
    assert.match(registry, new RegExp(`key: '${key}'`));
  }
  assert.match(registry, /renderHeaderActions: \(\) => <BookletActions/);
});
