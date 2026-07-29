import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const read = relative => readFileSync(path.join(root, relative), 'utf8');
const spec = read('e2e/css-responsive-release-matrix.spec.ts');
const desktop = read('e2e/css-desktop-viewport-matrix.spec.ts');
const registry = read('src/app/moduleRegistry.tsx');
const packageJson = read('package.json');
const workflow = read('../../.github/workflows/culture-page-gate.yml');
const browserWorkflow = read('../../.github/workflows/multi-browser-compatibility.yml');

const formalPages = [
  ['home', '族谱首页'],
  ['mvp1Wizard', '建谱向导'],
  ['personArchive', '人物档案'],
  ['personDetail', '人物详情'],
  ['personEdit', '人物编辑'],
  ['treeProduct', '世系图谱'],
  ['sourceLibrary', '来源资料库'],
  ['culture', '宗族文化'],
  ['imports', '数据导入'],
  ['editingWorkspace', '修谱工作台'],
  ['reviewCenter', '审核中心'],
  ['memberManage', '成员与权限'],
  ['auditTrace', '审计追踪'],
  ['auth', '登录认证']
];

const viewports = [
  ['mobile', 390, 844],
  ['tablet', 768, 1024],
  ['landscape-tablet', 1024, 768]
];

test('responsive matrix contains exactly all 14 formal pages', () => {
  for (const [key, label] of formalPages) {
    assert.match(spec, new RegExp(`key: '${key}'[\\s\\S]{0,100}label: '${label}'`), `${label} must remain in the responsive matrix`);
  }
  const declared = [...spec.matchAll(/\{ key: '([^']+)', label: '[^']+', url:/g)].map(match => match[1]);
  assert.deepEqual(declared, formalPages.map(([key]) => key));
});

test('all registered shell modules are represented in the responsive matrix', () => {
  const registered = [...registry.matchAll(/\{ key: '([^']+)', label:/g)].map(match => match[1]);
  for (const key of registered) assert.match(spec, new RegExp(`key: '${key}'`), `${key} must be added to the responsive release matrix`);
});

test('mobile tablet and landscape tablet viewport contract is immutable', () => {
  for (const [key, width, height] of viewports) {
    assert.match(spec, new RegExp(`key: '${key}', width: ${width}, height: ${height}`));
  }
  assert.match(desktop, /\[1920, 1440, 1366, 1280\]/);
});

test('responsive release checks include overflow actions containers navigation and mobile screenshots', () => {
  for (const required of [
    'expectNoDocumentOverflow',
    'expectCriticalActionsReachable',
    'expectRepresentativeContainers',
    'ant-layout-sider-zero-width-trigger',
    '390x844-full.png',
    'ant-table-wrapper',
    'ant-modal-content',
    'ant-drawer-content-wrapper',
    'ant-steps',
    'ant-upload-wrapper'
  ]) assert.match(spec, new RegExp(required));
});

test('visual and multi-browser workflows execute the responsive suite', () => {
  assert.match(workflow, /css-responsive-release-matrix\.spec\.ts/);
  assert.match(packageJson, /test:culture[\s\S]*css-responsive-release-matrix\.spec\.ts/);
  assert.match(browserWorkflow, /npx playwright test --project/);
  for (const project of ['chromium', 'firefox', 'webkit']) assert.match(browserWorkflow, new RegExp(`project: ${project}`));
});
