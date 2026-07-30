import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const feedback = readFileSync(new URL('./Feedback.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../feedback-system.css', import.meta.url), 'utf8');
const registry = readFileSync(new URL('../../app/moduleRegistry.tsx', import.meta.url), 'utf8');
const reviewEntry = readFileSync(new URL('../../features/reviews/ReviewCenterPage.tsx', import.meta.url), 'utf8');
const reviewContent = readFileSync(new URL('../../features/reviews/ReviewCenterPageContent.tsx', import.meta.url), 'utf8');
const personArchive = readFileSync(new URL('../../features/persons/PersonArchiveSearchPage.tsx', import.meta.url), 'utf8');
const asyncImport = readFileSync(new URL('../../features/imports/AsyncImportExecutionPanel.tsx', import.meta.url), 'utf8');

test('page state contract exposes the six governed state kinds', () => {
  for (const kind of ['prerequisite', 'first-empty', 'no-results', 'forbidden', 'loading', 'error']) {
    assert.match(feedback, new RegExp(`['"]${kind}['"]`), `${kind} must be part of the shared state contract`);
  }
  assert.match(feedback, /export function PageState/);
  assert.match(feedback, /export function RetainedDataFeedback/);
});

test('state kinds map to the approved feedback primitives', () => {
  assert.match(feedback, /kind === 'loading'[\s\S]*<Spin/);
  assert.match(feedback, /kind === 'first-empty' \|\| kind === 'no-results'[\s\S]*<EmptyState/);
  assert.match(feedback, /kind === 'forbidden' \? '403'/);
  assert.match(feedback, /kind === 'error' \? 'error'/);
  assert.match(feedback, /<FullPageFeedback/);
  assert.match(feedback, /刷新失败，当前展示的是上次成功数据/);
});

test('clan-scoped formal modules block before rendering invalid query areas', () => {
  for (const moduleKey of ['personArchive', 'treeProduct', 'sourceLibrary', 'culture', 'imports', 'editingWorkspace', 'reviewCenter', 'memberManage', 'auditTrace']) {
    assert.match(registry, new RegExp(`['"]${moduleKey}['"]`), `${moduleKey} must require clan context`);
  }
  assert.match(registry, /const missingClan = clanRequiredModules\.has\(pageKey\) && !workspace\.clanId/);
  assert.match(registry, /missingClan \? \([\s\S]*<PageState[\s\S]*kind="prerequisite"/);
  assert.match(registry, /\) : content/);
  assert.match(registry, /extra=\{missingClan \? undefined : extra\}/);
});

test('first loading and refresh failure remain distinct from empty data', () => {
  assert.match(reviewEntry, /<PageState kind="loading"/);
  assert.match(reviewContent, /const hadSuccessfulData = hasLoaded/);
  assert.match(reviewContent, /setStaleFailure\(message\)/);
  assert.match(reviewContent, /刷新失败，当前展示的是上次成功数据/);
  assert.match(personArchive, /const \[refreshError, setRefreshError\]/);
  assert.match(personArchive, /refreshError/);
});

test('import tasks map all six states and preserve data only inside the successful scope', () => {
  assert.match(asyncImport, /const successfulScopeRef = useRef\(''\)/);
  assert.match(asyncImport, /const scopeKey = `\$\{clanId\}:\$\{branchId\}`/);
  assert.match(asyncImport, /const hasLoadedCurrentScope = hasLoaded && successfulScopeRef\.current === scopeKey/);
  assert.match(asyncImport, /const scopedRecords = successfulScopeRef\.current === scopeKey \? records : EMPTY_JOBS/);
  assert.match(asyncImport, /const hadSuccessfulData = hasLoaded && successfulScopeRef\.current === requestScope/);
  assert.match(asyncImport, /successfulScopeRef\.current = requestScope/);
  assert.match(asyncImport, /<RetainedDataFeedback/);
  assert.match(asyncImport, /kind="prerequisite"/);
  assert.match(asyncImport, /kind="forbidden"/);
  assert.match(asyncImport, /kind="loading"/);
  assert.match(asyncImport, /kind="error"/);
  assert.match(asyncImport, /kind="first-empty"/);
  assert.match(asyncImport, /kind="no-results"/);
  assert.match(asyncImport, /if \(error instanceof ApiRequestError && error\.status === 403\)/);
  assert.match(asyncImport, /else if \(hadSuccessfulData\) \{[\s\S]*setRefreshError\(safeMessage\)/);
  assert.match(asyncImport, /\{refreshError \? <RetainedDataFeedback[\s\S]*\{emptyState \|\| \(/);
  assert.match(asyncImport, /const activeSelectedJob = successfulScopeRef\.current === scopeKey \? selectedJob : undefined/);
});

test('page state layout is stable for blocking, empty and loading states', () => {
  assert.match(css, /\.ui-page-state--loading/);
  assert.match(css, /min-height:\s*240px/);
  assert.match(css, /\.ui-page-state--first-empty \.ui-empty-state/);
  assert.match(css, /\.ui-page-state--no-results \.ui-empty-state/);
});
