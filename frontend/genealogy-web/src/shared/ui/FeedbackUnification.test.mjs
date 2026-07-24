import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(new URL('./Feedback.tsx', import.meta.url), 'utf8');
const operationFeedback = readFileSync(new URL('./OperationFeedback.ts', import.meta.url), 'utf8');
const toastStack = readFileSync(new URL('./ToastStack.tsx', import.meta.url), 'utf8');
const draftDeleteButton = readFileSync(new URL('./DraftDeleteButton.tsx', import.meta.url), 'utf8');
const dataTable = readFileSync(new URL('./DataTable.tsx', import.meta.url), 'utf8');
const asyncImportExecutionPanel = readFileSync(new URL('../../features/imports/AsyncImportExecutionPanel.tsx', import.meta.url), 'utf8');
const importFailureBulkActions = readFileSync(new URL('../../features/imports/ImportFailureBulkActions.tsx', import.meta.url), 'utf8');
const clanStep = readFileSync(new URL('../../features/mvp1/steps/clan/ClanStep.tsx', import.meta.url), 'utf8');
const branchStep = readFileSync(new URL('../../features/mvp1/steps/branch/BranchStep.tsx', import.meta.url), 'utf8');
const sourceStep = readFileSync(new URL('../../features/mvp1/steps/source/SourceStep.tsx', import.meta.url), 'utf8');
const sourceStageStep = readFileSync(new URL('../../features/mvp1/steps/source/SourceStageStep.tsx', import.meta.url), 'utf8');
const sourceDraftDeleteAction = readFileSync(new URL('../../features/sources/SourceDraftDeleteAction.tsx', import.meta.url), 'utf8');
const sourceLibraryFocusBridge = readFileSync(new URL('../../features/sources/SourceLibraryFocusBridge.tsx', import.meta.url), 'utf8');
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

test('import failure bulk actions use standard operation and page feedback', () => {
  assert.match(importFailureBulkActions, /import \{ PageFeedback \} from '\.\.\/\.\.\/shared\/ui\/Feedback'/);
  assert.match(importFailureBulkActions, /import \{ feedback \} from '\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(importFailureBulkActions, /feedback\.success/);
  assert.match(importFailureBulkActions, /feedback\.warning/);
  assert.match(importFailureBulkActions, /feedback\.error/);
  assert.match(importFailureBulkActions, /title="当前批次不可修改"/);
  assert.match(importFailureBulkActions, /title="排除后不会删除原始数据"/);
  assert.doesNotMatch(importFailureBulkActions, /<Alert\b/);
  assert.doesNotMatch(importFailureBulkActions, /\bnotify\s*\(/);
});

test('clan step separates transient feedback from persistent page errors', () => {
  assert.match(clanStep, /import \{ feedback \} from '\.\.\/\.\.\/\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(clanStep, /feedback\.success/);
  assert.match(clanStep, /feedback\.warning/);
  assert.match(clanStep, /feedback\.error/);
  assert.match(clanStep, /submitReviewTask/);
  assert.match(clanStep, /<PageFeedback[\s\S]*title="宗族提交审核失败"/);
  assert.match(clanStep, /<PageFeedback[\s\S]*title="宗族删除失败"/);
  assert.match(clanStep, /<PageFeedback[\s\S]*title="宗族列表加载失败"/);
  assert.match(clanStep, /showErrorFeedback=\{false\}/);
  assert.doesNotMatch(clanStep, /\bmessage\.(success|info|warning|error|loading)\s*\(/);
  assert.doesNotMatch(clanStep, /\bnotify\?\.\(/);
  assert.doesNotMatch(clanStep, /setClanReviewError\([^)]*\);\s*feedback\.error/s);
  assert.doesNotMatch(clanStep, /<Alert\b/);
});

test('branch step uses standard transient, page, confirmation and empty feedback', () => {
  assert.match(branchStep, /import \{ ConfirmAction, EmptyState, PageFeedback \} from '\.\.\/\.\.\/\.\.\/\.\.\/shared\/ui\/Feedback'/);
  assert.match(branchStep, /import \{ feedback \} from '\.\.\/\.\.\/\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(branchStep, /title="支派列表加载失败"/);
  assert.match(branchStep, /<ConfirmAction/);
  assert.match(branchStep, /<EmptyState/);
  assert.match(branchStep, /feedback\.success/);
  assert.match(branchStep, /feedback\.warning/);
  assert.match(branchStep, /feedback\.error/);
  assert.doesNotMatch(branchStep, /<Alert\b|<Empty\b|<Popconfirm\b/);
  assert.doesNotMatch(branchStep, /\bmessage\.(success|info|warning|error|loading)\s*\(/);
  assert.doesNotMatch(branchStep, /\bnotify\?\.\(/);
});

test('source step uses standard transient, page and empty feedback', () => {
  assert.match(sourceStep, /import \{ EmptyState, PageFeedback \} from '\.\.\/\.\.\/\.\.\/\.\.\/shared\/ui\/Feedback'/);
  assert.match(sourceStep, /import \{ feedback \} from '\.\.\/\.\.\/\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(sourceStep, /title="来源列表加载失败"/);
  assert.match(sourceStep, /title="绑定记录加载失败"/);
  assert.match(sourceStep, /<EmptyState/);
  assert.match(sourceStep, /feedback\.success/);
  assert.match(sourceStep, /feedback\.warning/);
  assert.match(sourceStep, /feedback\.error/);
  assert.doesNotMatch(sourceStep, /<Alert\b|<Empty\b/);
  assert.doesNotMatch(sourceStep, /\bmessage\.(success|info|warning|error|loading)\s*\(/);
  assert.doesNotMatch(sourceStep, /\bnotify\?\.\(/);
});

test('source stage uses standard transient, page and empty feedback', () => {
  assert.match(sourceStageStep, /import \{ EmptyState, PageFeedback \} from '\.\.\/\.\.\/\.\.\/\.\.\/shared\/ui\/Feedback'/);
  assert.match(sourceStageStep, /import \{ feedback \} from '\.\.\/\.\.\/\.\.\/\.\.\/shared\/ui\/OperationFeedback'/);
  assert.match(sourceStageStep, /title="来源列表加载失败"/);
  assert.match(sourceStageStep, /title="绑定记录加载失败"/);
  assert.match(sourceStageStep, /title="暂无已审核通过的来源"/);
  assert.match(sourceStageStep, /<EmptyState/);
  assert.match(sourceStageStep, /feedback\.success/);
  assert.match(sourceStageStep, /feedback\.warning/);
  assert.match(sourceStageStep, /feedback\.error/);
  assert.doesNotMatch(sourceStageStep, /<Alert\b|<Empty\b/);
  assert.doesNotMatch(sourceStageStep, /\bmessage\.(success|info|warning|error|loading)\s*\(/);
  assert.doesNotMatch(sourceStageStep, /\bnotify\?\.\(/);
});

test('shared data table uses standard operation, confirmation and empty feedback', () => {
  assert.match(dataTable, /import \{ ConfirmAction, EmptyState \} from '\.\/Feedback'/);
  assert.match(dataTable, /import \{ feedback \} from '\.\/OperationFeedback'/);
  assert.match(dataTable, /feedback\.success/);
  assert.match(dataTable, /feedback\.warning/);
  assert.match(dataTable, /feedback\.error/);
  assert.match(dataTable, /<ConfirmAction/);
  assert.match(dataTable, /<EmptyState/);
  assert.doesNotMatch(dataTable, /<Empty\b|<Popconfirm\b/);
  assert.doesNotMatch(dataTable, /\bmessage\.(success|info|warning|error|loading)\s*\(/);
});

test('source draft deletion uses page feedback without duplicate success notification', () => {
  assert.match(sourceDraftDeleteAction, /import \{ PageFeedback \} from '\.\.\/\.\.\/shared\/ui\/Feedback'/);
  assert.match(sourceDraftDeleteAction, /title="来源删除操作暂不可用"/);
  assert.match(sourceDraftDeleteAction, /title=\{`草稿来源“\$\{sourceName\(detail\)\}”暂不能删除`\}/);
  assert.match(sourceDraftDeleteAction, /<DraftDeleteButton/);
  assert.doesNotMatch(sourceDraftDeleteAction, /<Alert\b/);
  assert.doesNotMatch(sourceDraftDeleteAction, /notify\?\.\(\{ message: '草稿来源已删除/);
});

test('source focus bridge keeps loading errors visible through page feedback', () => {
  assert.match(sourceLibraryFocusBridge, /import \{ PageFeedback \} from '\.\.\/\.\.\/shared\/ui\/Feedback'/);
  assert.match(sourceLibraryFocusBridge, /const \[loadError, setLoadError\] = useState\(''\)/);
  assert.match(sourceLibraryFocusBridge, /title="工作台定位来源加载失败"/);
  assert.match(sourceLibraryFocusBridge, /title=\{isMissingSourceIntent \? '来自工作台：缺来源处理' : '来自工作台：来源资料定位'\}/);
  assert.match(sourceLibraryFocusBridge, /重新加载/);
  assert.doesNotMatch(sourceLibraryFocusBridge, /<Alert\b/);
  assert.doesNotMatch(sourceLibraryFocusBridge, /\bmessage\.(success|info|warning|error|loading)\s*\(/);
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
  assert.equal(baseline.maxCounts.page_alert, 0);
  assert.equal(baseline.maxCounts.field_help, 104);
  assert.equal(baseline.maxCounts.app_notify, 0);
  assert.equal(baseline.maxCounts.antd_message, 0);
  assert.equal(baseline.maxCounts.confirm_modal, 60);
  assert.equal(baseline.maxCounts.empty_state, 153);
  assert.equal(baseline.maxCounts.inline_semantic_text, 145);
  assert.equal(baseline.maxCounts.custom_notice_class, 30);
  assert.match(audit, /--baseline/);
  assert.match(audit, /regressions\.length/);
  assert.match(audit, /process\.exitCode = 1/);
  assert.match(audit, /canonicalImplementationFiles/);
});