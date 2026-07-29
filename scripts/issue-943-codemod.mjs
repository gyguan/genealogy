import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const web = path.join(root, 'frontend/genealogy-web');
const src = path.join(web, 'src');
const featureGroups = ['persons', 'tree', 'sources', 'culture', 'workbench', 'reviews', 'members', 'logs'];
const changed = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => {
    const file = path.join(dir, name);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}

function ensureImport(source, file) {
  if (source.includes("StandardQueryActions'")) return source;
  const target = path.join(src, 'shared/ui/StandardQueryActions');
  let relative = path.relative(path.dirname(file), target).replaceAll('\\', '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  const statement = `import { StandardQueryActions } from '${relative}';\n`;
  const imports = [...source.matchAll(/^import[\s\S]*?;\n/gm)];
  if (!imports.length) return statement + source;
  const last = imports.at(-1);
  const index = last.index + last[0].length;
  return source.slice(0, index) + statement + source.slice(index);
}

function mark(button, kind) {
  if (/data-query-action=/.test(button)) return button;
  return button.replace(/<Button\b/, `<Button data-query-action=\"${kind}\"`);
}

function migrateBlock(match, attrs, body) {
  const buttons = body.match(/<Button\b[\s\S]*?<\/Button>/g) || [];
  const more = buttons.find(item => /更多筛选|收起筛选/.test(item));
  const reset = buttons.find(item => />\s*重置\s*</.test(item));
  const submit = buttons.find(item => />\s*(查询|搜索|检索)\s*</.test(item));
  if (!reset || !submit) return match;
  let nextBody = body;
  for (const item of [more, reset, submit].filter(Boolean)) nextBody = nextBody.replace(item, '');
  const ordered = [more ? mark(more, 'more') : '', mark(reset, 'reset'), mark(submit, 'submit')].filter(Boolean).join('\n');
  nextBody = `${nextBody.trim()}${nextBody.trim() ? '\n' : ''}${ordered}`;
  return `<StandardQueryActions${attrs}>\n${nextBody}\n</StandardQueryActions>`;
}

for (const group of featureGroups) {
  const files = walk(path.join(src, 'features', group)).filter(file => file.endsWith('.tsx'));
  let groupCount = 0;
  for (const file of files) {
    let source = readFileSync(file, 'utf8');
    const before = source;
    source = source.replace(/<Space([^>]*)>([\s\S]*?)<\/Space>/g, (match, attrs, body) => {
      if (!/>\s*重置\s*</.test(body) || !/>\s*(查询|搜索|检索)\s*</.test(body)) return match;
      groupCount += 1;
      return migrateBlock(match, attrs, body);
    });
    if (source !== before) {
      source = ensureImport(source, file);
      writeFileSync(file, source);
      changed.push(path.relative(root, file));
    }
  }
  if (!groupCount) throw new Error(`No query action block migrated for feature group: ${group}`);
}

const componentPath = path.join(src, 'shared/ui/StandardQueryActions.tsx');
writeFileSync(componentPath, `import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Space } from 'antd';
import type { SpaceProps } from 'antd';

export type StandardQueryActionKind = 'more' | 'reset' | 'submit';
export type StandardQueryActionsProps = Omit<SpaceProps, 'children'> & { children: ReactNode };

type ActionElement = ReactElement<{ 'data-query-action'?: StandardQueryActionKind; loading?: boolean; disabled?: boolean }>;

export function StandardQueryActions({ children, className = '', ...props }: StandardQueryActionsProps) {
  const items = Children.toArray(children);
  const action = (kind: StandardQueryActionKind) => items.find(item => isValidElement(item) && (item as ActionElement).props['data-query-action'] === kind) as ActionElement | undefined;
  const submit = action('submit');
  const busy = Boolean(submit?.props.loading);
  const ordered = (['more', 'reset', 'submit'] as const).flatMap(kind => {
    const item = action(kind);
    if (!item) return [];
    if (kind === 'submit') return [item];
    return [cloneElement(item, { disabled: busy || item.props.disabled })];
  });
  return <Space {...props} className={['standard-query-actions', className].filter(Boolean).join(' ')} aria-busy={busy}>{ordered}</Space>;
}
`);
changed.push(path.relative(root, componentPath));

const testPath = path.join(src, 'styles/StandardQueryActionsGovernance.test.mjs');
writeFileSync(testPath, `import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('src');
const groups = ['persons', 'tree', 'sources', 'culture', 'workbench', 'reviews', 'members', 'logs'];
function walk(dir) { return readdirSync(dir).flatMap(name => { const file = path.join(dir, name); return statSync(file).isDirectory() ? walk(file) : [file]; }); }

test('Issue #943 exposes the standard query action contract', () => {
  const source = readFileSync(path.join(root, 'shared/ui/StandardQueryActions.tsx'), 'utf8');
  assert.match(source, /export function StandardQueryActions/);
  assert.match(source, /\['more', 'reset', 'submit'\]/);
  assert.match(source, /aria-busy=\{busy\}/);
});

test('eight query feature groups use StandardQueryActions and canonical action order', () => {
  for (const group of groups) {
    const sources = walk(path.join(root, 'features', group)).filter(file => file.endsWith('.tsx')).map(file => readFileSync(file, 'utf8'));
    const migrated = sources.filter(source => source.includes('<StandardQueryActions'));
    assert.ok(migrated.length > 0, group + ' must use StandardQueryActions');
    for (const source of migrated) {
      for (const block of source.matchAll(/<StandardQueryActions[\s\S]*?<\/StandardQueryActions>/g)) {
        const text = block[0];
        const more = text.indexOf('data-query-action="more"');
        const reset = text.indexOf('data-query-action="reset"');
        const submit = text.indexOf('data-query-action="submit"');
        assert.ok(reset >= 0 && submit > reset, group + ' reset must precede submit');
        if (more >= 0) assert.ok(more < reset, group + ' more must precede reset');
      }
    }
  }
});

test('migrated pages do not retain hand-built Space query action groups', () => {
  for (const group of groups) {
    for (const file of walk(path.join(root, 'features', group)).filter(file => file.endsWith('.tsx'))) {
      const source = readFileSync(file, 'utf8');
      for (const block of source.matchAll(/<Space[\s\S]*?<\/Space>/g)) {
        assert.equal(/>\s*重置\s*</.test(block[0]) && />\s*(查询|搜索|检索)\s*</.test(block[0]), false, file + ' must not hand-build query actions');
      }
    }
  }
});
`);
changed.push(path.relative(root, testPath));

const docPath = path.join(root, 'docs/frontend/issue-943-standard-query-actions.md');
mkdirSync(path.dirname(docPath), { recursive: true });
writeFileSync(docPath, `# Issue #943 — Standard Query Actions\n\nEight query feature groups use one declarative action contract. The canonical order is more filters, reset, submit. The submit action remains the final form submit control; while it is loading, more/reset are disabled to prevent conflicting state changes. Existing field definitions, query services, pagination, sorting, permissions and URL serializers remain feature-owned.\n\nMigrated groups: persons, tree, sources, culture, workbench, reviews, members and logs.\n\nGovernance: StandardQueryActionsGovernance.test.mjs blocks hand-built query action groups and verifies canonical source order. Existing real-browser suites cover submit, reset, URL refresh and history navigation.\n`);
changed.push(path.relative(root, docPath));

const packagePath = path.join(web, 'package.json');
let pkg = readFileSync(packagePath, 'utf8');
pkg = pkg.replace('src/styles/StandardPagePatternGovernance.test.mjs"', 'src/styles/StandardPagePatternGovernance.test.mjs src/styles/StandardQueryActionsGovernance.test.mjs"');
writeFileSync(packagePath, pkg);
changed.push(path.relative(root, packagePath));

rmSync(path.join(root, '.github/workflows/issue-943-codemod.yml'), { force: true });
rmSync(path.join(root, 'scripts/issue-943-codemod.mjs'), { force: true });
console.log(JSON.stringify({ changed }, null, 2));
