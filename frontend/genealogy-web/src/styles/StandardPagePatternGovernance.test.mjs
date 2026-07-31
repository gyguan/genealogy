import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const patterns = readFileSync(new URL('../shared/ui/StandardPagePatterns.tsx', import.meta.url), 'utf8');
const registry = readFileSync(new URL('../app/moduleRegistry.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/App.tsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../app/AuthenticatedShell.tsx', import.meta.url), 'utf8');
const entityHeader = readFileSync(new URL('../shared/ui/EntityPageHeader.tsx', import.meta.url), 'utf8');
const resultCard = readFileSync(new URL('../shared/ui/QueryResultCards.tsx', import.meta.url), 'utf8');
const memberPage = readFileSync(new URL('../features/members/MemberManagementPage.tsx', import.meta.url), 'utf8');
const bookletActions = readFileSync(new URL('../features/booklets/BookletActions.tsx', import.meta.url), 'utf8');
const cultureHeader = readFileSync(new URL('../features/culture/CultureSearchHeader.tsx', import.meta.url), 'utf8');
const cultureItem = readFileSync(new URL('../features/culture/CultureItemStandardTab.tsx', import.meta.url), 'utf8');
const migrationEvent = readFileSync(new URL('../features/culture/MigrationEventStandardTab.tsx', import.meta.url), 'utf8');
const cultureSite = readFileSync(new URL('../features/culture/CultureSiteStandardTab.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./shared/standard-page-patterns.css', import.meta.url), 'utf8');
const entityStyles = readFileSync(new URL('../entity-page-header.css', import.meta.url), 'utf8');

const requiredComponents = [
  'StandardPage',
  'StandardPageHeader',
  'StandardPageActions',
  'StandardQueryPanel',
  'StandardResultSection',
  'StandardTable',
  'StandardDetailDrawer',
  'StandardEditorPage',
  'StandardPageState'
];

const formalModules = [
  'home',
  'mvp1Wizard',
  'personArchive',
  'treeProduct',
  'sourceLibrary',
  'imports',
  'editingWorkspace',
  'reviewCenter',
  'memberManage',
  'auditTrace',
  'culture'
];

test('standard page patterns expose the complete typed page-header API', () => {
  for (const component of requiredComponents) {
    assert.match(patterns, new RegExp(`export function ${component}\\b`), `${component} must remain exported`);
    assert.match(patterns, new RegExp(`export type ${component}Props\\b`), `${component} must retain an explicit props contract`);
  }
  for (const prop of ['scope', 'back', 'extra']) {
    assert.match(patterns, new RegExp(`${prop}\\?: ReactNode`), `StandardPageHeader must retain ${prop}`);
  }
  assert.match(patterns, /StandardPageActionTarget/);
  assert.match(patterns, /createPortal\(children, target\)/);
});

test('all authenticated module pages use the standard page shell', () => {
  assert.match(registry, /import \{ StandardPage \} from '\.\.\/shared\/ui\/StandardPagePatterns';/);
  for (const key of formalModules) {
    assert.match(registry, new RegExp(`standardModulePage\\('${key}'`), `${key} must use StandardPage`);
  }
  assert.match(registry, /scope=\{<ModuleScope \/>\}/);
  assert.doesNotMatch(registry, /renderHeaderActions/);
});

test('special entity routes adapt to the same page header while auth remains an explicit exception', () => {
  assert.match(entityHeader, /import \{ StandardPageHeader \}/);
  assert.match(entityHeader, /<StandardPageHeader/);
  assert.match(entityHeader, /back=\{<EntityPageBackButton/);
  assert.match(app, /<PersonEditPage/);
  assert.match(app, /<PersonDetailPage/);
  assert.match(app, /standalone \/>/);
  assert.doesNotMatch(app, /headerActions=/);
  assert.doesNotMatch(shell, /headerActions/);
  assert.doesNotMatch(entityStyles, /\.entity-page-header\s*\{[^}]*display:\s*grid/s);
  assert.doesNotMatch(entityStyles, /entity-page-header__main|entity-page-header__copy|entity-page-header__actions/);
});

test('page-level primary actions remain visible in the result card header without DOM patches', () => {
  assert.match(resultCard, /splitFirstPrimaryAction/);
  assert.match(resultCard, /element\.props\.type === 'primary'/);
  assert.match(resultCard, /element\.props\.menu \|\| element\.props\.overlay/);
  assert.match(resultCard, /query-result-outer-card__primary/);
  assert.match(resultCard, /data-result-toolbar-group="primary"/);
  assert.doesNotMatch(resultCard, /<StandardPageActions>/);
  assert.match(memberPage, /<StandardPageActions><MemberInvitationAction/);
  assert.doesNotMatch(bookletActions, /createPortal|querySelector|MutationObserver/);
  assert.doesNotMatch(patterns, /appendChild|insertBefore|querySelector|MutationObserver/);
});

test('culture tabs use the unified query-condition heading without duplicating the module title', () => {
  assert.match(patterns, /title = '查询条件'/);
  for (const source of [cultureItem, migrationEvent, cultureSite]) {
    assert.match(source, /<StandardQueryPanel/);
    assert.doesNotMatch(source, /title="(文化资料|迁徙事件|宗族场所)查询"/);
    assert.doesNotMatch(source, /className="culture-page-header culture-search-card" title="宗族文化"/);
  }
  assert.doesNotMatch(cultureHeader, /<Title|culture-page-title|宗族文化/);
});

test('standard page CSS remains token-driven, responsive and does not target Ant internals', () => {
  assert.doesNotMatch(styles, /!important\b/);
  assert.doesNotMatch(styles, /(^|[,{]\s*)\.ant-[\w-]+/m);
  assert.doesNotMatch(styles, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(styles, /style=\{\{/);
  assert.match(styles, /var\(--ant-/);
  assert.match(styles, /standard-page-header__actions/);
  assert.match(styles, /@media \(max-width: 767px\)/);
  assert.match(styles, /standard-page-header__actions \.ant-btn\s*\{[^}]*min-height:\s*40px/s);
});
