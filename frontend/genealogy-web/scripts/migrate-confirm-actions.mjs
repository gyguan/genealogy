import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'src');
const feedbackFile = path.join(srcRoot, 'shared/ui/Feedback.tsx');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function removeFromAntdImport(source, symbol) {
  return source.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]antd['"];?/g, (full, body) => {
    const names = body.split(',').map(item => item.trim()).filter(Boolean).filter(item => item !== symbol);
    if (names.length === 0) return '';
    return `import { ${names.join(', ')} } from 'antd';`;
  });
}

function feedbackImport(file) {
  let rel = path.relative(path.dirname(file), feedbackFile).replace(/\\/g, '/').replace(/\.tsx$/, '');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function ensureFeedbackSymbols(source, file, symbols) {
  const importPattern = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*\/shared\/ui\/Feedback|\.\/Feedback)['"];?/;
  const match = source.match(importPattern);
  if (match) {
    const current = match[1].split(',').map(item => item.trim()).filter(Boolean);
    for (const symbol of symbols) if (!current.includes(symbol)) current.push(symbol);
    return source.replace(importPattern, `import { ${current.join(', ')} } from '${match[2]}';`);
  }
  const line = `import { ${symbols.join(', ')} } from '${feedbackImport(file)}';\n`;
  const imports = [...source.matchAll(/^import[\s\S]*?;\s*$/gm)];
  if (!imports.length) return line + source;
  const last = imports.at(-1);
  const index = last.index + last[0].length;
  return `${source.slice(0, index)}\n${line}${source.slice(index)}`;
}

let popconfirmCount = 0;
let imperativeCount = 0;
for (const file of walk(srcRoot)) {
  if (file === feedbackFile || /\.test\.|\.spec\./.test(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  const before = source;
  const pop = (source.match(/<\/?Popconfirm\b/g) || []).length;
  const imperative = (source.match(/\b(?:Modal|modal)\.confirm\s*\(/g) || []).length;
  if (!pop && !imperative) continue;

  if (pop) {
    source = source.replace(/<Popconfirm\b/g, '<ConfirmAction');
    source = source.replace(/<\/Popconfirm>/g, '</ConfirmAction>');
    source = removeFromAntdImport(source, 'Popconfirm');
    popconfirmCount += pop;
  }
  if (imperative) {
    source = source.replace(/\bModal\.confirm\s*\(/g, 'confirmAction(');
    source = source.replace(/\bmodal\.confirm\s*\(/g, 'confirmAction(');
    imperativeCount += imperative;
  }
  const symbols = [];
  if (pop) symbols.push('ConfirmAction');
  if (imperative) symbols.push('confirmAction');
  source = ensureFeedbackSymbols(source, file, symbols);
  if (source !== before) fs.writeFileSync(file, source);
}

let feedback = fs.readFileSync(feedbackFile, 'utf8');
feedback = feedback.replace(
  "import { Alert, Empty as AntEmpty, Popconfirm, Result } from 'antd';",
  "import { Alert, Empty as AntEmpty, Modal, Popconfirm, Result } from 'antd';"
);
feedback = feedback.replace(
  "import type { AlertProps, EmptyProps, PopconfirmProps, ResultProps } from 'antd';",
  "import type { AlertProps, EmptyProps, ModalFuncProps, PopconfirmProps, ResultProps } from 'antd';"
);
if (!feedback.includes('export function confirmAction(')) {
  feedback += `\n/** 命令式确认的统一入口，仅用于无法随触发器渲染 ConfirmAction 的场景。 */\nexport function confirmAction(options: ModalFuncProps) {\n  return Modal.confirm({\n    okText: '确认',\n    cancelText: '取消',\n    centered: true,\n    ...options,\n    okButtonProps: {\n      ...options.okButtonProps,\n      danger: options.okButtonProps?.danger || options.type === 'error'\n    }\n  });\n}\n`;
}
fs.writeFileSync(feedbackFile, feedback);

const auditPath = path.join(root, 'scripts/audit-ui-feedback.mjs');
let audit = fs.readFileSync(auditPath, 'utf8');
audit = audit.replace(
  "patterns: [/<Popconfirm\\b/g, /\\bModal\\.confirm\\s*\\(/g, /\\bmodal\\.confirm\\s*\\(/g, /<Modal\\b/g]",
  "patterns: [/<Popconfirm\\b/g, /\\bModal\\.confirm\\s*\\(/g, /\\bmodal\\.confirm\\s*\\(/g]"
);
fs.writeFileSync(auditPath, audit);

const baselinePath = path.join(root, 'feedback-audit-baseline.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
baseline.maxCounts.confirm_modal = 0;
fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);

const testPath = path.join(srcRoot, 'shared/ui/ConfirmActionMigration.test.mjs');
fs.writeFileSync(testPath, `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\nconst src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');\nfunction walk(dir) {\n  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {\n    const full = path.join(dir, entry.name);\n    if (entry.isDirectory()) return walk(full);\n    return entry.isFile() && /\\.tsx?$/.test(entry.name) ? [full] : [];\n  });\n}\n\ntest('business source uses unified confirmation entry points', () => {\n  const violations = [];\n  for (const file of walk(src)) {\n    if (file.endsWith('shared/ui/Feedback.tsx') || /\\.test\\.|\\.spec\\./.test(file)) continue;\n    const source = fs.readFileSync(file, 'utf8');\n    if (/<Popconfirm\\b/.test(source) || /\\b(?:Modal|modal)\\.confirm\\s*\\(/.test(source) || /import\\s*\\{[\\s\\S]*?\\bPopconfirm\\b[\\s\\S]*?\\}\\s*from\\s*['\"]antd['\"]/.test(source)) violations.push(path.relative(src, file));\n  }\n  assert.deepEqual(violations, []);\n});\n\ntest('standard feedback module exposes declarative and imperative confirmation APIs', () => {\n  const source = fs.readFileSync(path.join(src, 'shared/ui/Feedback.tsx'), 'utf8');\n  assert.match(source, /export function ConfirmAction/);\n  assert.match(source, /export function confirmAction/);\n});\n`);

const packagePath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (!pkg.scripts['test:feedback'].includes('ConfirmActionMigration.test.mjs')) {
  pkg.scripts['test:feedback'] = pkg.scripts['test:feedback'].replace('node --test ', 'node --test src/shared/ui/ConfirmActionMigration.test.mjs ');
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

const feedbackTestPath = path.join(srcRoot, 'shared/ui/FeedbackUnification.test.mjs');
let feedbackTest = fs.readFileSync(feedbackTestPath, 'utf8');
feedbackTest = feedbackTest.replace('baseline.maxCounts.confirm_modal, 60', 'baseline.maxCounts.confirm_modal, 0');
fs.writeFileSync(feedbackTestPath, feedbackTest);

const residual = [];
for (const file of walk(srcRoot)) {
  if (file === feedbackFile || /\.test\.|\.spec\./.test(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (/<Popconfirm\b/.test(source) || /\b(?:Modal|modal)\.confirm\s*\(/.test(source)) residual.push(path.relative(srcRoot, file));
}
if (residual.length) {
  console.error('Confirmation residuals remain:\n' + residual.join('\n'));
  process.exit(1);
}
console.log(`Migrated ${popconfirmCount} Popconfirm tags and ${imperativeCount} imperative confirmation calls.`);
