import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(new URL('./Feedback.tsx', import.meta.url), 'utf8');
const operationFeedback = readFileSync(new URL('./OperationFeedback.ts', import.meta.url), 'utf8');
const toastStack = readFileSync(new URL('./ToastStack.tsx', import.meta.url), 'utf8');
const draftDeleteButton = readFileSync(new URL('./DraftDeleteButton.tsx', import.meta.url), 'utf8');
const asyncImportExecutionPanel = readFileSync(new URL('../../features/imports/AsyncImportExecutionPanel.tsx', import.meta.url), 'utf8');
const clanStep = readFileSync(new URL('../../features/mvp1/steps/clan/ClanStep.tsx', import.meta.url), 'utf8');
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

test('operation feedback exposes one semantic API for transient results', () => {
  assert.match(operationFeedback, /export const feedback/);
  assert.match(operationFeedback, /success:/);
  assert.match(operationFeedback, /info:/);
  assert.match(operationFeedback, /warning:/);
  assert.match(operationFeedback, /error:/);
  assert.match(operationFeedback, /message\.open/);
  assert.doesNotMatch(draftDeleteButton, /message\.useMessage|messageApi\./);
  assert.match(draftDeleteButton, /feedback\.success/);
  assert.match(draftDeleteButton, /feedback\.error/);
});

test('global toast uses the same semantic feedback primitive', () => {
  assert.match(toastStack, /PageFeedback/);
  assert.match(toastStack, /variant="toast"/);
  assert.doesNotMatch(toastStack, /<Alert\b/);
  assert.match(toastStack, /FeedbackTone/);
});

test('async import execution panel uses only standard feedback primitives', () => {
  assert.match(asyncImportExecutionPanel, /PageFeedback/);
  assert.match(asyncImportExecutionPanel, /InlineFeedback/);
  assert.match(asyncImportExecutionPanel, /EmptyState/);
  assert.match(asyncImportExecutionPanel, /ConfirmAction/);
  assert.doesNotMatch(asyncImportExecutionPanel, /<Alert\b/);
  assert.doesNotMatch(asyncImportExecutionPanel, /<Empty\b/);
  assert.doesNotMatch(asyncImportExecutionPanel, /<Popconfirm\b/);
  assert.doesNotMatch(asyncImportExecutionPanel, /className="import-panel-alert"/);
});

test('clan review feedback uses only the standard page feedback entry', () => {
  assert.match(clanStep, /submitReviewTask/);
  assert.match(clanStep, /<PageFeedback[\s\S]*title="宗族提交审核失败"/);
  assert.match(clanStep, /<PageFeedback[\s\S]*title="宗族删除失败"/);
  assert.match(clanStep, /<PageFeedback[\s\S]*title="宗族列表加载失败"/);
  assert.doesNotMatch(clanStep, /<Alert\b/);
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
  assert.equal(baseline.maxCounts.page_alert, 172);
  assert.equal(baseline.maxCounts.field_help, 104);
  assert.equal(baseline.maxCounts.antd_message, 107);
  assert.equal(baseline.maxCounts.confirm_modal, 62);
  assert.equal(baseline.maxCounts.empty_state, 160);
  assert.equal(baseline.maxCounts.inline_semantic_text, 145);
  assert.equal(baseline.maxCounts.custom_notice_class, 30);
  assert.match(audit, /--baseline/);
  assert.match(audit, /regressions\.length/);
  assert.match(audit, /process\.exitCode = 1/);
  assert.match(audit, /canonicalImplementationFiles/);
});
