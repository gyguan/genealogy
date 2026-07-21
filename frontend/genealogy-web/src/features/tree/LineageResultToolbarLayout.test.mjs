import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const css = readFileSync(new URL('../../lineage-result-toolbar-refinement.css', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('./LineageTreeProductPage.tsx', import.meta.url), 'utf8');
const canvasSource = readFileSync(new URL('./LineageGraphCanvas.tsx', import.meta.url), 'utf8');

test('result toolbar refinement stylesheet is loaded', () => {
  assert.match(mainSource, /import '\.\/lineage-result-toolbar-refinement\.css';/);
});

test('center person and in-graph locator stay visible and align label with select', () => {
  assert.match(pageSource, /<Field label="中心人物"/);
  assert.match(pageSource, /<Field label="图内定位">/);
  assert.match(css, /\.lineage-result-toolbar--double-card\.is-person > :nth-child\(2\)\s*\{[\s\S]*?display:\s*block;/);
  assert.match(css, /grid-template-columns:\s*max-content minmax\(0, 1fr\)/);
  assert.match(css, /content:\s*'：'/);
  assert.match(css, /content:\s*'圈内定位'/);
});

test('graph operation hint is removed from the visible canvas toolbar', () => {
  assert.match(canvasSource, /滚轮缩放 · 拖动画布 · 单击查看详情 · 双击设为中心/);
  assert.match(css, /\.lineage-graph-help\s*\{[\s\S]*?display:\s*none\s*!important;/);
});

test('responsive layout keeps labels and selects on one line', () => {
  assert.match(css, /@media \(max-width: 1399px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /grid-template-columns:\s*72px minmax\(0, 1fr\)/);
});

void root;
