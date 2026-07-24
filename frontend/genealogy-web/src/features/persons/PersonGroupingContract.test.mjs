import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const createSource = readFileSync(new URL('../mvp1/steps/person/PersonStep.tsx', import.meta.url), 'utf8');
const editSource = readFileSync(new URL('./PersonEditPage.tsx', import.meta.url), 'utf8');
const detailSource = readFileSync(new URL('./PersonDetailPage.tsx', import.meta.url), 'utf8');
const tabSource = readFileSync(new URL('./personArchiveUrlState.ts', import.meta.url), 'utf8');
const detailCss = readFileSync(new URL('../../person-detail-page.css', import.meta.url), 'utf8');
const sections = ['基本身份', '世系归属', '生卒与地域', '生平概况', '生平事迹', '墓志资料', '治理信息'];
test('create page uses unified grouping and exposes missing fields', () => { sections.forEach(section => assert.match(createSource, new RegExp(`title=\\"${section}\\"`))); ['birthDatePrecision', 'deathDatePrecision', 'tombPlace', 'hasDescendant'].forEach(field => assert.match(createSource, new RegExp(`personForm\\.${field}`))); assert.doesNotMatch(createSource, /title="传记与隐私"|title="生卒与居住"|title="世系信息"/); });
test('edit page uses unified grouping', () => { sections.forEach(section => assert.match(editSource, new RegExp(`title=\\"${section}\\"`))); assert.match(editSource, /name="birthDatePrecision" label="出生日期精度"/); assert.match(editSource, /name="deathDatePrecision" label="逝世日期精度"/); assert.doesNotMatch(editSource, /title="生平与墓志"|title="治理与展示"|title="生卒与地点"/); });
test('detail page aligns cards and supports the epitaph tab', () => { ['基本身份', '世系归属', '生卒与地域', '生平概况', '治理信息'].forEach(section => assert.match(detailSource, new RegExp(`title=\\"${section}\\"`))); assert.match(detailSource, /key: 'events', label: '生平事迹'/); assert.match(detailSource, /key: 'epitaph', label: '墓志资料'/); assert.match(tabSource, /'epitaph'/); assert.doesNotMatch(detailSource, /title="身份与世系"|title="生活与治理"/); });
test('person detail page uses the full AppShell content width', () => {
  assert.match(detailCss, /\.person-detail-page\s*\{[\s\S]*?width:\s*100%/);
  assert.match(detailCss, /\.business-page--personArchive:has\(\.person-detail-page\)/);
  assert.match(detailCss, /max-width:\s*none/);
  assert.match(detailCss, /margin-inline:\s*0/);
  assert.doesNotMatch(detailCss, /width:\s*min\(100%,\s*1440px\)/);
});
