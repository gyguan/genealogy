import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const css = readFileSync(new URL('../../lineage-result-toolbar-refinement.css', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('./LineageTreeProductPage.tsx', import.meta.url), 'utf8');
const canvasSource = readFileSync(new URL('./LineageGraphCanvas.tsx', import.meta.url), 'utf8');
const placementSource = readFileSync(new URL('./lineageToolbarPlacement.ts', import.meta.url), 'utf8');

test('lineage toolbar placement is installed by the application entry', () => {
  assert.match(mainSource, /import \{ installLineageToolbarPlacement \} from '\.\/features\/tree\/lineageToolbarPlacement';/);
  assert.match(mainSource, /installLineageToolbarPlacement\(\);/);
  assert.match(placementSource, /querySelector<HTMLElement>\('\.lineage-result-toolbar--double-card'\)/);
  assert.match(placementSource, /querySelector<HTMLElement>\('\.lineage-graph-toolbar'\)/);
  assert.match(placementSource, /graphToolbar\.insertBefore\(resultToolbar, actionGroup \|\| graphToolbar\.firstChild\)/);
});

test('person center and branch locator keep their labels inline with the selects', () => {
  assert.match(pageSource, /<Field label="中心人物"/);
  assert.match(pageSource, /<Field label="图内定位">/);
  assert.match(pageSource, /aria-label="切换中心人物"/);
  assert.match(pageSource, /aria-label="图内定位人物"/);
  assert.match(css, /grid-template-columns:\s*max-content minmax\(180px, 1fr\)/);
  assert.match(css, /content:\s*'：'/);
  assert.match(css, /content:\s*'圈内定位'/);
  assert.match(css, /\.lineage-result-toolbar--double-card\.is-person > :nth-child\(2\)\s*\{[\s\S]*?display:\s*none;/);
});

test('selectors and graph actions share the canvas toolbar row', () => {
  assert.match(canvasSource, /className="lineage-graph-toolbar"/);
  assert.match(css, /\.lineage-tree-page--standardized \.lineage-graph-toolbar\s*\{[\s\S]*?flex-direction:\s*row;[\s\S]*?flex-wrap:\s*wrap;/);
  assert.match(css, /\.lineage-graph-toolbar > \.lineage-result-toolbar--double-card\s*\{[\s\S]*?order:\s*0;/);
  assert.match(css, /\.lineage-graph-toolbar > \.ant-space\s*\{[\s\S]*?order:\s*1;/);
  assert.match(css, /\.lineage-graph-help\s*\{[\s\S]*?display:\s*none\s*!important;/);
});

test('narrow screens keep a usable stacked fallback', () => {
  assert.match(css, /@media \(max-width: 1100px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /grid-template-columns:\s*72px minmax\(0, 1fr\)/);
});

void root;
