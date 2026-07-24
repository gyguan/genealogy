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

function cleanAntdImport(source) {
  return source.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]antd['"];?/g, (full, body) => {
    const names = body
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .filter(item => item !== 'message');
    if (!names.length) return '';
    if (!body.includes('\n')) return `import { ${names.join(', ')} } from 'antd';`;
    return `import {\n  ${names.join(',\n  ')}\n} from 'antd';`;
  });
}

function cleanAppUseApp(source) {
  return source.replace(/const\s*\{([^}]*)\}\s*=\s*App\.useApp\(\);?/g, (full, body) => {
    const names = body.split(',').map(item => item.trim()).filter(Boolean).filter(item => item !== 'message');
    return names.length ? `const { ${names.join(', ')} } = App.useApp();` : '';
  });
}

function removeUnusedAppImport(source) {
  if (/\bApp\b/.test(source.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"]antd['"];?/g, ''))) return source;
  return source.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]antd['"];?/g, (full, body) => {
    const names = body.split(',').map(item => item.trim()).filter(Boolean).filter(item => item !== 'App');
    if (!names.length) return '';
    if (!body.includes('\n')) return `import { ${names.join(', ')} } from 'antd';`;
    return `import {\n  ${names.join(',\n  ')}\n} from 'antd';`;
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

for (const file of walk(sourceRoot)) {
  if (file === `${operationFeedback}.ts` || file === `${operationFeedback}.tsx`) continue;
  const original = readFileSync(file, 'utf8');
  const callPattern = /\b(message|messageApi)\.(success|info|warning|error|loading)\s*\(/g;
  const matches = [...original.matchAll(callPattern)];
  if (!matches.length) continue;

  let source = original;
  source = source.replace(/const\s*\[\s*messageApi\s*,\s*contextHolder\s*\]\s*=\s*message\.useMessage\(\);?/g, '');
  source = source.replace(/\{\s*contextHolder\s*\}/g, '');
  source = source.replace(callPattern, (_full, _receiver, method) => {
    replacedCalls += 1;
    return `feedback.${method === 'loading' ? 'info' : method}(`;
  });
  source = cleanAppUseApp(source);
  source = cleanAntdImport(source);
  source = removeUnusedAppImport(source);
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
  const matches = [...source.matchAll(/\b(message|messageApi)\.(success|info|warning|error|loading)\s*\(/g)];
  return matches.map(match => `${path.relative(projectRoot, file)}:${match.index}`);
});

if (remaining.length) {
  console.error('Direct Ant Design Message calls remain:');
  remaining.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Migrated ${replacedCalls} calls across ${changedFiles} files.`);
