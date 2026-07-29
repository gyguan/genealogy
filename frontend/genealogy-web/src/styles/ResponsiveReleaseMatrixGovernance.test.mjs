import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const registryPath = new URL('../../e2e/responsive-release-matrix.ts', import.meta.url);
const specPath = new URL('../../e2e/responsive-release-matrix.spec.ts', import.meta.url);
const registry = readFileSync(registryPath, 'utf8');
const spec = readFileSync(specPath, 'utf8');

const requiredPages = [
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

const requiredViewports = [
  ['mobile', 390, 844],
  ['tablet', 768, 1024],
  ['compact-desktop', 1024, 768]
];

test('issue #946 registry contains the exact 14 formal pages once', () => {
  for (const [key, label] of requiredPages) {
    assert.match(registry, new RegExp(`key: '${key}'`), `${label} must be registered`);
    assert.equal((registry.match(new RegExp(`key: '${key}'`, 'g')) || []).length, 1, `${label} must be unique`);
  }
  const pageEntries = registry.match(/authenticated: (?:true|false), shell: (?:true|false), representative:/g) || [];
  assert.equal(pageEntries.length, 14, 'formal responsive page count must remain 14 until the product page registry changes');
});

test('issue #946 registry contains the exact phone tablet and compact desktop matrix', () => {
  for (const [key, width, height] of requiredViewports) {
    assert.match(registry, new RegExp(`key: '${key}', width: ${width}, height: ${height}`));
  }
  assert.match(registry, /DESKTOP_REGRESSION_WIDTHS = \[1280, 1440, 1920\]/);
});

test('responsive matrix produces mobile screenshots and JSON failure reports', () => {
  assert.match(spec, /viewport\.key === 'mobile'/);
  assert.match(spec, /fullPage: true/);
  assert.match(spec, /responsive-release-\$\{viewport\.key\}\.json/);
  assert.match(spec, /horizontalOverflow/);
  assert.match(spec, /criticalActionReachable/);
  assert.match(spec, /ant-table-wrapper:visible/);
  assert.match(spec, /ant-drawer-content-wrapper:visible/);
  assert.match(spec, /ant-modal-content:visible/);
  assert.match(spec, /expect\.soft\(report\.failures/);
});
