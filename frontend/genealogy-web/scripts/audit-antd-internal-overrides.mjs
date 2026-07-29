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
      const relative = path.relative(PROJECT_ROOT, absolute).replaceAll('\\', '/');
      const stat = statSync(absolute);
      if (stat.isDirectory()) {
        if (relative === 'src/prototypes') continue;
        walk(absolute);
      } else if (entry.endsWith('.css')) {
        files.push(relative);
      }
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

function splitSelectorList(header) {
  const selectors = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let quote = '';
  for (let index = 0; index < header.length; index += 1) {
    const char = header[index];
    if (quote) {
      if (char === quote && header[index - 1] !== '\\') quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') parentheses += 1;
    else if (char === ')') parentheses = Math.max(0, parentheses - 1);
    else if (char === '[') brackets += 1;
    else if (char === ']') brackets = Math.max(0, brackets - 1);
    else if (char === ',' && parentheses === 0 && brackets === 0) {
      selectors.push(normalize(header.slice(start, index)));
      start = index + 1;
    }
  }
  selectors.push(normalize(header.slice(start)));
  return selectors.filter(Boolean);
}

function extractRules(source, media = 'root') {
  const clean = stripComments(source);
  const rules = [];
  let cursor = 0;
  while (cursor < clean.length) {
    const open = clean.indexOf('{', cursor);
    if (open < 0) break;
    const header = normalize(clean.slice(cursor, open));
    let depth = 1;
    let close = open + 1;
    let quote = '';
    while (close < clean.length && depth > 0) {
      const char = clean[close];
      if (quote) {
        if (char === quote && clean[close - 1] !== '\\') quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      close += 1;
    }
    if (depth !== 0) break;
    const body = clean.slice(open + 1, close - 1);
    if (header.startsWith('@media') || header.startsWith('@supports') || header.startsWith('@container') || header.startsWith('@layer')) {
      rules.push(...extractRules(body, `${media} > ${header}`));
    } else if (!header.startsWith('@')) {
      for (const selector of splitSelectorList(header)) {
        if (selector.includes('.ant-')) rules.push({ selector, media, declarations: normalize(body) });
      }
    }
    cursor = close;
  }
  return rules;
}

function businessClasses(selector) {
  return [...selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)]
    .map(match => match[1])
    .filter(name => !name.startsWith('ant-') && !name.startsWith('css-'));
}

function classify(selector) {
  const antMatches = [...selector.matchAll(/\.ant-[\w-]+/g)];
  const antIndex = antMatches[0]?.index ?? -1;
  const prefix = selector.slice(0, antIndex);
  const business = businessClasses(selector);
  const sameCompoundPrefix = prefix.split(/[\s>+~]/).at(-1) || '';
  const explicitRootBinding = business.length > 0 && /\.[a-zA-Z_][\w-]*$/.test(sameCompoundPrefix);
  const portalScoped = /^(?:body|html)(?::has\([^)]*\))?\s+/.test(selector) && business.length > 0;
  const hasDataScope = selector.slice(0, antIndex).includes('[data-');
  const unscoped = business.length === 0 && !hasDataScope;
  const deep = antMatches.length > 1 || /\.ant-[\w-]+\s*[>+~]\s*\.ant-/.test(selector);
  const structural = /:(?:nth|first|last|has)\b|\[title[\^$*|~]?=/.test(selector);

  if (unscoped) return { category: 'unscoped-internal', disposition: 'blocking' };
  if (explicitRootBinding && antMatches.length === 1) return { category: 'public-component-root', disposition: 'allowed' };
  if (portalScoped) return { category: 'portal-scoped-contract', disposition: 'reviewed' };
  if (deep || structural) return { category: 'private-structure-contract', disposition: 'reviewed' };
  return { category: 'scoped-component-contract', disposition: 'reviewed' };
}

function exactEntry(file, media, selector) {
  return `${file}|${media}|${selector}`;
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
    if (item.replacementAssessment !== 'unavoidable') {
      throw new Error(`Ant Design override exception ${item.id} is replaceable and must be migrated instead of registered`);
    }
  }
}

validateConfig();
const files = listCssFiles();
const recordsByKey = new Map();
for (const file of files) {
  const source = readFileSync(path.join(PROJECT_ROOT, file), 'utf8');
  for (const rule of extractRules(source)) {
    const classification = classify(rule.selector);
    const entry = exactEntry(file, rule.media, rule.selector);
    recordsByKey.set(entry, { file, ...rule, ...classification, entry });
  }
}
const records = [...recordsByKey.values()].sort((left, right) => left.entry.localeCompare(right.entry));
const allowed = new Set(config.exceptions.flatMap(item => item.entries));
const blocking = records.filter(record => record.disposition === 'blocking' && !allowed.has(record.entry));
const registered = records.filter(record => allowed.has(record.entry));
const recordKeys = new Set(records.map(record => record.entry));
const stale = [...allowed].filter(value => !recordKeys.has(value)).sort();
const categories = Object.fromEntries(
  [...new Set(records.map(record => record.category))].sort().map(category => [category, records.filter(record => record.category === category).length])
);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  policy: config.policy,
  totals: {
    cssFiles: files.length,
    selectors: records.length,
    blocking: blocking.length,
    registered: registered.length,
    staleExceptions: stale.length
  },
  categories,
  blocking,
  registered,
  staleExceptions: stale,
  records,
  exceptions: config.exceptions
};

function markdown(data) {
  const failed = data.totals.blocking || data.totals.staleExceptions;
  const lines = [
    '# Ant Design Internal Override Audit',
    '',
    `- Result: **${failed ? 'FAILED' : 'PASSED'}**`,
    `- Production CSS files: ${data.totals.cssFiles}`,
    `- Selectors containing Ant Design classes: ${data.totals.selectors}`,
    `- Blocking unscoped selectors: ${data.totals.blocking}`,
    `- Registered unavoidable selectors: ${data.totals.registered}`,
    `- Stale exceptions: ${data.totals.staleExceptions}`,
    '',
    '## Classification',
    '',
    '| Category | Count |',
    '| --- | ---: |',
    ...Object.entries(data.categories).map(([category, count]) => `| ${category} | ${count} |`),
    ''
  ];
  if (data.blocking.length) {
    lines.push('## Blocking selectors', '', ...data.blocking.map(item => `- \`${item.entry}\``), '');
  }
  if (data.staleExceptions.length) {
    lines.push('## Stale exceptions', '', ...data.staleExceptions.map(value => `- \`${value}\``), '');
  }
  lines.push(
    '## Reviewed selector inventory',
    '',
    '| File | Selector | Classification |',
    '| --- | --- | --- |',
    ...data.records.map(item => `| \`${item.file}\` | \`${item.selector.replaceAll('|', '\\|')}\` | ${item.category} |`),
    ''
  );
  return `${lines.join('\n')}\n`;
}

writeFileSync(path.join(PROJECT_ROOT, jsonPath), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(PROJECT_ROOT, markdownPath), markdown(report));
console.log(markdown(report));
if (!reportOnly && (blocking.length || stale.length)) process.exitCode = 1;
