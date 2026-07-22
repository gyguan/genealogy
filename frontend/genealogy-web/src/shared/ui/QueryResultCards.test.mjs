import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = [
  'features/persons/PersonArchiveSearchPage.tsx',
  'features/sources/SourceLibraryQueryPage.tsx',
  'features/logs/LogPage.tsx',
  'features/tree/LineageTreeProductPage.tsx',
  'features/imports/ImportPage.tsx',
  'features/workbench/EditingWorkspacePage.tsx',
  'features/culture/CultureItemStandardTab.tsx',
  'features/culture/MigrationEventStandardTab.tsx',
  'features/culture/CultureSiteStandardTab.tsx',
  'features/reviews/ReviewCenterPageContent.tsx',
  'features/members/MemberPage.tsx'
];

test('pages use one QueryResultCard without business-card configuration', () => {
  for (const relativePath of files) {
    const source = readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
    assert.equal((source.match(/<QueryResultCard/g) || []).length, 1, `${relativePath} should render one result container`);
    assert.match(source, /\stotal=\{/);
    assert.doesNotMatch(source, /businessTitle|businessExtra|businessClassName|BusinessResultCard/);
  }
});

test('QueryResultCard renders result children directly after its header', () => {
  const source = readFileSync(new URL('./QueryResultCards.tsx', import.meta.url), 'utf8');
  const component = source.slice(source.indexOf('export function QueryResultCard'));
  assert.match(component, /<section[\s\S]*data-query-result-role="outer"[\s\S]*>\s*<div className="query-result-outer-card__header">[\s\S]*<\/div>\s*\{children\}\s*<\/section>/);
  assert.doesNotMatch(component, /BusinessResultCard|business-result-card|<Card|ant-card-body|query-result-content/);
});

test('shared styles contain no third-layer result card or content wrapper', () => {
  const source = readFileSync(new URL('./query-result-cards.css', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /business-result-card|ant-card-body|query-result-content/);
});
