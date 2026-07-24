import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'src');
const wrapper = path.join(srcRoot, 'shared/ui/EmptyState.tsx');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function removeEmptyFromAntdImport(source) {
  return source.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]antd['"];?/g, (full, body) => {
    const names = body.split(',').map(item => item.trim()).filter(Boolean).filter(item => item !== 'Empty');
    if (names.length === 0) return '';
    return `import { ${names.join(', ')} } from 'antd';`;
  });
}

function relativeImport(file) {
  let rel = path.relative(path.dirname(file), wrapper).replace(/\\/g, '/').replace(/\.tsx$/, '');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

let changedFiles = 0;
let replacements = 0;
for (const file of walk(srcRoot)) {
  if (file === wrapper || /\.test\.|\.spec\./.test(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  const before = source;
  const count = (source.match(/<\/?Empty\b/g) || []).length + (source.match(/\bEmpty\.PRESENTED_IMAGE_(?:SIMPLE|DEFAULT)\b/g) || []).length;
  if (!count) continue;

  source = source.replace(/<Empty\b/g, '<EmptyState');
  source = source.replace(/<\/Empty>/g, '</EmptyState>');
  source = source.replace(/\bEmpty\.PRESENTED_IMAGE_(SIMPLE|DEFAULT)\b/g, 'EmptyState.PRESENTED_IMAGE_$1');
  source = removeEmptyFromAntdImport(source);

  if (!/from\s*['"][^'"]*EmptyState['"]/.test(source)) {
    const importLine = `import { EmptyState } from '${relativeImport(file)}';\n`;
    const lastImport = [...source.matchAll(/^import[\s\S]*?;\s*$/gm)].at(-1);
    if (lastImport) {
      const index = lastImport.index + lastImport[0].length;
      source = `${source.slice(0, index)}\n${importLine}${source.slice(index)}`;
    } else {
      source = `${importLine}${source}`;
    }
  }

  if (source !== before) {
    fs.writeFileSync(file, source);
    changedFiles += 1;
    replacements += count;
  }
}

const baselinePath = path.join(root, 'feedback-audit-baseline.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
baseline.maxCounts.empty_state = 0;
fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);

const testPath = path.join(srcRoot, 'shared/ui/EmptyStateMigration.test.mjs');
fs.writeFileSync(testPath, `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\nconst src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');\nfunction walk(dir) {\n  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {\n    const full = path.join(dir, entry.name);\n    if (entry.isDirectory()) return walk(full);\n    return entry.isFile() && /\\.tsx?$/.test(entry.name) ? [full] : [];\n  });\n}\n\ntest('business source uses unified EmptyState instead of Ant Design Empty', () => {\n  const violations = [];\n  for (const file of walk(src)) {\n    if (file.endsWith('shared/ui/EmptyState.tsx') || /\\.test\\.|\\.spec\\./.test(file)) continue;\n    const source = fs.readFileSync(file, 'utf8');\n    if (/<Empty\\b/.test(source) || /\\bEmpty\\.PRESENTED_IMAGE_/.test(source) || /import\\s*\\{[\\s\\S]*?\\bEmpty\\b[\\s\\S]*?\\}\\s*from\\s*['\"]antd['\"]/.test(source)) {\n      violations.push(path.relative(src, file));\n    }\n  }\n  assert.deepEqual(violations, []);\n});\n`);

const packagePath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (!pkg.scripts['test:feedback'].includes('EmptyStateMigration.test.mjs')) {
  pkg.scripts['test:feedback'] = pkg.scripts['test:feedback'].replace('node --test ', 'node --test src/shared/ui/EmptyStateMigration.test.mjs ');
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

const residual = [];
for (const file of walk(srcRoot)) {
  if (file === wrapper || /\.test\.|\.spec\./.test(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (/<Empty\b/.test(source) || /\bEmpty\.PRESENTED_IMAGE_/.test(source)) residual.push(path.relative(srcRoot, file));
}
if (residual.length) {
  console.error('Empty residuals remain:', residual.join('\n'));
  process.exit(1);
}
console.log(`Migrated ${replacements} Empty references across ${changedFiles} files.`);
