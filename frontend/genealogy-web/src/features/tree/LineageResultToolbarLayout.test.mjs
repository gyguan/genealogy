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

test('person center and branch locator labels are forced onto the same row as their selects', () => {
  assert.match(pageSource, /<Field label="中心人物"/);
  assert.match(pageSource, /<Field label="图内定位">/);
  assert.match(pageSource, /aria-label="切换中心人物"/);
  assert.match(pageSource, /aria-label="图内定位人物"/);
  assert.match(css, /\.ant-form-item-row\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-flow:\s*row nowrap\s*!important;/);
  assert.match(css, /\.ant-form-item-label\s*\{[\s\S]*?flex:\s*0 0 auto\s*!important;[\s\S]*?white-space:\s*nowrap;/);
  assert.match(css, /\.ant-form-item-control\s*\{[\s\S]*?flex:\s*0 1 280px\s*!important;/);
  assert.match(css, /content:\s*'：'/);
  assert.match(css, /content:\s*'圈内定位'/);
  assert.match(css, /\.lineage-result-toolbar--double-card\.is-person > :nth-child\(2\)\s*\{[\s\S]*?display:\s*none;/);
});

test('selector group is aligned to the right of the canvas toolbar row', () => {
  assert.match(canvasSource, /className="lineage-graph-toolbar"/);
  assert.match(css, /\.lineage-result-pane\s*\{[\s\S]*?position:\s*relative;/);
  assert.match(css, /\.lineage-result-toolbar--double-card,[\s\S]*?position:\s*absolute\s*!important;[\s\S]*?right:\s*11px\s*!important;[\s\S]*?left:\s*auto\s*!important;/);
  assert.match(css, /justify-content:\s*flex-end;/);
  assert.match(css, /\.lineage-result-pane \.lineage-graph-toolbar\s*\{[\s\S]*?padding:\s*8px 382px 8px 10px\s*!important;[\s\S]*?flex-direction:\s*row;/);
  assert.match(css, /\.lineage-graph-help\s*\{[\s\S]*?display:\s*none\s*!important;/);
});

test('empty graph, fullscreen and narrow screens keep stable horizontal labels', () => {
  assert.match(css, /:not\(:has\(\.lineage-graph-toolbar\)\)/);
  assert.match(css, /:has\(\.lineage-graph-shell\.is-fullscreen\)/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?flex-flow:\s*row nowrap\s*!important;/);
});

void root;
