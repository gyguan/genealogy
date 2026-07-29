import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const SOURCE_ROOT = path.join(PROJECT_ROOT, 'src');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'antd-internal-overrides.json');
const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const jsonPath = arg('json', 'antd-internal-overrides-audit.json');
const markdownPath = arg('markdown', 'antd-internal-overrides-audit.md');
const reportOnly = process.argv.includes('--report-only');

function listCssFiles() {
  const files = [];
  function walk(directory) {
    for (const entry of readdirSync(directory)) {
      const absolute = path.join(directory, entry);
      const stat = statSync(absolute);
      if (stat.isDirectory()) walk(absolute);
      else if (entry.endsWith('.css')) files.push(path.relative(PROJECT_ROOT, absolute).replaceAll('\\', '/'));
    }
  }
  walk(SOURCE_ROOT);
  return files.sort();
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function normalize(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function selectorHeaders(source) {
  const clean = stripComments(source);
  const selectors = [];
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
    if (header.startsWith('@media') || header.startsWith('@supports') || header.startsWith('@container') || header.startsWith('@layer')) {
      selectors.push(...selectorHeaders(body));
    } else if (!header.startsWith('@') && header.includes('.ant-')) {
      selectors.push(...header.split(',').map(normalize).filter(Boolean));
    }
    cursor = close;
  }
  return selectors;
}

function entry(file, selector) {
  return `${file}|${selector}`;
}

function isUnscoped(selector) {
  return /^(?:html\s+|body\s+|#root\s+)?\.ant-[\w-]+/.test(selector);
}

function validateConfig() {
  if (config.schemaVersion !== 1) throw new Error('antd-internal-overrides.json schemaVersion must be 1');
  if (!Array.isArray(config.exceptions)) throw new Error('antd-internal-overrides.json exceptions must be an array');
  const required = ['id', 'entries', 'owner', 'reason', 'replacementAssessment', 'trackingIssue', 'reviewedAt', 'exitCondition'];
  for (const item of config.exceptions) {
    for (const field of required) {
      if (item[field] === undefined || item[field] === '' || (Array.isArray(item[field]) && item[field].length === 0)) {
        throw new Error(`Ant Design override exception ${item.id || '<unknown>'} missing ${field}`);
      }
    }
    if (!Number.isInteger(item.trackingIssue)) throw new Error(`Ant Design override exception ${item.id} trackingIssue must be an integer`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.reviewedAt)) throw new Error(`Ant Design override exception ${item.id} reviewedAt must be YYYY-MM-DD`);
    if (!['token', 'component-token', 'component-prop', 'outer-layout', 'unavoidable'].includes(item.replacementAssessment)) {
      throw new Error(`Ant Design override exception ${item.id} has invalid replacementAssessment`);
    }
    if (item.replacementAssessment !== 'unavoidable') {
      throw new Error(`Ant Design override exception ${item.id} is replaceable and must be migrated instead of registered`);
    }
  }
}

validateConfig();
const allowed = new Set(config.exceptions.flatMap(item => item.entries));
const files = listCssFiles();
const all = [];
const unscoped = [];
for (const file of files) {
  const source = readFileSync(path.join(PROJECT_ROOT, file), 'utf8');
  for (const selector of selectorHeaders(source)) {
    const value = entry(file, selector);
    all.push(value);
    if (isUnscoped(selector)) unscoped.push(value);
  }
}
all.sort();
unscoped.sort();
const registered = all.filter(value => allowed.has(value));
const unregistered = all.filter(value => !allowed.has(value));
const stale = [...allowed].filter(value => !new Set(all).has(value)).sort();
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  policy: config.policy,
  totals: {
    cssFiles: files.length,
    internalSelectors: all.length,
    registered: registered.length,
    unregistered: unregistered.length,
    unscoped: unscoped.length,
    staleExceptions: stale.length
  },
  internalSelectors: all,
  registered,
  unregistered,
  unscoped,
  staleExceptions: stale,
  exceptions: config.exceptions
};

function markdown(data) {
  const lines = [
    '# Ant Design Internal Override Audit',
    '',
    `- Result: **${data.totals.unregistered || data.totals.unscoped || data.totals.staleExceptions ? 'FAILED' : 'PASSED'}**`,
    `- CSS files: ${data.totals.cssFiles}`,
    `- Internal selectors: ${data.totals.internalSelectors}`,
    `- Registered unavoidable selectors: ${data.totals.registered}`,
    `- Unregistered selectors: ${data.totals.unregistered}`,
    `- Unscoped selectors: ${data.totals.unscoped}`,
    `- Stale exceptions: ${data.totals.staleExceptions}`,
    ''
  ];
  for (const [title, values] of [
    ['Unregistered internal selectors (blocking)', data.unregistered],
    ['Unscoped internal selectors (blocking)', data.unscoped],
    ['Stale exceptions (blocking)', data.staleExceptions],
    ['Registered unavoidable selectors', data.registered]
  ]) {
    if (!values.length) continue;
    lines.push(`## ${title}`, '', ...values.map(value => `- \`${value}\``), '');
  }
  return `${lines.join('\n')}\n`;
}

writeFileSync(path.join(PROJECT_ROOT, jsonPath), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(PROJECT_ROOT, markdownPath), markdown(report));
console.log(markdown(report));
if (!reportOnly && (unregistered.length || unscoped.length || stale.length)) process.exitCode = 1;
