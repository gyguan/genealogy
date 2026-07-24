import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(file);
    if (!entry.name.endsWith('.tsx') || /\.test\.|\.spec\./.test(entry.name) || file.includes(`${path.sep}generated${path.sep}`)) return [];
    if (file.endsWith(`${path.sep}shared${path.sep}ui${path.sep}Feedback.tsx`)) return [];
    return [file];
  });
}

function transformOpeningTags(source) {
  let result = '';
  let cursor = 0;
  let count = 0;
  while (true) {
    const start = source.indexOf('<Alert', cursor);
    if (start < 0) break;
    result += source.slice(cursor, start);
    let index = start + '<Alert'.length;
    let quote = '';
    let braceDepth = 0;
    for (; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (char === quote && source[index - 1] !== '\\') quote = '';
        continue;
      }
      if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
      if (char === '{') { braceDepth += 1; continue; }
      if (char === '}') { braceDepth = Math.max(0, braceDepth - 1); continue; }
      if (char === '>' && braceDepth === 0) break;
    }
    if (index >= source.length) throw new Error(`Unterminated Alert tag near offset ${start}`);
    let tag = source.slice(start, index + 1)
      .replace(/^<Alert/, '<PageFeedback')
      .replace(/\btype\s*=/g, 'tone=')
      .replace(/\bmessage\s*=/g, 'title=')
      .replace(/\s+showIcon(?=\s|\/?>)/g, '')
      .replace(/\s+banner(?=\s|\/?>)/g, ' variant="inline"');
    result += tag;
    cursor = index + 1;
    count += 1;
  }
  result += source.slice(cursor);
  return { source: result.replace(/<\/Alert>/g, '</PageFeedback>'), count };
}

function cleanAntdAlertImport(source) {
  return source.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]antd['"];?/g, (full, body) => {
    const parts = body.split(',').map(item => item.trim()).filter(Boolean).filter(item => item !== 'Alert');
    if (parts.length === 0) return '';
    const multiline = body.includes('\n');
    return multiline
      ? `import {\n  ${parts.join(',\n  ')}\n} from 'antd';`
      : `import { ${parts.join(', ')} } from 'antd';`;
  });
}

function ensureFeedbackImport(source, file) {
  const target = path.join(srcRoot, 'shared/ui/Feedback').replaceAll(path.sep, '/');
  let relative = path.relative(path.dirname(file), target).replaceAll(path.sep, '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  const escaped = relative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const importPattern = new RegExp(`import\\s*\\{([\\s\\S]*?)\\}\\s*from\\s*['"]${escaped}['"];?`);
  const match = source.match(importPattern);
  if (match) {
    const names = match[1].split(',').map(item => item.trim()).filter(Boolean);
    if (!names.includes('PageFeedback')) names.push('PageFeedback');
    return source.replace(importPattern, `import { ${names.join(', ')} } from '${relative}';`);
  }
  const imports = [...source.matchAll(/^import[\s\S]*?;\s*$/gm)];
  const line = `import { PageFeedback } from '${relative}';\n`;
  if (!imports.length) return line + source;
  const last = imports.at(-1);
  return source.slice(0, last.index + last[0].length) + '\n' + line + source.slice(last.index + last[0].length);
}

let changedFiles = 0;
let migratedTags = 0;
for (const file of walk(srcRoot)) {
  const original = readFileSync(file, 'utf8');
  if (!original.includes('<Alert')) continue;
  const transformed = transformOpeningTags(original);
  let next = cleanAntdAlertImport(transformed.source);
  next = ensureFeedbackImport(next, file);
  writeFileSync(file, next);
  changedFiles += 1;
  migratedTags += transformed.count;
}

const feedbackPath = path.join(srcRoot, 'shared/ui/Feedback.tsx');
let feedback = readFileSync(feedbackPath, 'utf8');
feedback = feedback
  .replace("export type PageFeedbackProps = {", "export type PageFeedbackProps = Omit<AlertProps, 'type' | 'message' | 'description' | 'action' | 'showIcon'> & {")
  .replace("  onClose\n}: PageFeedbackProps) {", "  onClose,\n  ...alertProps\n}: PageFeedbackProps) {")
  .replace("    <Alert\n      className=", "    <Alert\n      {...alertProps}\n      className=");
writeFileSync(feedbackPath, feedback);

const baselinePath = path.join(projectRoot, 'feedback-audit-baseline.json');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
baseline.maxCounts.page_alert = 0;
writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);

const feedbackContractPath = path.join(srcRoot, 'shared/ui/FeedbackUnification.test.mjs');
let contract = readFileSync(feedbackContractPath, 'utf8').replace('baseline.maxCounts.page_alert, 158', 'baseline.maxCounts.page_alert, 0');
writeFileSync(feedbackContractPath, contract);

const guardPath = path.join(srcRoot, 'shared/ui/PageAlertMigration.test.mjs');
writeFileSync(guardPath, `import assert from 'node:assert/strict';\nimport { readdirSync, readFileSync } from 'node:fs';\nimport path from 'node:path';\nimport test from 'node:test';\n\nconst root = path.resolve(process.cwd(), 'src');\nfunction walk(directory) {\n  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {\n    const file = path.join(directory, entry.name);\n    if (entry.isDirectory()) return walk(file);\n    if (!/\\.(ts|tsx)$/.test(entry.name) || /\\.test\\.|\\.spec\\./.test(entry.name) || file.includes(path.sep + 'generated' + path.sep) || file.endsWith(path.join('shared', 'ui', 'Feedback.tsx'))) return [];\n    return [file];\n  });\n}\n\ntest('business source no longer renders Ant Design Alert directly', () => {\n  const violations = walk(root).flatMap(file => /<Alert\\b/.test(readFileSync(file, 'utf8')) ? [path.relative(process.cwd(), file)] : []);\n  assert.deepEqual(violations, []);\n});\n\ntest('page alert audit baseline remains zero', () => {\n  const baseline = JSON.parse(readFileSync(path.resolve(process.cwd(), 'feedback-audit-baseline.json'), 'utf8'));\n  assert.equal(baseline.maxCounts.page_alert, 0);\n});\n`);

const packagePath = path.join(projectRoot, 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const guard = 'src/shared/ui/PageAlertMigration.test.mjs';
if (!pkg.scripts['test:feedback'].includes(guard)) pkg.scripts['test:feedback'] = pkg.scripts['test:feedback'].replace('node --test ', `node --test ${guard} `);
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

const residual = walk(srcRoot).flatMap(file => readFileSync(file, 'utf8').includes('<Alert') ? [path.relative(projectRoot, file)] : []);
if (residual.length) throw new Error(`Alert residuals remain:\n${residual.join('\n')}`);
console.log(`Migrated ${migratedTags} Alert tags across ${changedFiles} files; residual is 0.`);
