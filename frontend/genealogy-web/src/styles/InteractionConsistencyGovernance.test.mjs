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
const cultureQuery = read('../features/culture/CultureSearchPanel.tsx');
const riskAudit = read('../features/logs/RiskAuditPanel.tsx');

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

test('result cards promote page actions and reserve the toolbar for secondary result operations', () => {
  assert.match(resultCards, /pageAction\?: ReactNode/);
  assert.match(resultCards, /toolbar\?: ReactNode/);
  assert.match(resultCards, /StandardPageActions/);
  assert.match(resultCards, /PlusOutlined/);
  assert.match(resultCards, /replace\(\/\^\(新增\|新建\)\//);
  assert.match(resultCards, /type: 'default'/);
  assert.match(resultCards, /aria-label="结果操作"/);
  assert.match(resultCards, /data-result-toolbar-group="view"/);
  assert.match(resultCards, /data-result-toolbar-group="actions"/);
  assert.match(resultCards, /（共 \{total\} \{totalSuffix\}）/);
});

test('culture uses one page-level tab navigation and no duplicate query-card tabs', () => {
  assert.match(cultureShell, /<StandardPageTabs/);
  assert.match(cultureShell, /activeKey=\{activeTab\}/);
  assert.match(cultureShell, /items=\{cultureTabItems\}/);
  assert.doesNotMatch(cultureHeader, /<Tabs/);
  assert.doesNotMatch(cultureHeader, /cultureTabItems/);
});

test('representative query pages use standard panels and low-frequency filter disclosure', () => {
  assert.match(cultureQuery, /<StandardQueryPanel/);
  assert.match(cultureQuery, /<StandardMoreFiltersButton/);
  assert.match(cultureQuery, /activeFilterCount=\{activeMoreCount\}/);
  assert.match(cultureQuery, /setMoreOpen\(false\)/);
  assert.match(riskAudit, /<StandardQueryPanel/);
  assert.match(riskAudit, /<StandardResultSection title="高风险操作事件" total=\{page\?\.total\}/);
});

test('page-level culture actions use create vocabulary', () => {
  assert.match(culturePattern, /primaryAction: '创建文化资料'/);
  assert.match(culturePattern, /primaryAction: '创建迁徙事件'/);
  assert.match(culturePattern, /primaryAction: '创建文化场所'/);
  assert.doesNotMatch(culturePattern, /primaryAction: '(新增|新建)/);
});
