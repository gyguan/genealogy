import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('src');
const groups = ['persons', 'tree', 'sources', 'culture', 'workbench', 'reviews', 'members', 'logs'];
function walk(dir) { return readdirSync(dir).flatMap(name => { const file = path.join(dir, name); return statSync(file).isDirectory() ? walk(file) : [file]; }); }

function innermostSpaceBlocks(source) {
  const tokens = [...source.matchAll(/<Space\b[^>]*>|<\/Space>/g)];
  const stack = [];
  const blocks = [];
  for (const token of tokens) {
    if (token[0].startsWith('</')) {
      const open = stack.pop();
      if (!open) continue;
      const body = source.slice(open.index + open[0].length, token.index);
      if (!/<Space\b/.test(body)) blocks.push(body);
    } else stack.push(token);
  }
  return blocks;
}

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

test('migrated pages do not retain hand-built innermost Space query action groups', () => {
  for (const group of groups) {
    for (const file of walk(path.join(root, 'features', group)).filter(file => file.endsWith('.tsx'))) {
      const source = readFileSync(file, 'utf8');
      for (const body of innermostSpaceBlocks(source)) {
        if (body.includes('<StandardQueryActions')) continue;
        assert.equal(/>\s*重置\s*</.test(body) && />\s*(查询|搜索|检索)\s*</.test(body), false, file + ' must not hand-build query actions');
      }
    }
  }
});
