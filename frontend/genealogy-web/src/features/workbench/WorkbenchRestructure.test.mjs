import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('workbench is rendered as a formal React page instead of DOM mutation', async () => {
  const page = await source('features/workbench/EditingWorkspacePrototypePage.tsx');
  const index = await source('../index.html');
  assert.match(page, /export function EditingWorkspacePrototypePage/);
  assert.doesNotMatch(page, /MutationObserver/);
  assert.doesNotMatch(index, /workbench-enhancements/);
});

test('workbench follows query overview quality and task-list prototype hierarchy', async () => {
  const code = await source('features/workbench/EditingWorkspacePrototypePage.tsx');
  for (const label of ['修谱工作台', '当前任务', '快捷入口', '数据质量检查', '修谱任务']) assert.match(code, new RegExp(label));
  const sections = ['workbench-query-card', 'workbench-overview-section', 'workbench-quality-card', 'workbench-task-card'];
  const positions = sections.map(marker => code.indexOf(marker));
  assert.ok(positions.every(value => value >= 0));
  assert.ok(positions.every((value, index) => index === 0 || value > positions[index - 1]));
});

test('workbench preserves quality scopes and server submission gate', async () => {
  const code = await source('features/workbench/EditingWorkspacePrototypePage.tsx');
  for (const scope of ['QUERY', 'DRAFT_IDS', 'WORKBENCH_SESSION', 'REVIEW_GATE']) assert.match(code, new RegExp(scope));
  assert.match(code, /quality-checks\/submission-gate/);
  assert.match(code, /affectedSubjectIds/);
  assert.match(code, /存在阻断问题/);
});

test('workbench keeps quick entries responsive list and 720px drawer', async () => {
  const code = await source('features/workbench/EditingWorkspacePrototypePage.tsx');
  const css = await source('features/workbench/editing-workspace-prototype.css');
  for (const label of ['新建修谱', '人物档案', '来源资料', '世系图谱']) assert.match(code, new RegExp(label));
  assert.match(css, /width:\s*min\(720px,\s*100vw\)/);
  assert.match(css, /@media\s*\(max-width:\s*575px\)/);
  assert.match(code, /rowSelection/);
  assert.match(code, /Pagination/);
});
