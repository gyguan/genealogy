import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const css = readFileSync(new URL('../../lineage-result-toolbar-refinement.css', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('./LineageTreeProductPage.tsx', import.meta.url), 'utf8');
const canvasSource = readFileSync(new URL('./LineageGraphCanvas.tsx', import.meta.url), 'utf8');

test('result toolbar refinement stylesheet is loaded without DOM reparenting', () => {
  assert.match(mainSource, /import '\.\/lineage-result-toolbar-refinement\.css';/);
  assert.doesNotMatch(mainSource, /installLineageToolbarPlacement/);
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

test('selectors visually share the canvas toolbar row while remaining React-owned siblings', () => {
  assert.match(canvasSource, /className="lineage-graph-toolbar"/);
  assert.match(css, /\.lineage-result-pane\s*\{[\s\S]*?position:\s*relative;/);
  assert.match(css, /\.lineage-result-toolbar--double-card,[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*13px;[\s\S]*?left:\s*11px;/);
  assert.match(css, /\.lineage-result-pane \.lineage-graph-toolbar\s*\{[\s\S]*?padding-left:\s*382px;[\s\S]*?flex-direction:\s*row;[\s\S]*?flex-wrap:\s*wrap;/);
  assert.match(css, /\.lineage-graph-help\s*\{[\s\S]*?display:\s*none\s*!important;/);
});

test('empty graph, fullscreen and narrow screens have stable fallbacks', () => {
  assert.match(css, /:not\(:has\(\.lineage-graph-toolbar\)\)/);
  assert.match(css, /\.lineage-graph-shell\.is-fullscreen \.lineage-graph-toolbar\s*\{[\s\S]*?padding-left:\s*10px;/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /grid-template-columns:\s*72px minmax\(0, 1fr\)/);
});

void root;
