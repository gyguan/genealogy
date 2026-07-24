import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('workbench enhancement provides prototype overview and issue center', async () => {
  const code = await source('workbench-enhancements.ts');
  assert.match(code, /修谱工作台总览/);
  assert.match(code, /任务总数/);
  assert.match(code, /处理中/);
  assert.match(code, /待确认/);
  assert.match(code, /阻塞问题/);
  assert.match(code, /数据质量问题/);
  assert.match(code, /overviewSignature/);
});

test('workbench quick entries preserve current workspace URL context', async () => {
  const code = await source('workbench-enhancements.ts');
  for (const label of ['新建修谱', '人物档案', '来源资料', '世系图谱']) assert.match(code, new RegExp(label));
  assert.match(code, /url\.searchParams\.set\('view', view\)/);
  assert.match(code, /PopStateEvent/);
});

test('workbench quality check supports query selected drafts session and server gate', async () => {
  const code = await source('workbench-enhancements.ts');
  for (const label of ['检查当前查询', '检查已选草稿', '检查整个修谱会话', '提交审核检查']) assert.match(code, new RegExp(label));
  for (const scope of ['QUERY', 'DRAFT_IDS', 'WORKBENCH_SESSION', 'REVIEW_GATE']) assert.match(code, new RegExp(scope));
  assert.match(code, /quality-checks\/submission-gate/);
  assert.match(code, /禁止提交审核/);
  assert.match(code, /affectedSubjectIds/);
});

test('workbench overview is responsive and drawer remains 720px', async () => {
  const css = await source('workbench-enhancements.css');
  assert.match(css, /grid-template-columns:\s*repeat\(5/);
  assert.match(css, /width:\s*min\(720px,\s*100vw\)/);
  assert.match(css, /workbench-quality-feedback/);
  assert.match(css, /@media\s*\(max-width:\s*575px\)/);
});
