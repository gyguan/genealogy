import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const globalCss = readFileSync(new URL('../../lineage-result-toolbar-refinement.css', import.meta.url), 'utf8');
const pageCss = readFileSync(new URL('./lineage-tabbed-page.css', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');
const formSource = readFileSync(new URL('../../shared/ui/Form.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('./LineageTreeTabbedPage.tsx', import.meta.url), 'utf8');
const portalSource = readFileSync(new URL('./LineageTreeProductPagePortal.tsx', import.meta.url), 'utf8');
const canvasSource = readFileSync(new URL('./LineageGraphCanvas.tsx', import.meta.url), 'utf8');

test('result toolbar refinement stylesheet is loaded without imperative DOM reparenting', () => {
  assert.match(mainSource, /import '\.\/lineage-result-toolbar-refinement\.css';/);
  assert.doesNotMatch(mainSource, /installLineageToolbarPlacement/);
});

test('tree-specific wrapper owns only the graph locator portal lifecycle', () => {
  assert.match(canvasSource, /className="lineage-graph-toolbar"/);
  assert.match(portalSource, /FieldPortalProvider/);
  assert.match(portalSource, /LINEAGE_TOOLBAR_FIELD_KIND/);
  assert.match(portalSource, /图内定位人物:\s*'locator'/);
  assert.doesNotMatch(portalSource, /切换中心人物:\s*'center'/);
  assert.match(portalSource, /querySelector<HTMLElement>\('\.lineage-graph-toolbar'\)/);
  assert.match(portalSource, /new MutationObserver\(syncTarget\)/);
  assert.match(portalSource, /className: `lineage-graph-toolbar-field lineage-graph-toolbar-field--\$\{kind\}`/);
  assert.match(formSource, /export function FieldPortalProvider/);
  assert.match(formSource, /createPortal\(fieldNode, portal\.target\)/);
  assert.doesNotMatch(formSource, /切换中心人物|图内定位人物|lineage-graph-toolbar/);
});

test('center selector remains in the person tab while graph locator is portaled', () => {
  assert.match(pageSource, /<Field label="中心人物" hint="仅影响人物中心图谱">/);
  assert.match(pageSource, /aria-label="切换中心人物"/);
  assert.match(pageSource, /<Field label="图内定位">/);
  assert.match(pageSource, /aria-label="图内定位人物"/);
  assert.match(globalCss, /\.lineage-graph-toolbar-field \.ant-form-item-row\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?align-items:\s*center\s*!important;/);
  assert.match(globalCss, /content:\s*'圈内定位'/);
});

test('locator is centered vertically and aligned right inside the graph toolbar', () => {
  assert.match(pageCss, /\.lineage-tabbed-page \.lineage-graph-toolbar\s*\{[\s\S]*?align-items:\s*center;[\s\S]*?flex-direction:\s*row;[\s\S]*?flex-wrap:\s*nowrap;/);
  assert.match(pageCss, /\.lineage-tabbed-page \.lineage-graph-toolbar > \.lineage-graph-toolbar-field\s*\{[\s\S]*?align-self:\s*center;[\s\S]*?margin:\s*0 0 0 auto\s*!important;/);
  assert.match(globalCss, /\.lineage-result-toolbar--double-card:empty\s*\{[\s\S]*?display:\s*none;/);
  assert.doesNotMatch(pageCss, /position:\s*absolute\s*!important/);
  assert.match(globalCss, /\.lineage-graph-help\s*\{[\s\S]*?display:\s*none\s*!important;/);
});

test('narrow screens keep query actions and locator usable', () => {
  assert.match(pageCss, /@media \(max-width: 900px\)/);
  assert.match(pageCss, /@media \(max-width: 767px\)/);
  assert.match(pageCss, /@media \(max-width: 767px\)[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.match(pageCss, /@media \(max-width: 767px\)[\s\S]*?flex-direction:\s*column;/);
  assert.match(pageCss, /@media \(max-width: 767px\)[\s\S]*?align-self:\s*stretch;/);
  assert.match(pageCss, /@media \(max-width: 767px\)[\s\S]*?margin-left:\s*0\s*!important;/);
});

void root;
