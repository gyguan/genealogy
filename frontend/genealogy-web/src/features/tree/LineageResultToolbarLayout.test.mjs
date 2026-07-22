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

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `missing start marker: ${start}`);
  assert.ok(endIndex > startIndex, `missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test('lineage page follows the culture-style query card plus result card pattern', () => {
  assert.match(pageSource, /<Card className="lineage-tabbed-query-card" title="世系图谱"/);
  assert.match(pageSource, /<QueryResultCard[\s\S]*className="lineage-tabbed-result-card"/);
  assert.match(pageSource, /className="lineage-query-tabs"/);
  assert.match(pageSource, /查询只刷新人物中心图谱/);
  assert.match(pageSource, /不受中心人物影响/);
  assert.match(pageCss, /\.lineage-tabbed-page\s*\{[\s\S]*?flex-direction:\s*column;/);
  assert.match(pageCss, /\.lineage-tab-query-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5,/);
});

test('person and branch tabs expose only their own query conditions', () => {
  const personForm = between(pageSource, 'const personQueryForm =', 'const branchQueryForm =');
  const branchForm = between(pageSource, 'const branchQueryForm =', 'const resultMeta =');

  assert.match(personForm, /label="中心人物"/);
  assert.match(personForm, /aria-label="人物中心展开深度"/);
  assert.match(personForm, /PERSON_DEPTH_OPTIONS/);
  assert.doesNotMatch(personForm, /包含下级支派/);

  assert.match(branchForm, /aria-label="支派全局展开深度"/);
  assert.match(branchForm, /aria-label="包含下级支派"/);
  assert.doesNotMatch(branchForm, /label="中心人物"/);
  assert.doesNotMatch(branchForm, /切换中心人物/);
});

test('person depth defaults to one and is capped at three in the UI', () => {
  const depthOptions = between(pageSource, 'const PERSON_DEPTH_OPTIONS', 'const BRANCH_DEPTH_OPTIONS');
  assert.match(depthOptions, /value:\s*'1'/);
  assert.match(depthOptions, /value:\s*'2'/);
  assert.match(depthOptions, /value:\s*'3'/);
  assert.doesNotMatch(depthOptions, /value:\s*'[458]'/);
  assert.match(pageSource, /depth:\s*useInitialState \? initialPerson\.depth : '1'/);
  assert.match(pageSource, /默认 1 代，最多 3 代/);
});

test('each tab query refreshes only its own graph and keeps independent applied state', () => {
  const personApply = between(pageSource, 'async function applyPersonQuery()', 'async function applyBranchQuery()');
  const branchApply = between(pageSource, 'async function applyBranchQuery()', 'function resetCurrentQuery()');

  assert.match(personApply, /loadPersonGraph\(personDraft\)/);
  assert.doesNotMatch(personApply, /loadBranchGraph/);
  assert.match(branchApply, /loadBranchGraph\(branchDraft\)/);
  assert.doesNotMatch(branchApply, /loadPersonGraph/);
  assert.match(pageSource, /\[personApplied, setPersonApplied\]/);
  assert.match(pageSource, /\[branchApplied, setBranchApplied\]/);
  assert.match(pageSource, /personBranchId:\s*personApplied\.branchId/);
  assert.match(pageSource, /personRelationScopes:\s*personApplied\.relationScopes/);
  assert.match(pageSource, /branchRelationScopes:\s*branchApplied\.relationScopes/);
});

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
  assert.match(pageCss, /@media \(max-width: 1280px\)[\s\S]*?grid-template-columns:\s*repeat\(3,/);
  assert.match(pageCss, /@media \(max-width: 900px\)[\s\S]*?grid-template-columns:\s*repeat\(2,/);
  assert.match(pageCss, /@media \(max-width: 767px\)[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.match(pageCss, /@media \(max-width: 767px\)[\s\S]*?flex-direction:\s*column;/);
  assert.match(pageCss, /@media \(max-width: 767px\)[\s\S]*?align-self:\s*stretch;/);
  assert.match(pageCss, /@media \(max-width: 767px\)[\s\S]*?margin-left:\s*0\s*!important;/);
});

void root;
