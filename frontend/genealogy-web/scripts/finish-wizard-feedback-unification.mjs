import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');
const relativeTargets = [
  'features/mvp1/steps/generation/GenerationStep.tsx',
  'features/mvp1/steps/person/PersonStep.tsx',
  'features/mvp1/steps/relationship/RelationshipStep.tsx'
];
const rendererRelative = 'features/mvp1/StepRenderer.tsx';

function writeChanged(relative, transform) {
  const file = path.join(srcRoot, relative);
  const original = readFileSync(file, 'utf8');
  const next = transform(original);
  if (next === original) return false;
  writeFileSync(file, next);
  return true;
}

let changed = 0;
for (const relative of relativeTargets) {
  if (writeChanged(relative, source => source
    .replace(/\n\s*notify\?: \(data: unknown, error\?: boolean\) => void;/, '')
    .replace(/export function (GenerationStep|PersonStep|RelationshipStep)\(\{ notify, onSubmittedReview \}: Props\)/, 'export function $1({ onSubmittedReview }: Props)')
    .replace(/\n\s*notify\?\.\(data, error\);/, ''))) changed += 1;
}

if (writeChanged(rendererRelative, source => source
  .replace(/\n\s*notify: \(data: unknown, error\?: boolean\) => void;/, '')
  .replace('export function StepRenderer({ activeStep, notify, onStepChange, onSubmittedReview }: StepRendererProps)', 'export function StepRenderer({ activeStep, onStepChange, onSubmittedReview }: StepRendererProps)')
  .replace('<GenerationStep notify={notify} onSubmittedReview={onSubmittedReview} />', '<GenerationStep onSubmittedReview={onSubmittedReview} />')
  .replace('<PersonStep notify={notify} onSubmittedReview={onSubmittedReview} />', '<PersonStep onSubmittedReview={onSubmittedReview} />')
  .replace('<RelationshipStep notify={notify} onSubmittedReview={onSubmittedReview} />', '<RelationshipStep onSubmittedReview={onSubmittedReview} />'))) changed += 1;

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(file);
    return /\.(ts|tsx)$/.test(entry.name) ? [file] : [];
  });
}

for (const file of walk(srcRoot)) {
  const original = readFileSync(file, 'utf8');
  if (!original.includes('<StepRenderer')) continue;
  const next = original.replace(/(<StepRenderer\b[\s\S]*?)\s+notify=\{notify\}/g, '$1');
  if (next !== original) {
    writeFileSync(file, next);
    changed += 1;
  }
}

const legacyContractPath = path.join(srcRoot, 'features/mvp1/StepRendererFeedback.test.mjs');
writeFileSync(legacyContractPath, `import assert from 'node:assert/strict';\nimport { readFileSync } from 'node:fs';\nimport test from 'node:test';\n\nconst source = readFileSync(new URL('./StepRenderer.tsx', import.meta.url), 'utf8');\n\ntest('step renderer no longer passes legacy notify to any wizard step', () => {\n  assert.match(source, /<ClanStep onCreated=/);\n  assert.match(source, /<BranchStep onSubmittedReview=/);\n  assert.match(source, /<GenerationStep onSubmittedReview=/);\n  assert.match(source, /<PersonStep onSubmittedReview=/);\n  assert.match(source, /<RelationshipStep onSubmittedReview=/);\n  assert.match(source, /<SourceStageStep onSubmittedReview=/);\n  assert.doesNotMatch(source, /notify/);\n});\n`);

const contractPath = path.join(srcRoot, 'features/mvp1/WizardRemainingStepsFeedback.test.mjs');
writeFileSync(contractPath, `import assert from 'node:assert/strict';\nimport { readdirSync, readFileSync } from 'node:fs';\nimport path from 'node:path';\nimport test from 'node:test';\n\nconst root = path.resolve(process.cwd(), 'src');\nconst files = [\n  'features/mvp1/StepRenderer.tsx',\n  'features/mvp1/steps/generation/GenerationStep.tsx',\n  'features/mvp1/steps/person/PersonStep.tsx',\n  'features/mvp1/steps/relationship/RelationshipStep.tsx'\n];\n\nfunction read(relative) {\n  return readFileSync(path.join(root, relative), 'utf8');\n}\nfunction walk(directory) {\n  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {\n    const file = path.join(directory, entry.name);\n    if (entry.isDirectory()) return walk(file);\n    return /\\.(ts|tsx)$/.test(entry.name) ? [file] : [];\n  });\n}\n\ntest('remaining wizard steps use only OperationFeedback', () => {\n  for (const relative of files.slice(1)) {\n    const source = read(relative);\n    assert.match(source, /OperationFeedback/);\n    assert.match(source, /feedback\\.(success|error|warning|info)/);\n    assert.doesNotMatch(source, /notify\\??:|notify\\?\\.|\\{ notify,/);\n  }\n});\n\ntest('StepRenderer and callers no longer pass notify', () => {\n  const renderer = read(files[0]);\n  assert.doesNotMatch(renderer, /notify/);\n  const violations = walk(root).flatMap(file => {\n    const source = readFileSync(file, 'utf8');\n    return source.includes('<StepRenderer') && /<StepRenderer\\b[\\s\\S]*?notify=/.test(source)\n      ? [path.relative(process.cwd(), file)]\n      : [];\n  });\n  assert.deepEqual(violations, []);\n});\n`);

const packagePath = path.join(projectRoot, 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const contract = 'src/features/mvp1/WizardRemainingStepsFeedback.test.mjs';
if (!pkg.scripts['test:feedback'].includes(contract)) {
  pkg.scripts['test:feedback'] = pkg.scripts['test:feedback'].replace('node --test ', `node --test ${contract} `);
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
}

const remaining = relativeTargets.flatMap(relative => {
  const source = readFileSync(path.join(srcRoot, relative), 'utf8');
  return /notify\??:|notify\?\.|\{ notify,/.test(source) ? [relative] : [];
});
const renderer = readFileSync(path.join(srcRoot, rendererRelative), 'utf8');
if (/notify/.test(renderer) || remaining.length) {
  console.error('Wizard notify cleanup incomplete:', [...remaining, rendererRelative]);
  process.exit(1);
}
console.log(`Updated ${changed} wizard source files and added feedback contract.`);
