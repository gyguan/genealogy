import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(new URL('./Feedback.tsx', import.meta.url), 'utf8');
const toastStack = readFileSync(new URL('./ToastStack.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../feedback-system.css', import.meta.url), 'utf8');
const audit = readFileSync(new URL('../../../scripts/audit-ui-feedback.mjs', import.meta.url), 'utf8');
const baseline = JSON.parse(readFileSync(new URL('../../../feedback-audit-baseline.json', import.meta.url), 'utf8'));
const spec = readFileSync(new URL('../../../../../docs/22-frontend-feedback-pattern-spec.md', import.meta.url), 'utf8');

test('feedback system exposes five standard user-facing forms', () => {
  assert.match(component, /export function PageFeedback/);
  assert.match(component, /export function InlineFeedback/);
  assert.match(component, /export function EmptyState/);
  assert.match(component, /export function FullPageFeedback/);
  assert.match(component, /export function ConfirmAction/);
  assert.match(spec, /统一后的五种形式/);
  assert.match(spec, /页面\/区块状态/);
  assert.match(spec, /字段辅助与校验/);
  assert.match(spec, /短暂操作反馈/);
  assert.match(spec, /高风险确认/);
  assert.match(spec, /空状态/);
});

test('global toast uses the same semantic feedback primitive', () => {
  assert.match(toastStack, /PageFeedback/);
  assert.match(toastStack, /variant="toast"/);
  assert.doesNotMatch(toastStack, /<Alert\b/);
  assert.match(toastStack, /FeedbackTone/);
});

test('feedback styling normalizes alerts, field help, empty states and full-page results', () => {
  assert.match(css, /\.business-page \.ant-alert/);
  assert.match(css, /\.business-page \.ant-form-item-extra/);
  assert.match(css, /\.business-page \.ant-empty/);
  assert.match(css, /\.business-page > \.ant-result/);
  assert.match(css, /\.ant-popconfirm \.ant-popconfirm-message-title/);
  assert.match(css, /border-radius:\s*8px/);
});

test('audit gate prevents legacy feedback mechanisms from increasing', () => {
  assert.equal(baseline.version, 1);
  assert.equal(baseline.maxCounts.page_alert, 180);
  assert.equal(baseline.maxCounts.antd_message, 109);
  assert.equal(baseline.maxCounts.custom_notice_class, 33);
  assert.match(audit, /--baseline/);
  assert.match(audit, /regressions\.length/);
  assert.match(audit, /process\.exitCode = 1/);
  assert.match(audit, /canonicalImplementationFiles/);
});
