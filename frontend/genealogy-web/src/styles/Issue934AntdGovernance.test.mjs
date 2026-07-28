import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

async function filesUnder(relativeDirectory, extensions) {
  const directory = new URL(`${relativeDirectory}/`, root);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await filesUnder(relativePath, extensions));
    else if (
      extensions.some(extension => entry.name.endsWith(extension)) &&
      !/\.(?:test|spec)\.[^.]+$/.test(entry.name)
    ) files.push(relativePath);
  }
  return files;
}

test('issue 934 pins the frontend toolchain and Ant Design dependencies', async () => {
  const packageJson = JSON.parse(await source('package.json'));
  const declared = { ...packageJson.dependencies, ...packageJson.devDependencies };
  for (const [name, version] of Object.entries(declared)) {
    assert.notEqual(version, 'latest', `${name} must not use latest`);
    assert.match(version, /^\d+\.\d+\.\d+$/, `${name} must use an exact version`);
  }
});

test('issue 934 keeps browser-native blocking dialogs out of production source', async () => {
  const files = await filesUnder('src', ['.ts', '.tsx', '.js', '.jsx']);
  for (const file of files) {
    const content = await source(file);
    assert.doesNotMatch(content, /window\.(?:confirm|alert|prompt)\s*\(/, `${file} must use shared Ant Design feedback`);
  }
  assert.match(await source('src/app/App.tsx'), /confirmAction\s*\(/);
  assert.match(await source('src/features/culture/cultureEditorState.ts'), /confirmAction\s*\(/);
  assert.match(await source('src/shared/api/client.ts'), /确认创建疑似重复人物/);
});

test('issue 934 provides Chinese Ant Design and Day.js locale at the application root', async () => {
  const providers = await source('src/app/AppProviders.tsx');
  assert.match(providers, /antd\/locale\/zh_CN/);
  assert.match(providers, /dayjs\/locale\/zh-cn/);
  assert.match(providers, /locale=\{zhCN\}/);
  assert.match(providers, /<AntdApp>/);
});

test('issue 934 centralizes grouped menu metadata and workspace context', async () => {
  const registry = await source('src/app/moduleRegistry.tsx');
  const shell = await source('src/app/AuthenticatedShell.tsx');
  for (const group of ['总览', '建谱', '资料', '协作', '管理', '文化']) {
    assert.match(registry, new RegExp(`group: '${group}'`));
  }
  assert.match(registry, /icon:/);
  assert.match(registry, /order:/);
  assert.match(shell, /type: 'group'/);
  assert.match(shell, /useWorkspace\(\)/);
});

test('issue 934 keeps the global design baseline free of Ant internal selectors', async () => {
  const css = await source('src/styles/design-system.css');
  assert.doesNotMatch(css, /(^|[,{]\s*)\.ant-[\w-]+/m);
});

test('issue 934 desktop matrix names all fourteen formal page entries', async () => {
  const spec = await source('e2e/css-desktop-viewport-matrix.spec.ts');
  for (const entry of [
    'home', 'mvp1Wizard', 'personArchive', 'personDetail', 'personEdit',
    'treeProduct', 'sourceLibrary', 'culture', 'imports', 'editingWorkspace',
    'reviewCenter', 'memberManage', 'auditTrace', 'auth'
  ]) {
    assert.match(spec, new RegExp(`key: '${entry}'`));
  }
});
