import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = [
  ['features/persons/PersonArchiveSearchPage.tsx', '人物档案'],
  ['features/sources/SourceLibraryQueryPage.tsx', '来源资料'],
  ['features/logs/LogPage.tsx', '业务对象'],
  ['features/tree/LineageTreeProductPage.tsx', '世系图谱'],
  ['features/imports/ImportPage.tsx', '导入任务'],
  ['features/workbench/EditingWorkspacePage.tsx', '修谱任务'],
  ['features/culture/CultureItemStandardTab.tsx', '文化资料'],
  ['features/culture/MigrationEventStandardTab.tsx', '迁徙脉络'],
  ['features/culture/CultureSiteStandardTab.tsx', '文化场所'],
  ['features/reviews/ReviewCenterPageContent.tsx', '审核任务'],
  ['features/members/MemberPage.tsx', '成员列表']
];

function openingTag(source, token, start = 0) {
  const index = source.indexOf(token, start);
  assert.ok(index >= 0, `${token} should exist`);
  let depth = 0;
  let quote = '';
  for (let cursor = index; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (quote) {
      if (char === quote && source[cursor - 1] !== '\') quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    else if (char === '>' && depth === 0) return { index, end: cursor + 1, text: source.slice(index, cursor + 1) };
  }
  assert.fail(`${token} opening tag should close`);
}

test('all query pages put total on QueryResultCard and keep BusinessResultCard inside it', () => {
  for (const [relativePath, businessTitle] of files) {
    const source = readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
    const outer = openingTag(source, '<QueryResultCard');
    const inner = openingTag(source, '<BusinessResultCard', outer.end);
    const innerClose = source.indexOf('</BusinessResultCard>', inner.end);
    const outerClose = source.indexOf('</QueryResultCard>', innerClose);

    assert.match(outer.text, /\stotal=\{/, `${relativePath} should put total on the outer card`);
    assert.doesNotMatch(inner.text, /\stotal=/, `${relativePath} should not repeat total on the business card`);
    assert.ok(source.includes(businessTitle), `${relativePath} should expose business title ${businessTitle}`);
    assert.ok(inner.index > outer.end, `${relativePath} should nest the business card inside the outer card`);
    assert.ok(innerClose > inner.end, `${relativePath} should close the business card`);
    assert.ok(outerClose > innerClose, `${relativePath} should close the outer card after the business card`);
  }
});

test('shared components render total beside 查询结果 and business title without a duplicate count', () => {
  const source = readFileSync(new URL('./QueryResultCards.tsx', import.meta.url), 'utf8');
  assert.match(source, /<Typography\.Text strong>查询结果<\/Typography\.Text>/);
  assert.match(source, /（共 \{total\} \{totalSuffix\}）/);
  const businessFunction = source.slice(source.indexOf('export function BusinessResultCard'));
  assert.doesNotMatch(businessFunction, /共 \{total\}/);
});

test('shared styles retain true nested cards and align the outer title count', () => {
  const source = readFileSync(new URL('./query-result-cards.css', import.meta.url), 'utf8');
  assert.match(source, /\.query-result-outer-card\s*>\s*\.ant-card-body\s*>\s*\.business-result-card/);
  assert.match(source, /\.query-result-card__title\s*\{[\s\S]*align-items:\s*baseline/);
});
