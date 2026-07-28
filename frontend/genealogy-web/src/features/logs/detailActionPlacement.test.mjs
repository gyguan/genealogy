import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const main = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../entity-page-header.css', import.meta.url), 'utf8');
const sourceDelete = readFileSync(new URL('../sources/SourceDraftDeleteAction.tsx', import.meta.url), 'utf8');

test('详情操作由组件结构和稳定样式负责，不安装入口层 DOM 补丁', () => {
  assert.doesNotMatch(main, /installDetailActionUnification/);
  assert.doesNotMatch(main, /MutationObserver/);
  assert.doesNotMatch(main, /querySelector\(/);
  assert.match(styles, /\.entity-page-header__actions/);
  assert.match(styles, /\.entity-detail-actions/);
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
