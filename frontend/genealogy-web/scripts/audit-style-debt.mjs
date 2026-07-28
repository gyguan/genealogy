import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const REPO_ROOT = path.resolve(PROJECT_ROOT, '../..');
const SOURCE_PREFIX = 'frontend/genealogy-web/src/';
const CONFIG_PATH = path.join(PROJECT_ROOT, 'style-debt-baseline.json');
const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const baseRef = arg('base', process.env.STYLE_AUDIT_BASE_SHA || config.referenceCommit);
const headRef = arg('head', process.env.STYLE_AUDIT_HEAD_SHA || 'WORKTREE');
const jsonPath = arg('json', 'style-debt-audit.json');
const markdownPath = arg('markdown', 'style-debt-audit.md');
const check = !process.argv.includes('--report-only');

const SYSTEM_COLORS = new Set(config.systemColors.map(value => value.toLowerCase()));
const excludedFiles = new Set(config.excludedFiles || []);

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function listWorktreeCss() {
  const root = path.join(PROJECT_ROOT, 'src');
  const files = [];
  function walk(directory) {
    for (const entry of readdirSync(directory)) {
      const absolute = path.join(directory, entry);
      const stat = statSync(absolute);
      if (stat.isDirectory()) walk(absolute);
      else if (entry.endsWith('.css')) files.push(path.relative(PROJECT_ROOT, absolute).replaceAll('\\', '/'));
    }
  }
  walk(root);
  return files.sort();
}

function listRefCss(ref) {
  const output = git(['ls-tree', '-r', '--name-only', ref, '--', SOURCE_PREFIX]);
  return output.split(/\r?\n/).filter(file => file.endsWith('.css')).map(file => file.slice('frontend/genealogy-web/'.length)).sort();
}

function readCss(ref, relative) {
  if (ref === 'WORKTREE') return readFileSync(path.join(PROJECT_ROOT, relative), 'utf8');
  return git(['show', `${ref}:frontend/genealogy-web/${relative}`]);
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function normalize(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseRules(source) {
  const clean = stripComments(source);
  const rules = [];
  const stack = [];
  let cursor = 0;
  let pending = '';
  while (cursor < clean.length) {
    const open = clean.indexOf('{', cursor);
    if (open < 0) break;
    const header = normalize(clean.slice(cursor, open));
    let depth = 1;
    let close = open + 1;
    while (close < clean.length && depth > 0) {
      if (clean[close] === '{') depth += 1;
      else if (clean[close] === '}') depth -= 1;
      close += 1;
    }
    if (depth !== 0) break;
    const body = clean.slice(open + 1, close - 1);
    if (header.startsWith('@media') || header.startsWith('@supports') || header.startsWith('@container')) {
      stack.push(header);
      const nested = parseRules(body);
      for (const rule of nested) rules.push({ ...rule, context: [...stack, ...(rule.context || [])] });
      stack.pop();
    } else if (!header.startsWith('@')) {
      const declarations = body.split(';').map(normalize).filter(value => value.includes(':') && !value.includes('{'));
      if (declarations.length) rules.push({ selector: header || pending, declarations, context: [] });
    }
    cursor = close;
    pending = '';
  }
  return rules;
}

function declarationParts(declaration) {
  const index = declaration.indexOf(':');
  return { property: normalize(declaration.slice(0, index)), value: normalize(declaration.slice(index + 1)) };
}

function entry(file, rule, property, value = '') {
  const context = (rule.context || []).map(normalize).join(' > ');
  return [file, context, normalize(rule.selector), property, value].join('|');
}

function isUnscopedAnt(selector) {
  return selector.split(',').some(part => /^\s*(?:html\s+|body\s+|#root\s+)?\.ant-[\w-]+/.test(part));
}

function hasNativeControlSelector(selector) {
  if (/\.ant-[\w-]+/.test(selector)) return false;
  return /(^|[\s>+~,:])(?:button|input|select|textarea|table)(?=$|[\s>+~.:#[\]])/i.test(selector);
}

function isLegacySelector(selector) {
  return /\.(?:legacy|prototype|proto|xp)-[\w-]+/.test(selector) || /\.(?:modal-mask|modal-panel|toast-stack|toast__close|data-table)\b/.test(selector);
}

function importedGlobalFiles(ref) {
  let source;
  if (ref === 'WORKTREE') source = readFileSync(path.join(PROJECT_ROOT, 'src/styles/index.css'), 'utf8');
  else source = git(['show', `${ref}:frontend/genealogy-web/src/styles/index.css`]);
  return [...source.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map(match => {
    const absolute = path.posix.normalize(path.posix.join('src/styles', match[1]));
    return absolute.replace(/^src\/styles\/\.\.\//, 'src/');
  });
}

function isGlobalBusinessSelector(selector) {
  return selector.split(',').some(part => {
    const value = normalize(part);
    if (/^(?::root|html|body|#root|\*|button|input|select|textarea)$/.test(value)) return false;
    if (/^\.ant-[\w-]+/.test(value)) return false;
    return /^\.[a-z][\w-]*(?:\s|$|[.:#>+~[])/.test(value);
  });
}

function scan(ref) {
  const files = (ref === 'WORKTREE' ? listWorktreeCss() : listRefCss(ref)).filter(file => !excludedFiles.has(file));
  const globalFiles = new Set(importedGlobalFiles(ref));
  const result = {
    ref,
    generatedAt: new Date().toISOString(),
    categories: { important: [], fixedSystemColors: [], nativeControls: [], unscopedAnt: [], globalBusiness: [], legacyPrototype: [] },
    files: {},
    totals: { cssFiles: 0, cssLines: 0, cssBytes: 0, globalBundleBytes: 0 }
  };
  for (const file of files) {
    const source = readCss(ref, file);
    const lines = source.split(/\r?\n/).length;
    const bytes = Buffer.byteLength(source);
    result.files[file] = { lines, bytes };
    result.totals.cssFiles += 1;
    result.totals.cssLines += lines;
    result.totals.cssBytes += bytes;
    if (globalFiles.has(file)) result.totals.globalBundleBytes += bytes;
    for (const rule of parseRules(source)) {
      if (isUnscopedAnt(rule.selector)) result.categories.unscopedAnt.push(entry(file, rule, 'selector'));
      if (hasNativeControlSelector(rule.selector)) result.categories.nativeControls.push(entry(file, rule, 'selector'));
      if (isLegacySelector(rule.selector)) result.categories.legacyPrototype.push(entry(file, rule, 'selector'));
      if (globalFiles.has(file) && isGlobalBusinessSelector(rule.selector)) result.categories.globalBusiness.push(entry(file, rule, 'selector'));
      for (const declaration of rule.declarations) {
        const { property, value } = declarationParts(declaration);
        if (/!important\b/.test(value)) result.categories.important.push(entry(file, rule, property, '!important'));
        for (const match of value.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)) {
          const color = normalize(match[0]).toLowerCase();
          if (SYSTEM_COLORS.has(color)) result.categories.fixedSystemColors.push(entry(file, rule, property, color));
        }
      }
    }
  }
  for (const values of Object.values(result.categories)) values.sort();
  return result;
}

function loadExceptions() {
  const exceptionsPath = path.join(PROJECT_ROOT, config.exceptionsFile);
  const data = JSON.parse(readFileSync(exceptionsPath, 'utf8'));
  const required = ['id', 'category', 'entries', 'owner', 'reason', 'trackingIssue', 'reviewedAt', 'exitCondition'];
  for (const item of data.exceptions) {
    for (const field of required) if (item[field] === undefined || item[field] === '') throw new Error(`style exception ${item.id || '<unknown>'} missing ${field}`);
    if (!Number.isInteger(item.trackingIssue)) throw new Error(`style exception ${item.id} trackingIssue must be an integer`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.reviewedAt)) throw new Error(`style exception ${item.id} reviewedAt must be YYYY-MM-DD`);
  }
  return data;
}

function exceptionEntries(exceptions, category) {
  return new Set(exceptions.exceptions.filter(item => item.category === category).flatMap(item => item.entries));
}

function compare(base, head, exceptions) {
  const comparisons = {};
  let failed = false;
  for (const category of Object.keys(head.categories)) {
    const before = new Set(base.categories[category]);
    const allowed = exceptionEntries(exceptions, category);
    const added = head.categories[category].filter(value => !before.has(value) && !allowed.has(value));
    const removed = base.categories[category].filter(value => !new Set(head.categories[category]).has(value));
    comparisons[category] = { before: before.size, after: head.categories[category].length, added, removed };
    if (added.length) failed = true;
  }
  const globalBundleDelta = head.totals.globalBundleBytes - base.totals.globalBundleBytes;
  if (globalBundleDelta > 0) failed = true;
  return { failed, globalBundleDelta, categories: comparisons };
}

function markdown(report) {
  const lines = ['# Style Debt Audit', '', `- Base: \`${report.base.ref}\``, `- Head: \`${report.head.ref}\``, `- Result: **${report.comparison.failed ? 'FAILED' : 'PASSED'}**`, '', '| Metric | Base | Head | Delta |', '| --- | ---: | ---: | ---: |'];
  for (const [name, value] of Object.entries(report.comparison.categories)) lines.push(`| ${name} | ${value.before} | ${value.after} | ${value.after - value.before} |`);
  lines.push(`| globalBundleBytes | ${report.base.totals.globalBundleBytes} | ${report.head.totals.globalBundleBytes} | ${report.comparison.globalBundleDelta} |`, '');
  for (const [name, value] of Object.entries(report.comparison.categories)) {
    if (!value.added.length && !value.removed.length) continue;
    lines.push(`## ${name}`, '', `Added: ${value.added.length}; Removed: ${value.removed.length}.`, '');
    if (value.added.length) lines.push('### Added (blocking)', ...value.added.map(item => `- \`${item}\``), '');
    if (value.removed.length) lines.push('### Removed', ...value.removed.map(item => `- \`${item}\``), '');
  }
  return `${lines.join('\n')}\n`;
}

const exceptions = loadExceptions();
const base = scan(baseRef);
const head = scan(headRef);
const comparison = compare(base, head, exceptions);
const report = { schemaVersion: 1, policy: config.policy, base, head, comparison, exceptions };
writeFileSync(path.join(PROJECT_ROOT, jsonPath), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(PROJECT_ROOT, markdownPath), markdown(report));
console.log(markdown(report));
if (check && comparison.failed) process.exitCode = 1;
