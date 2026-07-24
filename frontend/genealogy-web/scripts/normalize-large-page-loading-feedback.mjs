import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const targets = [
  'features/sources/SourceLibraryPage.tsx',
  'features/sources/SourceLibraryQueryPage.tsx',
  'features/members/MemberPage.tsx',
  'app/App.tsx'
];

function mergeFeedbackImports(source) {
  const matches = [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*\/shared\/ui\/Feedback|\.\/Feedback)['"];?\s*/g)];
  if (matches.length <= 1) return source;
  const symbols = new Set();
  const importPath = matches[0][2];
  for (const match of matches) match[1].split(',').map(v => v.trim()).filter(Boolean).forEach(v => symbols.add(v));
  let next = source;
  for (const match of [...matches].reverse()) next = next.slice(0, match.index) + next.slice(match.index + match[0].length);
  const insertion = `import { ${[...symbols].sort().join(', ')} } from '${importPath}';\n`;
  const imports = [...next.matchAll(/^import[\s\S]*?;\s*$/gm)];
  const last = imports.at(-1);
  return last ? `${next.slice(0, last.index + last[0].length)}\n${insertion}${next.slice(last.index + last[0].length)}` : insertion + next;
}

function ensureInlineFeedback(source, file) {
  if (/import\s*\{[^}]*\bInlineFeedback\b[^}]*\}\s*from\s*['"][^'"]*Feedback['"]/.test(source)) return source;
  const feedbackFile = path.join(src, 'shared/ui/Feedback.tsx');
  let rel = path.relative(path.dirname(file), feedbackFile).replace(/\\/g, '/').replace(/\.tsx$/, '');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  const imports = [...source.matchAll(/^import[\s\S]*?;\s*$/gm)];
  const last = imports.at(-1);
  const line = `import { InlineFeedback } from '${rel}';\n`;
  return last ? `${source.slice(0, last.index + last[0].length)}\n${line}${source.slice(last.index + last[0].length)}` : line + source;
}

let changed = 0;
for (const relative of targets) {
  const file = path.join(src, relative);
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  const before = source;
  source = source.replace(/<Text\s+type=['"]secondary['"]>([^<]*(?:正在|加载中|处理中)[^<]*)<\/Text>/g, (_m, text) => `<InlineFeedback tone="info" title="${text.trim()}" />`);
  source = source.replace(/<Typography\.Text\s+type=['"]secondary['"]>([^<]*(?:正在|加载中|处理中)[^<]*)<\/Typography\.Text>/g, (_m, text) => `<InlineFeedback tone="info" title="${text.trim()}" />`);
  if (!/<Alert\b/.test(source)) {
    source = source.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]antd['"];?/g, (full, body) => {
      const names = body.split(',').map(v => v.trim()).filter(Boolean).filter(v => v !== 'Alert');
      return `import { ${names.join(', ')} } from 'antd';`;
    });
  }
  source = mergeFeedbackImports(source);
  if (source !== before) {
    if (source.includes('<InlineFeedback')) source = ensureInlineFeedback(source, file);
    source = mergeFeedbackImports(source);
    fs.writeFileSync(file, source);
    changed += 1;
  }
}

const testPath = path.join(src, 'shared/ui/LargePageFeedbackMigration.test.mjs');
let test = fs.readFileSync(testPath, 'utf8');
if (!test.includes('loading states use standard inline feedback')) {
  test += `\n\ntest('loading states use standard inline feedback on large pages', () => {\n  const violations = [];\n  for (const relative of targets) {\n    const file = path.join(src, relative);\n    if (!fs.existsSync(file)) continue;\n    const source = fs.readFileSync(file, 'utf8');\n    if (/<(?:Typography\\.Text|Text)\\s+type=['\"]secondary['\"]>[^<]*(?:正在|加载中|处理中)/.test(source)) violations.push(relative);\n  }\n  assert.deepEqual(violations, []);\n});\n`;
  fs.writeFileSync(testPath, test);
}
console.log(`Normalized ${changed} large pages.`);
