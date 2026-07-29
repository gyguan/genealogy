import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

async function missing(path) {
  try {
    await access(new URL(path, root));
    return false;
  } catch {
    return true;
  }
}

test('module registry renders the formal workbench page', async () => {
  const registry = await source('app/moduleRegistry.tsx');
  assert.match(registry, /EditingWorkspacePage/);
  assert.doesNotMatch(registry, /EditingWorkspacePrototypePage/);
  assert.match(registry, /<EditingWorkspacePage onNavigate=\{navigate\}/);
});

test('prototype workbench entry and stylesheet are retired', async () => {
  assert.equal(await missing('features/workbench/EditingWorkspacePrototypePage.tsx'), true);
  assert.equal(await missing('features/workbench/editing-workspace-prototype.css'), true);
});

test('workbench uses Ant Design page components and shared feedback', async () => {
  const page = await source('features/workbench/EditingWorkspacePage.tsx');
  for (const component of ['Button', 'Card', 'Form', 'Input', 'Select', 'Table', 'Drawer', 'Modal', 'Pagination']) {
    assert.match(page, new RegExp(`\\b${component}\\b`), `${component} should be used`);
  }
  assert.match(page, /PageFeedback/);
  assert.match(page, /EmptyState/);
  assert.doesNotMatch(page, /className=["'][^"']*(?:prototype-|proto-)/);
  assert.doesNotMatch(page, /MutationObserver|document\.querySelector|innerHTML/);
});

test('workbench preserves query, task list and navigation workflows', async () => {
  const page = await source('features/workbench/EditingWorkspacePage.tsx');
  for (const marker of [
    '/workbench/tasks?',
    'loadHistory',
    'submitBulkCheck',
    'exportTasks',
    'goRelatedEntry',
    '任务模板管理',
    '修谱工作台'
  ]) assert.match(page, new RegExp(marker.replace(/[?]/g, '\\?')));
});

test('workbench provides responsive, empty, error and keyboard states', async () => {
  const page = await source('features/workbench/EditingWorkspacePage.tsx');
  assert.match(page, /Grid\.useBreakpoint/);
  assert.match(page, /screens\.md/);
  assert.match(page, /locale=\{\{ emptyText: emptyNode \}\}/);
  assert.match(page, /taskError/);
  assert.match(page, /role: 'button'/);
  assert.match(page, /tabIndex: 0/);
  assert.match(page, /event\.key === 'Enter'/);
  assert.match(page, /scroll=\{\{ x: 880 \}\}/);
  assert.match(page, /width=\{screens\.md \? 720 : '100%'\}/);
});

test('desktop task table keeps critical information visible and exposes low-frequency details', async () => {
  const page = await source('features/workbench/EditingWorkspacePage.tsx');

  for (const key of ['taskName', 'status', 'risk', 'creator', 'updatedAt', 'actions']) {
    assert.match(page, new RegExp(`key: '${key}'`), `${key} should remain a primary desktop column`);
  }

  assert.match(page, /columnTitle: '完整信息'/);
  assert.match(page, /expandedRowRender: expandedTaskInformation/);
  assert.match(page, /label="谱书名称"/);
  assert.match(page, /label="任务类型"/);
  assert.match(page, /label="创建时间"/);
  assert.match(page, /label="涉及对象"/);
  assert.match(page, /label="所属范围"/);
  assert.match(page, /tableLayout="fixed"/);
  assert.match(page, /rowSelection=\{\{ columnWidth: 44/);
  assert.match(page, /columnWidth: 56/);
  assert.match(page, /key: 'taskName', title: '任务名称', width: 210/);
  assert.match(page, /key: 'actions', title: '操作', width: 144/);
  assert.match(page, /scroll=\{\{ x: 880 \}\}/);
  assert.doesNotMatch(page, /fixed: 'right'/);
  assert.doesNotMatch(page, /responsive:\s*\[/);
  assert.doesNotMatch(page, /scroll=\{\{ x: (?:970|1230) \}\}/);
});
