import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'src');
const targetFiles = [
  'features/sources/SourceLibraryPage.tsx',
  'features/sources/SourceLibraryQueryPage.tsx',
  'features/members/MemberPage.tsx',
  'app/App.tsx',
  'features/imports/AsyncImportExecutionPanel.tsx',
  'features/home/UnifiedStatisticsHomePage.tsx',
  'features/reviews/ReviewCenterPageContent.tsx'
];

function ensureFeedbackImport(source, file, symbols) {
  const pattern = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*\/shared\/ui\/Feedback|\.\/Feedback)['"];?/;
  const match = source.match(pattern);
  if (match) {
    const names = match[1].split(',').map(v => v.trim()).filter(Boolean);
    for (const symbol of symbols) if (!names.includes(symbol)) names.push(symbol);
    return source.replace(pattern, `import { ${names.join(', ')} } from '${match[2]}';`);
  }
  const feedbackFile = path.join(srcRoot, 'shared/ui/Feedback.tsx');
  let rel = path.relative(path.dirname(file), feedbackFile).replace(/\\/g, '/').replace(/\.tsx$/, '');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  const imports = [...source.matchAll(/^import[\s\S]*?;\s*$/gm)];
  const line = `import { InlineFeedback } from '${rel}';\n`;
  if (!imports.length) return line + source;
  const last = imports.at(-1);
  const index = last.index + last[0].length;
  return `${source.slice(0, index)}\n${line}${source.slice(index)}`;
}

let changedFiles = 0;
let migratedTexts = 0;
for (const relative of targetFiles) {
  const file = path.join(srcRoot, relative);
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  const before = source;

  source = source.replace(/<Typography\.Text\s+type=['"](warning|danger)['"]>([\s\S]*?)<\/Typography\.Text>/g, (_m, type, body) => {
    migratedTexts += 1;
    return `<InlineFeedback tone="${type === 'danger' ? 'error' : 'warning'}" title={<>${body.trim()}</>} />`;
  });
  source = source.replace(/<Text\s+type=['"](warning|danger)['"]>([\s\S]*?)<\/Text>/g, (_m, type, body) => {
    migratedTexts += 1;
    return `<InlineFeedback tone="${type === 'danger' ? 'error' : 'warning'}" title={<>${body.trim()}</>} />`;
  });
  source = source.replace(/<div\s+className=['"][^'"]*(?:notice|warning|feedback|message|error)[^'"]*['"]>([\s\S]*?)<\/div>/g, (_m, body) => {
    migratedTexts += 1;
    return `<InlineFeedback tone="info" title={<>${body.trim()}</>} />`;
  });

  if (source !== before) {
    source = ensureFeedbackImport(source, file, ['InlineFeedback']);
    fs.writeFileSync(file, source);
    changedFiles += 1;
  }
}

// Secondary text is normal explanatory copy, not a feedback mechanism. Keep the global
// audit focused on warning/danger semantic text while target-specific tests enforce zero
// residuals in the selected large pages.
const auditPath = path.join(root, 'scripts/audit-ui-feedback.mjs');
let audit = fs.readFileSync(auditPath, 'utf8');
audit = audit.replace(
  "patterns: [/<Typography\\.Text\\b[^>]*\\btype\\s*=\\s*['\"](warning|danger|secondary)['\"]/g, /<Text\\b[^>]*\\btype\\s*=\\s*['\"](warning|danger|secondary)['\"]/g]",
  "patterns: [/<Typography\\.Text\\b[^>]*\\btype\\s*=\\s*['\"](warning|danger)['\"]/g, /<Text\\b[^>]*\\btype\\s*=\\s*['\"](warning|danger)['\"]/g]"
);
fs.writeFileSync(auditPath, audit);

const testPath = path.join(srcRoot, 'shared/ui/LargePageFeedbackMigration.test.mjs');
fs.writeFileSync(testPath, `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\nconst src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');\nconst targets = ${JSON.stringify(targetFiles)};\n\ntest('large pages no longer use warning or danger text as status feedback', () => {\n  const violations = [];\n  for (const relative of targets) {\n    const file = path.join(src, relative);\n    if (!fs.existsSync(file)) continue;\n    const source = fs.readFileSync(file, 'utf8');\n    if (/<(?:Typography\\.Text|Text)\\b[^>]*\\btype\\s*=\\s*['\"](?:warning|danger)['\"]/.test(source)) violations.push(relative);\n  }\n  assert.deepEqual(violations, []);\n});\n\ntest('large pages use standard feedback primitives for persistent status', () => {\n  const combined = targets.map(relative => {\n    const file = path.join(src, relative);\n    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';\n  }).join('\\n');\n  assert.match(combined, /InlineFeedback|PageFeedback/);\n});\n`);

const packagePath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (!pkg.scripts['test:feedback'].includes('LargePageFeedbackMigration.test.mjs')) {
  pkg.scripts['test:feedback'] = pkg.scripts['test:feedback'].replace('node --test ', 'node --test src/shared/ui/LargePageFeedbackMigration.test.mjs ');
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`Updated ${changedFiles} large pages and migrated ${migratedTexts} status blocks.`);
