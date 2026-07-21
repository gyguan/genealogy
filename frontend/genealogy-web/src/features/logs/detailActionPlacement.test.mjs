import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const main = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../entity-page-header.css', import.meta.url), 'utf8');
const sourceDelete = readFileSync(new URL('../sources/SourceDraftDeleteAction.tsx', import.meta.url), 'utf8');

function detailActionFunction() {
  const start = main.indexOf('function installDetailActionUnification()');
  const end = main.indexOf('\ninstallSourceRouteHistorySync();', start);
  assert.notEqual(start, -1, '应安装详情操作统一逻辑');
  assert.notEqual(end, -1, '应在应用启动前注册详情操作统一逻辑');
  return main.slice(start, end);
}

test('详情操作统一到页头或 Drawer 右上角', () => {
  const source = detailActionFunction();
  assert.match(source, /\.entity-page-header__actions/);
  assert.match(source, /\.ant-drawer \.ant-drawer-extra/);
  assert.match(source, /\.lineage-inspector-actions/);
  assert.match(source, /data-source-detail-actions/);
  assert.match(main, /installDetailActionUnification\(\);/);
});

test('详情操作顺序保持辅助、更多或危险、主操作', () => {
  const source = detailActionFunction();
  assert.match(source, /isPrimary \? '30' : isDestructive \? '20' : '10'/);
  assert.match(source, /label === '更多'/);
  assert.match(source, /ant-btn-dangerous/);
});

test('详情操作归位不覆盖 React 管理的文本', () => {
  assert.doesNotMatch(detailActionFunction(), /textContent\s*=/);
});

test('统一详情操作样式覆盖桌面端与移动端', () => {
  assert.match(styles, /\.entity-detail-actions/);
  assert.match(styles, /\.entity-detail-drawer \.ant-drawer-header/);
  assert.match(styles, /gap:\s*8px/);
  assert.match(styles, /@media \(max-width: 767px\)/);
  assert.match(styles, /min-height:\s*40px/);
});

test('来源草稿删除通过 Portal 进入详情操作区', () => {
  assert.match(sourceDelete, /createPortal/);
  assert.match(sourceDelete, /data-source-detail-actions/);
  assert.doesNotMatch(sourceDelete, /buttonProps=\{\{ size: 'small' \}\}/);
});
