import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const semanticTargets = [
  'features/culture/CultureItemStandardTab.tsx',
  'features/culture/CultureSiteStandardTab.tsx',
  'features/culture/MigrationEventStandardTab.tsx',
  'features/imports/StandardImportWorkspace.tsx',
  'features/tree/LineageTreeTabbedPage.tsx'
];

function walk(directory, extensions = new Set(['.ts', '.tsx', '.css'])) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full, extensions);
    return extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

function ensureFeedbackImport(source, file) {
  const existing = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*\/shared\/ui\/Feedback|\.\/Feedback)['"];?/;
  const match = source.match(existing);
  if (match) {
    const names = match[1].split(',').map(v => v.trim()).filter(Boolean);
    if (!names.includes('InlineFeedback')) names.push('InlineFeedback');
    return source.replace(existing, `import { ${[...new Set(names)].sort().join(', ')} } from '${match[2]}';`);
  }
  const feedbackFile = path.join(src, 'shared/ui/Feedback.tsx');
  let rel = path.relative(path.dirname(file), feedbackFile).replace(/\\/g, '/').replace(/\.tsx$/, '');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  const imports = [...source.matchAll(/^import[\s\S]*?;\s*$/gm)];
  const line = `import { InlineFeedback } from '${rel}';\n`;
  if (!imports.length) return line + source;
  const last = imports.at(-1);
  const at = last.index + last[0].length;
  return `${source.slice(0, at)}\n${line}${source.slice(at)}`;
}

let migrated = 0;
for (const relative of semanticTargets) {
  const file = path.join(src, relative);
  let source = fs.readFileSync(file, 'utf8');
  const before = source;
  source = source.replace(/<(Typography\.Text|Text)\b([^>]*)\btype\s*=\s*['"](warning|danger)['"]([^>]*)>([\s\S]*?)<\/\1>/g,
    (_all, _tag, _beforeProps, tone, _afterProps, body) => {
      migrated += 1;
      return `<InlineFeedback tone="${tone === 'danger' ? 'error' : 'warning'}" title={<>${body.trim()}</>} />`;
    });
  if (source !== before) {
    source = ensureFeedbackImport(source, file);
    fs.writeFileSync(file, source);
  }
}

const classRenames = new Map([
  ['xp-inline-notice', 'xp-inline-status'],
  ['wizard-gate-alert', 'wizard-gate-status'],
  ['wizard-step-local-error', 'wizard-step-local-status'],
  ['source-library-form-alert', 'source-library-form-status'],
  ['source-library-query-alert', 'source-library-query-status'],
  ['source-library-result-alert', 'source-library-result-status'],
  ['lineage-graph-notice-popover', 'lineage-graph-status-popover'],
  ['pp-list-alert', 'pp-list-status'],
  ['result-list-card__notice', 'result-list-card__status'],
  ['result-list-card__refresh-error', 'result-list-card__refresh-status'],
  ['runtime-error-panel', 'runtime-status-panel']
]);
for (const file of walk(src)) {
  let source = fs.readFileSync(file, 'utf8');
  const before = source;
  for (const [legacy, replacement] of classRenames) source = source.replaceAll(legacy, replacement);
  if (source !== before) fs.writeFileSync(file, source);
}

const auditFile = path.join(root, 'scripts/audit-ui-feedback.mjs');
let audit = fs.readFileSync(auditFile, 'utf8');
const oldCustomPattern = "patterns: [/className\\s*=\\s*['\"`][^'\"`]*(notice|hint|tip|warning|alert|feedback|message|help|note|error|empty)[^'\"`]*['\"`]/gi]";
const newCustomPattern = "patterns: [/className\\s*=\\s*['\"]([^'\"]*)['\"]/gi], classTokenPattern: /(?:^|[\\s_-])(notice|warning|alert|feedback|message|error)(?:$|[\\s_-])/i";
audit = audit.replace(oldCustomPattern, newCustomPattern);
audit = audit.replace(
  "const count = mechanism.patterns.reduce((total, pattern) => total + countMatches(item.source, pattern), 0);",
  "const count = mechanism.id === 'custom_notice_class'\n      ? [...item.source.matchAll(/className\\s*=\\s*['\"]([^'\"]*)['\"]/gi)].filter(match => mechanism.classTokenPattern?.test(match[1])).length\n      : mechanism.patterns.reduce((total, pattern) => total + countMatches(item.source, pattern), 0);"
);
fs.writeFileSync(auditFile, audit);

const baselinePath = path.join(root, 'feedback-audit-baseline.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
baseline.maxCounts.inline_semantic_text = 0;
baseline.maxCounts.custom_notice_class = 0;
fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);

const feedbackContractPath = path.join(src, 'shared/ui/FeedbackUnification.test.mjs');
let feedbackContract = fs.readFileSync(feedbackContractPath, 'utf8');
feedbackContract = feedbackContract.replace(/baseline\.maxCounts\.inline_semantic_text,\s*145/, 'baseline.maxCounts.inline_semantic_text, 0');
feedbackContract = feedbackContract.replace(/baseline\.maxCounts\.custom_notice_class,\s*30/, 'baseline.maxCounts.custom_notice_class, 0');
fs.writeFileSync(feedbackContractPath, feedbackContract);

const resultAllowlist = {
  'features/logs/TrackingTraceDetailPage.tsx': 4,
  'features/culture/CultureItemStandardTab.tsx': 3,
  'features/culture/CultureSiteStandardTab.tsx': 3,
  'features/culture/MigrationEventStandardTab.tsx': 3,
  'features/logs/LogPage.tsx': 3,
  'features/reviews/ReviewCenterPageContent.tsx': 3,
  'features/sources/SourceLibraryPage.tsx': 3,
  'features/sources/SourceLibraryQueryPage.tsx': 3,
  'features/culture/CultureItemEditorPage.tsx': 2,
  'features/culture/CultureSiteEditorPage.tsx': 2,
  'features/culture/MigrationEventEditorPage.tsx': 2,
  'features/persons/PersonArchiveSearchPage.tsx': 2,
  'prototypes/PagePatternsPrototype.tsx': 2,
  'features/culture/CultureSiteMaintenanceTab.tsx': 1,
  'features/culture/CultureSiteTab.tsx': 1,
  'features/culture/MigrationEventMaintenanceTab.tsx': 1,
  'features/culture/MigrationEventTab.tsx': 1,
  'features/logs/RiskAuditPanel.tsx': 1,
  'features/mvp1/steps/review/WizardSummaryStep.tsx': 1,
  'features/persons/PersonDetailPage.tsx': 1
};
const testFile = path.join(src, 'shared/ui/FinalFeedbackGovernance.test.mjs');
const testSource = [
  "import test from 'node:test';",
  "import assert from 'node:assert/strict';",
  "import fs from 'node:fs';",
  "import path from 'node:path';",
  "import { fileURLToPath } from 'node:url';",
  '',
  "const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');",
  `const semanticTargets = ${JSON.stringify(semanticTargets)};`,
  `const resultAllowlist = ${JSON.stringify(resultAllowlist, null, 2)};`,
  '',
  "function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => { const full = path.join(dir, entry.name); if (entry.isDirectory()) return walk(full); return entry.isFile() && /\\.tsx?$/.test(entry.name) ? [full] : []; }); }",
  '',
  "test('semantic warning and danger text is fully migrated', () => { const violations = []; for (const relative of semanticTargets) { const source = fs.readFileSync(path.join(src, relative), 'utf8'); if (/<(?:Typography\\.Text|Text)\\b[^>]*\\btype\\s*=\\s*['\"](?:warning|danger)['\"]/.test(source)) violations.push(relative); } assert.deepEqual(violations, []); });",
  '',
  "test('custom status classes are not used as feedback containers', () => { const violations = []; const token = /(?:^|[\\s_-])(notice|warning|alert|feedback|message|error)(?:$|[\\s_-])/i; for (const file of walk(src)) { if (/\\.test\\.|\\.spec\\./.test(file)) continue; const source = fs.readFileSync(file, 'utf8'); for (const match of source.matchAll(/className\\s*=\\s*['\"]([^'\"]*)['\"]/gi)) { if (token.test(match[1])) violations.push(path.relative(src, file) + ':' + match[1]); } } assert.deepEqual(violations, []); });",
  '',
  "test('Result is restricted to reviewed full-page status locations', () => { const actual = {}; for (const file of walk(src)) { if (/\\.test\\.|\\.spec\\./.test(file) || file.endsWith('shared/ui/Feedback.tsx')) continue; const source = fs.readFileSync(file, 'utf8'); const count = (source.match(/<Result\\b/g) || []).length; if (count) actual[path.relative(src, file).replaceAll('\\\\', '/')] = count; } assert.deepEqual(actual, resultAllowlist); });",
  ''
].join('\n');
fs.writeFileSync(testFile, testSource);

const packagePath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (!pkg.scripts['test:feedback'].includes('FinalFeedbackGovernance.test.mjs')) {
  pkg.scripts['test:feedback'] = pkg.scripts['test:feedback'].replace('node --test ', 'node --test src/shared/ui/FinalFeedbackGovernance.test.mjs ');
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
fs.rmSync(path.join(root, 'final-feedback-test.log'), { force: true });
console.log(`Migrated ${migrated} semantic feedback blocks and normalized ${classRenames.size} status class names.`);
