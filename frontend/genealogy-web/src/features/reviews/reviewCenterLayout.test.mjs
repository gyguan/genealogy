import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const base = new URL('.', import.meta.url);

async function source(name) {
  return readFile(new URL(name, base), 'utf8');
}

test('审核详情抽屉遵循 720px 规范且移动端全屏', async () => {
  const css = await source('reviewCenterLayout.css');
  assert.match(css, /width:\s*720px\s*!important/);
  assert.match(css, /@media\s*\(max-width:\s*767px\)[\s\S]*width:\s*100vw\s*!important/);
});

test('质量检查入口只挂载在审核列表结果工具栏', async () => {
  const page = await source('ReviewCenterPage.tsx');
  const content = await source('ReviewCenterPageContent.tsx');
  assert.match(page, /query-result-outer-card__extra/);
  assert.match(page, />触发质量检查<\/Button>/);
  assert.doesNotMatch(content, /触发质量检查/);
});

test('审核详情操作位于 Drawer Header 且无重复 Footer', async () => {
  const content = await source('ReviewCenterPageContent.tsx');
  const drawerOpeningTag = content.match(/<Drawer[\s\S]*?>/)?.[0];
  assert.ok(drawerOpeningTag, '应存在审核详情 Drawer');
  assert.match(drawerOpeningTag, /extra=/);
  assert.doesNotMatch(drawerOpeningTag, /footer=/);
});
