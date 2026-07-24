import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(file);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.|\.spec\./.test(entry.name) || file.includes(`${path.sep}generated${path.sep}`)) return [];
    return [file];
  });
}

function ensureFeedbackImport(source, file) {
  if (!source.includes('feedback.from(') || source.includes("OperationFeedback'")) return source;
  const target = path.join(srcRoot, 'shared/ui/OperationFeedback').replaceAll(path.sep, '/');
  let relative = path.relative(path.dirname(file), target).replaceAll(path.sep, '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  const line = `import { feedback } from '${relative}';\n`;
  const imports = [...source.matchAll(/^import[\s\S]*?;\s*$/gm)];
  if (!imports.length) return `${line}${source}`;
  const last = imports.at(-1);
  return `${source.slice(0, last.index + last[0].length)}\n${line}${source.slice(last.index + last[0].length)}`;
}

function migrateGeneric(source) {
  return source
    .replace(/(?<!function )\bnotify\s*\(/g, 'feedback.from(')
    .replace(/\s+notify=\{[^{}]*\}/g, '')
    .replace(/^\s*notify\??:\s*[^;]+;\s*$/gm, '')
    .replace(/\{\s*notify\s*,\s*/g, '{ ')
    .replace(/,\s*notify\s*\}/g, ' }')
    .replace(/\{\s*notify\s*\}/g, '{}');
}

function migrateApp(source) {
  let next = source
    .replace("import type { FeedbackTone } from '../shared/ui/Feedback';\n", '')
    .replace("import { ToastStack } from '../shared/ui/ToastStack';\n", '')
    .replace("import type { ToastItem } from '../shared/ui/ToastStack';\n", '');
  if (!next.includes("../shared/ui/OperationFeedback'")) {
    next = next.replace("import type { AppViewKey } from '../shared/navigation/urlState';\n", "import type { AppViewKey } from '../shared/navigation/urlState';\nimport { feedback } from '../shared/ui/OperationFeedback';\n");
  }
  next = next
    .replace(/\nfunction feedbackRecord\([\s\S]*?\n}\n\nfunction getFeedbackTone\([\s\S]*?\n}\n/, '\n')
    .replace(/\n\s*const \[toasts, setToasts\] = useState<ToastItem\[\]>\(\[\]\);/, '')
    .replace(/\n\s*function closeToast\([\s\S]*?\n\s*}\n\s*function notify\([\s\S]*?\n\s*}\n/, '\n')
    .replace(/<><AuthPage([^>]*)\/><ToastStack[^>]*\/><\/>/g, '<AuthPage$1/>')
    .replace(/\n\s*<ToastStack items=\{toasts\} onClose=\{closeToast\} \/>/g, '');
  return migrateGeneric(next);
}

let changedFiles = 0;
for (const file of walk(srcRoot)) {
  const original = readFileSync(file, 'utf8');
  let next = file.endsWith(`${path.sep}app${path.sep}App.tsx`) ? migrateApp(original) : migrateGeneric(original);
  next = ensureFeedbackImport(next, file);
  if (next !== original) {
    writeFileSync(file, next);
    changedFiles += 1;
  }
}

const operationFeedbackPath = path.join(srcRoot, 'shared/ui/OperationFeedback.ts');
let operationFeedback = readFileSync(operationFeedbackPath, 'utf8');
if (!operationFeedback.includes('function normalizeUnknown(')) {
  operationFeedback = operationFeedback.replace(
    "export type OperationFeedbackContent = string | {\n  message: string;\n  duration?: number;\n};",
    "export type OperationFeedbackContent = string | {\n  message: string;\n  duration?: number;\n};\n\nfunction normalizeUnknown(data: unknown, fallback: string): OperationFeedbackContent {\n  if (typeof data === 'string') return data;\n  if (data instanceof Error) return data.message || fallback;\n  if (data && typeof data === 'object') {\n    const record = data as Record<string, unknown>;\n    const message = record.message ?? record.errorMessage ?? record.status;\n    const duration = typeof record.duration === 'number' ? record.duration : undefined;\n    if (message !== undefined && message !== null) return { message: String(message), duration };\n  }\n  return data === undefined || data === null ? fallback : String(data);\n}"
  );
}
if (!operationFeedback.includes('from: (data: unknown')) {
  operationFeedback = operationFeedback.replace(
    "  error: (content: OperationFeedbackContent) => emit('error', content)\n};",
    "  error: (content: OperationFeedbackContent) => emit('error', content),\n  from: (data: unknown, error = false) => {\n    const record = data && typeof data === 'object' ? data as Record<string, unknown> : null;\n    const requestedTone = record?.type;\n    const tone: OperationFeedbackTone = error\n      ? 'error'\n      : requestedTone === 'success' || requestedTone === 'info' || requestedTone === 'warning' || requestedTone === 'error'\n        ? requestedTone\n        : 'success';\n    return emit(tone, normalizeUnknown(data, error ? '操作失败，请稍后重试' : '操作成功'));\n  }\n};"
  );
}
writeFileSync(operationFeedbackPath, operationFeedback);

const baselinePath = path.join(projectRoot, 'feedback-audit-baseline.json');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
baseline.maxCounts.app_notify = 0;
writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);

const contractPath = path.join(srcRoot, 'shared/ui/ApplicationNotifyMigration.test.mjs');
writeFileSync(contractPath, `import assert from 'node:assert/strict';\nimport { readdirSync, readFileSync } from 'node:fs';\nimport path from 'node:path';\nimport test from 'node:test';\n\nconst root = path.resolve(process.cwd(), 'src');\nfunction walk(directory) {\n  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {\n    const file = path.join(directory, entry.name);\n    if (entry.isDirectory()) return walk(file);\n    if (!/\\.(ts|tsx)$/.test(entry.name) || /\\.test\\.|\\.spec\\./.test(entry.name) || file.includes(path.sep + 'generated' + path.sep)) return [];\n    return [file];\n  });\n}\n\ntest('application source no longer exposes the legacy notify interface', () => {\n  const violations = walk(root).flatMap(file => /\\bnotify\\b/.test(readFileSync(file, 'utf8')) ? [path.relative(process.cwd(), file)] : []);\n  assert.deepEqual(violations, []);\n});\n\ntest('OperationFeedback supports migrated application feedback payloads', () => {\n  const source = readFileSync(path.join(root, 'shared/ui/OperationFeedback.ts'), 'utf8');\n  assert.match(source, /from: \\(data: unknown, error = false\\)/);\n  assert.match(source, /record\\?\\.type/);\n});\n`);

const packagePath = path.join(projectRoot, 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const contract = 'src/shared/ui/ApplicationNotifyMigration.test.mjs';
if (!pkg.scripts['test:feedback'].includes(contract)) {
  pkg.scripts['test:feedback'] = pkg.scripts['test:feedback'].replace('node --test ', `node --test ${contract} `);
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
}

const residual = walk(srcRoot).flatMap(file => /\bnotify\b/.test(readFileSync(file, 'utf8')) ? [path.relative(projectRoot, file)] : []);
if (residual.length) {
  console.error('Legacy notify identifiers remain:', residual.join('\n'));
  process.exit(1);
}
console.log(`Migrated ${changedFiles} source files; application notify residual is 0.`);
