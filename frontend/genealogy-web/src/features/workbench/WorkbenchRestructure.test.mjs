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

test('workbench keeps only query and task-list primary hierarchy', async () => {
  const code = await source('features/workbench/EditingWorkspacePrototypePage.tsx');
  for (const label of ['修谱工作台', '修谱任务']) assert.match(code, new RegExp(label));
  for (const removed of ['workbench-overview-section', 'workbench-quality-card', '数据质量检查', 'quality-checks', 'QualityResult', 'QualityRule']) {
    assert.doesNotMatch(code, new RegExp(removed));
  }
  const sections = ['workbench-query-card', 'workbench-task-card'];
  const positions = sections.map(marker => code.indexOf(marker));
  assert.ok(positions.every(value => value >= 0));
  assert.ok(positions[1] > positions[0]);
});

test('workbench keeps task list responsive and 720px drawer', async () => {
  const code = await source('features/workbench/EditingWorkspacePrototypePage.tsx');
  const css = await source('features/workbench/editing-workspace-prototype.css');
  assert.match(code, /新建修谱/);
  assert.match(css, /width:\s*min\(720px,\s*100vw\)/);
  assert.match(css, /@media\s*\(max-width:\s*575px\)/);
  assert.match(code, /rowSelection/);
  assert.match(code, /Pagination/);
});
