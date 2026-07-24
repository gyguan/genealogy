import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const semanticTargets = ["features/culture/CultureItemStandardTab.tsx","features/culture/CultureSiteStandardTab.tsx","features/culture/MigrationEventStandardTab.tsx","features/imports/StandardImportWorkspace.tsx","features/tree/LineageTreeTabbedPage.tsx"];
const resultAllowlist = {
  "features/logs/TrackingTraceDetailPage.tsx": 4,
  "features/culture/CultureItemStandardTab.tsx": 3,
  "features/culture/CultureSiteStandardTab.tsx": 3,
  "features/culture/MigrationEventStandardTab.tsx": 3,
  "features/logs/LogPage.tsx": 3,
  "features/reviews/ReviewCenterPageContent.tsx": 3,
  "features/sources/SourceLibraryPage.tsx": 3,
  "features/sources/SourceLibraryQueryPage.tsx": 3,
  "features/culture/CultureItemEditorPage.tsx": 2,
  "features/culture/CultureSiteEditorPage.tsx": 2,
  "features/culture/MigrationEventEditorPage.tsx": 2,
  "features/persons/PersonArchiveSearchPage.tsx": 2,
  "prototypes/PagePatternsPrototype.tsx": 2,
  "features/culture/CultureSiteMaintenanceTab.tsx": 1,
  "features/culture/CultureSiteTab.tsx": 1,
  "features/culture/MigrationEventMaintenanceTab.tsx": 1,
  "features/culture/MigrationEventTab.tsx": 1,
  "features/logs/RiskAuditPanel.tsx": 1,
  "features/mvp1/steps/review/WizardSummaryStep.tsx": 1,
  "features/persons/PersonDetailPage.tsx": 1
};

function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => { const full = path.join(dir, entry.name); if (entry.isDirectory()) return walk(full); return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : []; }); }

test('semantic warning and danger text is fully migrated', () => { const violations = []; for (const relative of semanticTargets) { const source = fs.readFileSync(path.join(src, relative), 'utf8'); if (/<(?:Typography\.Text|Text)\b[^>]*\btype\s*=\s*['"](?:warning|danger)['"]/.test(source)) violations.push(relative); } assert.deepEqual(violations, []); });

test('custom status classes are not used as feedback containers', () => { const violations = []; const token = /(?:^|[\s_-])(notice|warning|alert|feedback|message|error)(?:$|[\s_-])/i; for (const file of walk(src)) { if (/\.test\.|\.spec\./.test(file)) continue; const source = fs.readFileSync(file, 'utf8'); for (const match of source.matchAll(/className\s*=\s*['"]([^'"]*)['"]/gi)) { if (token.test(match[1])) violations.push(path.relative(src, file) + ':' + match[1]); } } assert.deepEqual(violations, []); });

test('Result is restricted to reviewed full-page status locations', () => { const actual = {}; for (const file of walk(src)) { if (/\.test\.|\.spec\./.test(file) || file.endsWith('shared/ui/Feedback.tsx')) continue; const source = fs.readFileSync(file, 'utf8'); const count = (source.match(/<Result\b/g) || []).length; if (count) actual[path.relative(src, file).replaceAll('\\', '/')] = count; } assert.deepEqual(actual, resultAllowlist); });
