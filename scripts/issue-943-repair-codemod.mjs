import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'frontend/genealogy-web/src');
const groups = ['persons', 'tree', 'sources', 'culture', 'workbench', 'reviews', 'members', 'logs'];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => {
    const file = path.join(dir, name);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}

function gitMain(relative) {
  return execFileSync('git', ['show', `origin/main:${relative}`], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

function ensureImport(source, file) {
  if (source.includes("StandardQueryActions'")) return source;
  const target = path.join(src, 'shared/ui/StandardQueryActions');
  let relative = path.relative(path.dirname(file), target).replaceAll('\\', '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  const statement = `import { StandardQueryActions } from '${relative}';\n`;
  const imports = [...source.matchAll(/^import[\s\S]*?;\n/gm)];
  const last = imports.at(-1);
  if (!last) return statement + source;
  const index = last.index + last[0].length;
  return source.slice(0, index) + statement + source.slice(index);
}

function mark(button, kind) {
  const withoutOld = button.replace(/\sdata-query-action="(?:more|reset|submit)"/, '');
  return withoutOld.replace(/<Button\b/, `<Button data-query-action="${kind}"`);
}

function transformPair(source, pair) {
  const body = source.slice(pair.openEnd, pair.closeStart);
  const buttons = body.match(/<Button\b[\s\S]*?<\/Button>/g) || [];
  const more = buttons.find(item => /更多筛选|收起筛选/.test(item));
  const reset = buttons.find(item => />\s*重置\s*</.test(item));
  const submit = buttons.find(item => />\s*(查询|搜索|检索)\s*</.test(item));
  if (!reset || !submit) return source;
  let remainder = body;
  for (const button of [more, reset, submit].filter(Boolean)) remainder = remainder.replace(button, '');
  if (remainder.replace(/\s+/g, '') !== '') return source;
  const attrs = source.slice(pair.openStart + '<Space'.length, pair.openEnd - 1);
  const ordered = [more ? mark(more, 'more') : '', mark(reset, 'reset'), mark(submit, 'submit')].filter(Boolean).join('\n');
  const replacement = `<StandardQueryActions${attrs}>\n${ordered}\n</StandardQueryActions>`;
  return source.slice(0, pair.openStart) + replacement + source.slice(pair.closeEnd);
}

function migrate(source) {
  const tokens = [...source.matchAll(/<Space\b[^>]*>|<\/Space>/g)];
  const stack = [];
  const pairs = [];
  for (const token of tokens) {
    if (token[0].startsWith('</')) {
      const open = stack.pop();
      if (open) pairs.push({ openStart: open.index, openEnd: open.index + open[0].length, closeStart: token.index, closeEnd: token.index + token[0].length });
    } else stack.push(token);
  }
  let next = source;
  for (const pair of pairs.sort((a, b) => b.openStart - a.openStart)) next = transformPair(next, pair);
  return next;
}

const migrated = [];
for (const group of groups) {
  const dir = path.join(src, 'features', group);
  const branchFiles = walk(dir).filter(file => file.endsWith('.tsx'));
  const candidates = branchFiles.filter(file => readFileSync(file, 'utf8').includes('StandardQueryActions'));
  for (const file of candidates) {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    writeFileSync(file, gitMain(relative));
  }
  let count = 0;
  for (const file of walk(dir).filter(file => file.endsWith('.tsx'))) {
    const original = readFileSync(file, 'utf8');
    let next = migrate(original);
    if (next !== original) {
      next = ensureImport(next, file);
      writeFileSync(file, next);
      migrated.push(path.relative(root, file));
      count += 1;
    }
  }
  if (!count) throw new Error(`No innermost query action group migrated for ${group}`);
}

rmSync(path.join(root, '.github/workflows/issue-943-repair-codemod.yml'), { force: true });
rmSync(path.join(root, 'scripts/issue-943-repair-codemod.mjs'), { force: true });
console.log(JSON.stringify({ migrated }, null, 2));
