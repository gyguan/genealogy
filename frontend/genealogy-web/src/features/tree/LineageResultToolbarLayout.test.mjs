import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const css = readFileSync(new URL('../../lineage-result-toolbar-refinement.css', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');
const formSource = readFileSync(new URL('../../shared/ui/Form.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('./LineageTreeProductPage.tsx', import.meta.url), 'utf8');
const portalSource = readFileSync(new URL('./LineageTreeProductPagePortal.tsx', import.meta.url), 'utf8');
const canvasSource = readFileSync(new URL('./LineageGraphCanvas.tsx', import.meta.url), 'utf8');

test('result toolbar refinement stylesheet is loaded without imperative DOM reparenting', () => {
  assert.match(mainSource, /import '\.\/lineage-result-toolbar-refinement\.css';/);
  assert.doesNotMatch(mainSource, /installLineageToolbarPlacement/);
});

test('tree-specific wrapper owns the portal target lifecycle', () => {
  assert.match(canvasSource, /className="lineage-graph-toolbar"/);
  assert.match(portalSource, /FieldPortalProvider/);
  assert.match(portalSource, /LINEAGE_TOOLBAR_FIELD_KIND/);
  assert.match(portalSource, /querySelector<HTMLElement>\('\.lineage-graph-toolbar'\)/);
  assert.match(portalSource, /new MutationObserver\(syncTarget\)/);
  assert.match(portalSource, /className: `lineage-graph-toolbar-field lineage-graph-toolbar-field--\$\{kind\}`/);
  assert.match(formSource, /export function FieldPortalProvider/);
  assert.match(formSource, /createPortal\(fieldNode, portal\.target\)/);
  assert.doesNotMatch(formSource, /切换中心人物|图内定位人物|lineage-graph-toolbar/);
});

test('person center and branch locator labels stay inline with their selects', () => {
  assert.match(pageSource, /<Field label="中心人物"/);
  assert.match(pageSource, /<Field label="图内定位">/);
  assert.match(pageSource, /aria-label="切换中心人物"/);
  assert.match(pageSource, /aria-label="图内定位人物"/);
  assert.match(css, /\.lineage-graph-toolbar-field \.ant-form-item-row\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-flow:\s*row nowrap\s*!important;/);
  assert.match(css, /\.lineage-graph-toolbar-field \.ant-form-item-label\s*\{[\s\S]*?flex:\s*0 0 auto\s*!important;[\s\S]*?white-space:\s*nowrap;/);
  assert.match(css, /content:\s*'：'/);
  assert.match(css, /content:\s*'圈内定位'/);
});

test('selector is a direct toolbar child and aligned to the right', () => {
  assert.match(css, /\.lineage-graph-toolbar > \.lineage-graph-toolbar-field\s*\{[\s\S]*?margin:\s*0 0 0 auto;/);
  assert.match(css, /\.lineage-result-pane:has\(> \.lineage-result-toolbar--double-card\.is-person\)[\s\S]*?\.lineage-graph-toolbar > \.lineage-graph-toolbar-field--locator\s*\{[\s\S]*?display:\s*none;/);
  assert.match(css, /\.lineage-result-toolbar--double-card:empty\s*\{[\s\S]*?display:\s*none;/);
  assert.doesNotMatch(css, /position:\s*absolute\s*!important/);
  assert.doesNotMatch(css, /padding-right:\s*3\d{2}px\s*!important/);
  assert.match(css, /\.lineage-graph-help\s*\{[\s\S]*?display:\s*none\s*!important;/);
});

test('narrow screens keep the toolbar field usable', () => {
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?flex-direction:\s*column;/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?margin-left:\s*0;/);
});

void root;
