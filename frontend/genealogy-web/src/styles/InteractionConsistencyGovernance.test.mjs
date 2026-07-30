import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const queryActions = read('../shared/ui/StandardQueryActions.tsx');
const pagePatterns = read('../shared/ui/StandardPagePatterns.tsx');
const resultCards = read('../shared/ui/QueryResultCards.tsx');
const queryActionCss = read('../shared/ui/standard-query-actions.css');
const cultureShell = read('../features/culture/CultureProductPage.tsx');
const cultureHeader = read('../features/culture/CultureSearchHeader.tsx');
const culturePattern = read('../features/culture/culturePagePattern.ts');
const cultureItems = read('../features/culture/CultureItemStandardTab.tsx');
const cultureMigrations = read('../features/culture/MigrationEventStandardTab.tsx');
const cultureSites = read('../features/culture/CultureSiteStandardTab.tsx');
const importPage = read('../features/imports/ImportPage.tsx');
const trackingPage = read('../features/logs/LogPage.tsx');
const memberPage = read('../features/members/MemberPage.tsx');
const memberManagement = read('../features/members/MemberManagementPage.tsx');

function index(source, token) {
  const value = source.indexOf(token);
  assert.ok(value >= 0, `${token} must exist`);
  return value;
}

test('more filters have one governed label icon count and touch target contract', () => {
  assert.match(queryActions, /export function StandardMoreFiltersButton/);
  assert.match(queryActions, /DownOutlined/);
  assert.match(queryActions, /UpOutlined/);
  assert.match(queryActions, /更多筛选/);
  assert.match(queryActions, /收起筛选/);
  assert.match(queryActions, /activeFilterCount/);
  assert.ok(index(queryActions, "['more', 'reset', 'submit']") < index(queryActions, 'flatMap'));
  assert.match(queryActionCss, /\[data-query-action="more"\]/);
  assert.match(queryActionCss, /min-height:\s*44px/);
  assert.doesNotMatch(queryActionCss, /\.ant-/);
});

test('query panels tabs and result sections expose one stable hierarchy', () => {
  assert.match(pagePatterns, /title = '查询条件'/);
  assert.match(pagePatterns, /export function StandardPageTabs/);
  assert.match(pagePatterns, /data-page-tabs-level="page"/);
  assert.match(pagePatterns, /data-query-tabs-level="parallel"/);
  assert.match(pagePatterns, /data-query-panel-role="query"/);
  assert.match(pagePatterns, /data-query-result-role="section"/);
  assert.match(pagePatterns, /（共 \{total\} 条）/);
});

test('result cards promote opted-in page actions and reserve the toolbar for result operations', () => {
  assert.match(resultCards, /pageAction\?: ReactNode/);
  assert.match(resultCards, /toolbar\?: ReactNode/);
  assert.match(resultCards, /promotePrimaryAction\?: boolean/);
  assert.match(resultCards, /StandardPageActions/);
  assert.match(resultCards, /PlusOutlined/);
  assert.match(resultCards, /replace\(\/\^\(新增\|新建\)\//);
  assert.match(resultCards, /创建\|新增\|新建\|邀请\|发起/);
  assert.match(resultCards, /type: 'default'/);
  assert.match(resultCards, /member-result-card/);
  assert.match(resultCards, /pageAlreadyOwnsPrimaryAction/);
  assert.match(memberManagement, /<StandardPageActions><MemberInvitationAction/);
  assert.match(memberPage, /className="member-result-card"/);
  assert.match(resultCards, /aria-label="结果操作"/);
  assert.match(resultCards, /data-result-toolbar-group="view"/);
  assert.match(resultCards, /data-result-toolbar-group="actions"/);
  assert.match(resultCards, /（共 \{total\} \{totalSuffix\}）/);
  assert.match(resultCards, /titleFromTotalSuffix/);
});

test('culture uses one page-level tab navigation and no duplicate query-card tabs', () => {
  assert.match(cultureShell, /<StandardPageTabs/);
  assert.match(cultureShell, /activeKey=\{activeTab\}/);
  assert.match(cultureShell, /items=\{cultureTabItems\}/);
  assert.doesNotMatch(cultureHeader, /<Tabs/);
  assert.doesNotMatch(cultureHeader, /cultureTabItems/);
});

test('all routed culture tabs use governed query panels and low-frequency filter disclosure', () => {
  for (const source of [cultureItems, cultureMigrations, cultureSites]) {
    assert.match(source, /<StandardQueryPanel/);
    assert.match(source, /<StandardMoreFiltersButton/);
    assert.match(source, /activeFilterCount=\{activeMoreCount\}/);
    assert.match(source, /setMoreOpen\(false\)/);
    assert.doesNotMatch(source, /<Collapse/);
    assert.doesNotMatch(source, /title="(文化资料|迁徙事件|宗族场所)查询"/);
  }
});

test('data import uses governed query actions and process-start vocabulary', () => {
  assert.match(importPage, /className="import-query-card" title="查询条件"/);
  assert.match(importPage, /<StandardQueryActions>/);
  assert.match(importPage, /data-query-action="reset"/);
  assert.match(importPage, /data-query-action="submit"/);
  assert.match(importPage, />发起导入<\/Button>/);
  assert.match(importPage, /title="发起导入"/);
  assert.doesNotMatch(importPage, /(新建|新增)导入/);
});

test('tracking page uses governed actions and business result titles', () => {
  assert.match(trackingPage, /<StandardQueryActions wrap>/);
  assert.match(trackingPage, /data-query-action="more"/);
  assert.match(trackingPage, /expanded\.object/);
  assert.match(trackingPage, /expanded\.audit/);
  assert.match(trackingPage, /expanded\.risk/);
  assert.match(trackingPage, /totalSuffix=\{activeTab === TRACKING_TABS\.OBJECT/);
});

test('page-level culture actions use create vocabulary', () => {
  assert.match(culturePattern, /primaryAction: '创建文化资料'/);
  assert.match(culturePattern, /primaryAction: '创建迁徙事件'/);
  assert.match(culturePattern, /primaryAction: '创建文化场所'/);
  assert.doesNotMatch(culturePattern, /primaryAction: '(新增|新建)/);
});
