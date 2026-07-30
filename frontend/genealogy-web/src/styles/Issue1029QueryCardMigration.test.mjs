import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const audit = read('../features/logs/LogPage.tsx');
const auditCss = read('../features/logs/tracking-page.css');
const cultureProduct = read('../features/culture/CultureProductPage.tsx');
const cultureHeader = read('../features/culture/CultureSearchHeader.tsx');
const cultureTabs = [
  read('../features/culture/CultureItemStandardTab.tsx'),
  read('../features/culture/CultureSiteStandardTab.tsx'),
  read('../features/culture/MigrationEventStandardTab.tsx')
];
const imports = read('../features/imports/ImportPage.tsx');

function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

test('audit views use page-level tabs and the shared query contract', () => {
  assert.match(audit, /<StandardPageTabs[\s\S]*ariaLabel="审计追踪视图"/);
  assert.match(audit, /<StandardQueryPanel className="tracking-query-card">/);
  assert.equal(count(audit, /<StandardQueryGrid>/g), 3);
  assert.equal(count(audit, /<StandardAdvancedFilters/g), 3);
  assert.match(audit, /<StandardMoreFiltersButton[\s\S]*activeFilterCount=/);
  assert.doesNotMatch(audit, /DownOutlined|UpOutlined|tracking-more-button|tracking-query-grid|tracking-query-actions/);
  assert.doesNotMatch(audit, /<Card className="tracking-query-card"|<Tabs className="tracking-query-tabs"/);
});

test('audit feature css no longer owns query grid, arrows, or mobile actions', () => {
  assert.doesNotMatch(auditCss, /tracking-query-grid|tracking-query-actions|tracking-more-button|tracking-query-tabs/);
  assert.doesNotMatch(auditCss, /display:\s*none[\s\S]*anticon/);
});

test('culture keeps business tabs at page level and all real tabs share query actions', () => {
  assert.match(cultureProduct, /<StandardPageTabs/);
  assert.match(cultureHeader, /if \(!description\) return null/);
  assert.doesNotMatch(cultureHeader, /<Tabs|StandardPageTabs/);
  for (const source of cultureTabs) {
    assert.match(source, /<StandardQueryPanel/);
    assert.match(source, /<StandardQueryGrid>/);
    assert.match(source, /<StandardAdvancedFilters/);
    assert.match(source, /<StandardMoreFiltersButton[\s\S]*activeFilterCount=/);
    assert.match(source, /data-query-action="reset"/);
    assert.match(source, /data-query-action="submit"/);
  }
});

test('import query remains protected by the shared four-field contract', () => {
  const query = imports.slice(imports.indexOf('<StandardQueryPanel'), imports.indexOf('<QueryResultCard'));
  assert.match(query, /<StandardQueryPanel/);
  assert.match(query, /<StandardQueryGrid>/);
  assert.equal(count(query, /<StandardQueryField/g), 4);
  assert.match(query, /data-query-action="reset"/);
  assert.match(query, /data-query-action="submit"/);
  assert.doesNotMatch(query, /<Card|<Row|<Col|SearchOutlined/);
});
