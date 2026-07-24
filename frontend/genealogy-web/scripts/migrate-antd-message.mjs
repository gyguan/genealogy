import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, 'src');
const operationFeedback = path.join(sourceRoot, 'shared/ui/OperationFeedback');
const extensions = new Set(['.ts', '.tsx']);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!extensions.has(path.extname(entry.name))) return [];
    if (entry.name.includes('.test.') || entry.name.includes('.spec.')) return [];
    return [fullPath];
  });
}

function feedbackImportPath(file) {
  let relative = path.relative(path.dirname(file), operationFeedback).replaceAll(path.sep, '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

function rewriteAntdImport(source, excluded) {
  return source.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]antd['"];?/g, (_full, body) => {
    const names = body.split(',').map(item => item.trim()).filter(Boolean).filter(item => !excluded.has(item));
    if (!names.length) return '';
    if (!body.includes('\n')) return `import { ${names.join(', ')} } from 'antd';`;
    return `import {\n  ${names.join(',\n  ')}\n} from 'antd';`;
  });
}

function cleanAppUseApp(source) {
  return source.replace(/const\s*\{([^}]*)\}\s*=\s*App\.useApp\(\);?/g, (_full, body) => {
    const names = body.split(',').map(item => item.trim()).filter(Boolean).filter(item => item !== 'message');
    return names.length ? `const { ${names.join(', ')} } = App.useApp();` : '';
  });
}

function addFeedbackImport(source, file) {
  if (/from\s*['"][^'"]*OperationFeedback['"]/.test(source)) return source;
  const importLine = `import { feedback } from '${feedbackImportPath(file)}';\n`;
  const imports = [...source.matchAll(/^import[\s\S]*?;\s*$/gm)];
  if (!imports.length) return `${importLine}${source}`;
  const last = imports.at(-1);
  const position = last.index + last[0].length;
  return `${source.slice(0, position)}\n${importLine}${source.slice(position)}`;
}

let changedFiles = 0;
let replacedCalls = 0;
const callPattern = /\b(message|messageApi)\.(success|info|warning|error|loading)\s*\(/g;

for (const file of walk(sourceRoot)) {
  if (file === `${operationFeedback}.ts` || file === `${operationFeedback}.tsx`) continue;
  const original = readFileSync(file, 'utf8');
  if (![...original.matchAll(callPattern)].length) continue;

  let source = original;
  source = source.replace(/const\s*\[\s*messageApi\s*,\s*contextHolder\s*\]\s*=\s*message\.useMessage\(\);?/g, '');
  source = source.replace(/\{\s*contextHolder\s*\}/g, '');
  source = source.replace(callPattern, (_full, _receiver, method) => {
    replacedCalls += 1;
    return `feedback.${method === 'loading' ? 'info' : method}(`;
  });
  source = cleanAppUseApp(source);
  source = rewriteAntdImport(source, new Set(['message']));
  const withoutImports = source.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"]antd['"];?/g, '');
  if (!/\bApp\b/.test(withoutImports)) source = rewriteAntdImport(source, new Set(['App']));
  source = addFeedbackImport(source, file);
  source = source.replace(/\n{3,}/g, '\n\n');

  if (source !== original) {
    writeFileSync(file, source);
    changedFiles += 1;
  }
}

const remaining = walk(sourceRoot).flatMap(file => {
  if (file === `${operationFeedback}.ts` || file === `${operationFeedback}.tsx`) return [];
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(callPattern)].map(match => `${path.relative(projectRoot, file)}:${match.index}`);
});
if (remaining.length) {
  console.error('Direct Ant Design Message calls remain:');
  remaining.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

const baselinePath = path.join(projectRoot, 'feedback-audit-baseline.json');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
baseline.maxCounts = { ...baseline.maxCounts, antd_message: 0 };
writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);

const contractPath = path.join(sourceRoot, 'shared/ui/AntdMessageMigration.test.mjs');
writeFileSync(contractPath, `import assert from 'node:assert/strict';\nimport { readdirSync, readFileSync } from 'node:fs';\nimport path from 'node:path';\nimport test from 'node:test';\n\nconst root = path.resolve(process.cwd(), 'src');\nconst excluded = ['OperationFeedback.ts', '.test.', '.spec.'];\nfunction walk(directory) {\n  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {\n    const file = path.join(directory, entry.name);\n    if (entry.isDirectory()) return walk(file);\n    if (!/\\.(ts|tsx)$/.test(entry.name) || excluded.some(token => file.includes(token))) return [];\n    return [file];\n  });\n}\n\ntest('business source contains no direct Ant Design Message calls', () => {\n  const violations = walk(root).flatMap(file => {\n    const source = readFileSync(file, 'utf8');\n    return /\\b(message|messageApi)\\.(success|info|warning|error|loading)\\s*\\(/.test(source)\n      ? [path.relative(process.cwd(), file)]\n      : [];\n  });\n  assert.deepEqual(violations, []);\n});\n`);

const packagePath = path.join(projectRoot, 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const contract = 'src/shared/ui/AntdMessageMigration.test.mjs';
if (!pkg.scripts['test:feedback'].includes(contract)) {
  pkg.scripts['test:feedback'] = pkg.scripts['test:feedback'].replace('node --test ', `node --test ${contract} `);
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
}

console.log(`Migrated ${replacedCalls} calls across ${changedFiles} files.`);
