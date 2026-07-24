import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
async function source(path) { return readFile(new URL(path, root), 'utf8'); }

test('homepage is a discovery portal instead of a duplicated navigation card', async () => {
  const page = await source('features/home/UnifiedStatisticsHomePage.tsx');
  for (const label of ['最近浏览', '最新收录', '待补充线索', '世系概览', '宗族时间轴', '家族记忆']) {
    assert.match(page, new RegExp(label));
  }
  assert.doesNotMatch(page, /公共浏览入口/);
  assert.doesNotMatch(page, /主要支派分布/);
  assert.match(page, /public-home-page__lineage-share/);
  assert.match(page, /Input\.Search/);
  assert.match(page, /writePersonArchiveUrl/);
});

test('homepage uses real public data and degrades empty areas safely', async () => {
  const page = await source('features/home/UnifiedStatisticsHomePage.tsx');
  assert.match(page, /\/dashboard/);
  assert.match(page, /culture-overview/);
  assert.match(page, /EmptyState/);
  assert.match(page, /PageFeedback/);
  assert.match(page, /sourceCount/);
  assert.doesNotMatch(page, /12,486|3,628|黄峭山|民国十八年/);
});

test('homepage preserves clan context and user-scoped recent navigation', async () => {
  const page = await source('features/home/UnifiedStatisticsHomePage.tsx');
  assert.match(page, /\/auth\/me/);
  assert.match(page, /genealogy\.home\.recent/);
  assert.match(page, /sessionStorage/);
  assert.match(page, /clanId/);
  assert.match(page, /WorkspaceContext/);
});

test('homepage remains responsive without DOM mutation enhancement', async () => {
  const page = await source('features/home/UnifiedStatisticsHomePage.tsx');
  const css = await source('features/home/UnifiedStatisticsHomePage.css');
  assert.doesNotMatch(page, /MutationObserver|querySelector/);
  assert.match(css, /@media\s*\(max-width:\s*991px\)/);
  assert.match(css, /@media\s*\(max-width:\s*767px\)/);
});
