import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const targets = ["features/sources/SourceLibraryPage.tsx","features/sources/SourceLibraryQueryPage.tsx","features/members/MemberPage.tsx","app/App.tsx","features/imports/AsyncImportExecutionPanel.tsx","features/home/UnifiedStatisticsHomePage.tsx","features/reviews/ReviewCenterPageContent.tsx"];

test('large pages no longer use warning or danger text as status feedback', () => {
  const violations = [];
  for (const relative of targets) {
    const file = path.join(src, relative);
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (/<(?:Typography\.Text|Text)\b[^>]*\btype\s*=\s*['"](?:warning|danger)['"]/.test(source)) violations.push(relative);
  }
  assert.deepEqual(violations, []);
});

test('large pages use standard feedback primitives for persistent status', () => {
  const combined = targets.map(relative => {
    const file = path.join(src, relative);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  }).join('\n');
  assert.match(combined, /InlineFeedback|PageFeedback/);
});
