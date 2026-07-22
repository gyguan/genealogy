import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(new URL('./LineageTreeTabbedPage.tsx', import.meta.url), 'utf8');
const portalSource = readFileSync(new URL('./LineageTreeProductPagePortal.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./lineage-tabbed-page.css', import.meta.url), 'utf8');

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
  assert.match(pageSource, /人物中心图谱/);
  assert.match(pageSource, /支派全局图谱/);
  assert.match(pageSource, /className="lineage-query-tabs"/);
  assert.match(pageSource, /查询只刷新人物中心图谱/);
  assert.match(pageSource, /不受中心人物影响/);
  assert.match(css, /\.lineage-tabbed-page\s*\{[\s\S]*?flex-direction:\s*column;/);
  assert.match(css, /\.lineage-tab-query-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5,/);
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

test('each tab query refreshes only its own graph', () => {
  const personApply = between(pageSource, 'async function applyPersonQuery()', 'async function applyBranchQuery()');
  const branchApply = between(pageSource, 'async function applyBranchQuery()', 'function resetCurrentQuery()');

  assert.match(personApply, /loadPersonGraph\(personDraft\)/);
  assert.doesNotMatch(personApply, /loadBranchGraph/);
  assert.match(branchApply, /loadBranchGraph\(branchDraft\)/);
  assert.doesNotMatch(branchApply, /loadPersonGraph/);
});

test('draft, applied, results and loading states remain independent by tab', () => {
  assert.match(pageSource, /\[personDraft, setPersonDraft\]/);
  assert.match(pageSource, /\[personApplied, setPersonApplied\]/);
  assert.match(pageSource, /\[branchDraft, setBranchDraft\]/);
  assert.match(pageSource, /\[branchApplied, setBranchApplied\]/);
  assert.match(pageSource, /\[personGraph, setPersonGraph\]/);
  assert.match(pageSource, /\[branchGraph, setBranchGraph\]/);
  assert.match(pageSource, /personGraph:\s*IDLE/);
  assert.match(pageSource, /branchGraph:\s*IDLE/);
  assert.match(pageSource, /personBranchId:\s*personApplied\.branchId/);
  assert.match(pageSource, /personRelationScopes:\s*personApplied\.relationScopes/);
  assert.match(pageSource, /branchRelationScopes:\s*branchApplied\.relationScopes/);
});

test('application entry uses the tabbed page and portals only graph location', () => {
  assert.match(portalSource, /LineageTreeTabbedPage as LineageTreeProductPageBase/);
  assert.match(portalSource, /图内定位人物:\s*'locator'/);
  assert.doesNotMatch(portalSource, /切换中心人物:\s*'center'/);
});

test('responsive layout reduces five columns to one on mobile', () => {
  assert.match(css, /@media \(max-width: 1280px\)[\s\S]*?grid-template-columns:\s*repeat\(3,/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.lineage-tab-query-actions \.ant-btn[\s\S]*?width:\s*100%;/);
});
