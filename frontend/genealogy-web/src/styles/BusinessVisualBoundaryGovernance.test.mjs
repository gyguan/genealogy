import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('src');
const read = file => readFileSync(path.join(root, file), 'utf8');

const boundaryFiles = {
  auth: ['auth-commercial.css'],
  culture: ['features/culture/culture.css'],
  tree: [
    'features/tree/lineage-workbench-issue376.css',
    'features/tree/lineage-double-card.css',
    'features/tree/lineage-tabbed-page.css'
  ]
};

function assertFeatureScoped(file, source) {
  assert.doesNotMatch(source, /(^|[,{])\s*(?:html|body|#root)\b/m, `${file} must not leak outside its feature root`);
  assert.doesNotMatch(source, /\.ant-[a-z0-9-]+/i, `${file} must not depend on Ant Design internal DOM`);
  assert.doesNotMatch(source, /!important/, `${file} must not use important overrides`);
  assert.doesNotMatch(source, /\border\s*:/, `${file} must not reorder standard component DOM`);
}

test('Issue #945 business visual styles stay inside stable feature boundaries', () => {
  for (const files of Object.values(boundaryFiles)) {
    for (const file of files) assertFeatureScoped(file, read(file));
  }
});

test('authentication uses Ant Design Layout Card Form Input Button and governed feedback', () => {
  const source = read('features/auth/AuthPage.tsx');
  for (const component of ['Layout', 'Card', 'Form', 'Input', 'Button']) {
    assert.match(source, new RegExp(`\\b${component}\\b`), `AuthPage must use Ant Design ${component}`);
  }
  assert.match(source, /<Layout className="commercial-auth-layout">/);
  assert.match(source, /<Layout\.Sider className="commercial-auth-brand"/);
  assert.match(source, /<Layout\.Content className="commercial-auth-panel"/);
  assert.match(source, /<Card className="commercial-auth-card" bordered=\{false\}>/);
  assert.match(source, /PageFeedback/);
});

test('culture custom CSS is limited to content media history and outer feature layout', () => {
  const source = read('features/culture/culture.css');
  assert.match(source, /\.culture-detail-content/);
  assert.match(source, /\.culture-editor-page/);
  assert.match(source, /\.culture-product-page/);
  assert.doesNotMatch(source, /table|drawer-body|card-head|tabs-nav|form-item/i);
});

test('lineage custom CSS keeps graph and feature layout classes without standard component internals', () => {
  const combined = boundaryFiles.tree.map(read).join('\n');
  assert.match(combined, /lineage-graph/);
  assert.match(combined, /lineage-query/);
  assert.match(combined, /lineage-inspector/);
  assert.doesNotMatch(combined, /card-head|form-item|tabs-nav|select-selector|drawer-body|ant-btn/i);
});
