import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const REPO_ROOT = path.resolve(PROJECT_ROOT, '../..');
const SOURCE_PREFIX = 'frontend/genealogy-web/src/';
const baseline = JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'style-debt-baseline.json'), 'utf8'));
const governance = JSON.parse(readFileSync(path.join(PROJECT_ROOT, baseline.exceptionsFile), 'utf8'));

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const baseRef = arg('base', process.env.STYLE_AUDIT_BASE_SHA || baseline.referenceCommit);
const headRef = arg('head', process.env.STYLE_AUDIT_HEAD_SHA || 'WORKTREE');
const jsonPath = arg('json', 'style-debt-audit.json');
const markdownPath = arg('markdown', 'style-debt-audit.md');
const check = !process.argv.includes('--report-only');
const SYSTEM_COLORS = new Set(baseline.systemColors.map(value => value.toLowerCase()));
const excludedFiles = new Set(baseline.excludedFiles || []);

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function listWorktreeCss() {
  const files = [];
  function walk(directory) {
    for (const entry of readdirSync(directory)) {
      const absolute = path.join(directory, entry);
      const stat = statSync(absolute);
      if (stat.isDirectory()) walk(absolute);
      else if (entry.endsWith('.css')) files.push(path.relative(PROJECT_ROOT, absolute).replaceAll('\\', '/'));
    }
  }
  walk(path.join(PROJECT_ROOT, 'src'));
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
  let cursor = 0;
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
    if (/^@(media|supports|container|layer)\b/.test(header)) {
      for (const rule of parseRules(body)) rules.push({ ...rule, context: [header, ...(rule.context || [])] });
    } else if (!header.startsWith('@')) {
      const declarations = body.split(';').map(normalize).filter(value => value.includes(':') && !value.includes('{'));
      if (declarations.length) rules.push({ selector: header, declarations, context: [] });
    }
    cursor = close;
  }
  return rules;
}

function declarationParts(declaration) {
  const index = declaration.indexOf(':');
  return { property: normalize(declaration.slice(0, index)), value: normalize(declaration.slice(index + 1)) };
}

function entry(file, rule, property, value = '') {
  return [file, (rule.context || []).map(normalize).join(' > '), normalize(rule.selector), property, value].join('|');
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
  const source = ref === 'WORKTREE'
    ? readFileSync(path.join(PROJECT_ROOT, 'src/styles/index.css'), 'utf8')
    : git(['show', `${ref}:frontend/genealogy-web/src/styles/index.css`]);
  return [...source.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map(match => path.posix.normalize(path.posix.join('src/styles', match[1])).replace(/^src\/styles\/\.\.\//, 'src/'));
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
    totals: { cssFiles: 0, cssLines: 0, cssBytes: 0, globalBundleBytes: 0 }
  };
  for (const file of files) {
    const source = readCss(ref, file);
    result.totals.cssFiles += 1;
    result.totals.cssLines += source.split(/\r?\n/).length;
    result.totals.cssBytes += Buffer.byteLength(source);
    if (globalFiles.has(file)) result.totals.globalBundleBytes += Buffer.byteLength(source);
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

function allEntries(scanResult) {
  return Object.entries(scanResult.categories).flatMap(([category, values]) => values.map(value => ({ category, value })));
}

function businessRuleFor(item) {
  const [file, , selector] = item.value.split('|');
  return governance.businessVisualRules.find(rule => new RegExp(rule.filePattern, 'i').test(file) && new RegExp(rule.selectorPattern, 'i').test(selector));
}

function digest(values) {
  return createHash('sha256').update([...values].sort().join('\n')).digest('hex');
}

function classify(base, head) {
  const baseValues = new Set(allEntries(base).map(item => item.value));
  const result = { A: [], B: [], C: [], removed: [] };
  for (const item of allEntries(head)) {
    const rule = businessRuleFor(item);
    if (rule) result.B.push({ ...item, ruleId: rule.id });
    else if (baseValues.has(item.value)) result.C.push(item);
    else result.A.push(item);
  }
  const headValues = new Set(allEntries(head).map(item => item.value));
  for (const item of allEntries(base)) if (!headValues.has(item.value)) result.removed.push(item);
  for (const key of ['A', 'B', 'C', 'removed']) result[key].sort((a, b) => a.value.localeCompare(b.value));
  return result;
}

function trends(base, head, classified) {
  const categories = {};
  for (const category of Object.keys(head.categories)) {
    const before = base.categories[category].length;
    const after = head.categories[category].length;
    categories[category] = { baseline: before, current: after, delta: after - before };
  }
  return {
    categories,
    classes: {
      A: { baseline: 0, current: classified.A.length, delta: classified.A.length },
      B: { baseline: classified.B.length, current: classified.B.length, delta: 0 },
      C: { baseline: classified.C.length + classified.removed.length, current: classified.C.length, delta: -classified.removed.length }
    },
    globalBundleBytes: { baseline: base.totals.globalBundleBytes, current: head.totals.globalBundleBytes, delta: head.totals.globalBundleBytes - base.totals.globalBundleBytes }
  };
}

function markdown(report) {
  const lines = [
    '# Style Debt Classification Audit', '',
    `- Base: \`${report.base.ref}\``,
    `- Head: \`${report.head.ref}\``,
    `- Result: **${report.failed ? 'FAILED' : 'PASSED'}**`,
    `- A-class system debt: **${report.classification.A.length}**`,
    `- B-class business visual exceptions: **${report.classification.B.length}**`,
    `- C-class temporary compatibility exceptions: **${report.classification.C.length}**`,
    `- Removed historical entries: **${report.classification.removed.length}**`, '',
    '| Raw category | Baseline | Current | Delta |', '| --- | ---: | ---: | ---: |'
  ];
  for (const [name, value] of Object.entries(report.trends.categories)) lines.push(`| ${name} | ${value.baseline} | ${value.current} | ${value.delta} |`);
  lines.push('', '| Governance class | Baseline | Current | Delta |', '| --- | ---: | ---: | ---: |');
  for (const [name, value] of Object.entries(report.trends.classes)) lines.push(`| ${name} | ${value.baseline} | ${value.current} | ${value.delta} |`);
  lines.push('', `- Normalized collection digest: \`${report.collectionDigest}\``, '');
  if (report.classification.A.length) lines.push('## A-class blocking entries', '', ...report.classification.A.map(item => `- \`${item.category}: ${item.value}\``), '');
  if (report.classification.removed.length) lines.push('## Cleared entries', '', ...report.classification.removed.map(item => `- \`${item.category}: ${item.value}\``), '');
  lines.push('## Retained governance', '', ...governance.businessVisualRules.map(rule => `- **${rule.id}** — ${rule.owner}; root: \`${rule.featureRoot}\`; ${rule.responsibility}`), `- **${governance.temporaryCompatibility.id}** — ${governance.temporaryCompatibility.owner}; tracking #${governance.temporaryCompatibility.trackingIssue}; expires ${governance.temporaryCompatibility.expiresAt}.`, '');
  return `${lines.join('\n')}\n`;
}

const base = scan(baseRef);
const head = scan(headRef);
const classification = classify(base, head);
const report = {
  schemaVersion: 2,
  policy: governance.policy,
  base,
  head,
  classification,
  trends: trends(base, head, classification),
  collectionDigest: digest(allEntries(head).map(item => `${item.category}|${item.value}`)),
  governance,
  failed: classification.A.length > 0 || head.totals.globalBundleBytes > base.totals.globalBundleBytes
};
writeFileSync(path.join(PROJECT_ROOT, jsonPath), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(PROJECT_ROOT, markdownPath), markdown(report));
console.log(markdown(report));
if (check && report.failed) process.exitCode = 1;
