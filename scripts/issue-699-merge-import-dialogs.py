from pathlib import Path
import re

ROOT = Path('frontend/genealogy-web')
IMPORT_PAGE = ROOT / 'src/features/imports/ImportPage.tsx'
OLD_MODAL = ROOT / 'src/features/imports/NewImportModal.tsx'
SELECTOR = ROOT / 'src/features/imports/ImportTypeSelector.tsx'
CSS = ROOT / 'src/features/imports/import-workbench.css'
E2E = ROOT / 'e2e/import-page-pattern.spec.ts'
PACKAGE = ROOT / 'package.json'
TEST = ROOT / 'src/features/imports/import-dialog-unification.test.mjs'
TASK = Path('tasks/issue-699-execution.md')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise RuntimeError(f'cannot locate {label}')


page = IMPORT_PAGE.read_text(encoding='utf-8')
page = replace_once(
    page,
    "import { NewImportModal } from './NewImportModal';",
    "import { ImportTypeSelector } from './ImportTypeSelector';",
    'new import component import',
)
page = replace_once(
    page,
    "import { importTypeRegistry, type ImportFileFormat, type ImportTypeKey } from './import-type-registry';",
    "import { importTypeRegistry, type ImportTypeKey } from './import-type-registry';",
    'unused import file format type',
)
page = re.sub(
    r"\nfunction typeTitle\(type: ImportTypeKey\) \{\n  return availableImportTypes\.find\(option => option\.value === type\)\?\.label \|\| '数据';\n\}\n",
    '\n',
    page,
    count=1,
)
page = replace_once(
    page,
    "  const [newImportOpen, setNewImportOpen] = useState(false);\n  const [uploadWorkspaceOpen, setUploadWorkspaceOpen] = useState(false);\n  const [recordsOpen, setRecordsOpen] = useState(false);\n  const [templateDownloading, setTemplateDownloading] = useState<ImportFileFormat>();",
    "  const [importDrawerOpen, setImportDrawerOpen] = useState(false);\n  const [recordsOpen, setRecordsOpen] = useState(false);",
    'dual import dialog state',
)
page = re.sub(
    r"\n  function continueToUpload\(\) \{\n    setNewImportOpen\(false\);\n    setUploadWorkspaceOpen\(true\);\n  \}\n",
    '\n',
    page,
    count=1,
)
page = replace_once(
    page,
    "  function handleBatchCreated() {\n    setUploadWorkspaceOpen(false);\n    refreshJobs();\n  }",
    "  function handleBatchCreated() {\n    setImportDrawerOpen(false);\n    refreshJobs();\n  }",
    'batch created drawer close',
)
page = replace_once(
    page,
    'extra={<Button type="primary" disabled={!workspace.clanId} onClick={() => setNewImportOpen(true)}>新建导入</Button>}',
    'extra={<Button type="primary" disabled={!workspace.clanId} onClick={() => setImportDrawerOpen(true)}>新建导入</Button>}',
    'new import entry',
)
page = re.sub(
    r"\n      <NewImportModal\n        open=\{newImportOpen\}\n        activeType=\{activeType\}\n        downloading=\{templateDownloading\}\n        onTypeChange=\{changeType\}\n        onDownloadingChange=\{setTemplateDownloading\}\n        onCancel=\{\(\) => setNewImportOpen\(false\)\}\n        onContinue=\{continueToUpload\}\n        notify=\{notify\}\n      />\n",
    '\n',
    page,
    count=1,
)
page = replace_once(page, '        open={uploadWorkspaceOpen}', '        open={importDrawerOpen}', 'drawer open state')
page = replace_once(page, '        title={`新建${typeTitle(activeType)}导入`}', '        title="新建导入"', 'drawer title')
page = replace_once(page, '        onClose={() => setUploadWorkspaceOpen(false)}', '        onClose={() => setImportDrawerOpen(false)}', 'drawer close state')
page = replace_once(
    page,
    '        <Space direction="vertical" size={16} className="import-workbench-stack">\n          <Card size="small" title="导入目标">',
    '        <Space direction="vertical" size={16} className="import-workbench-stack">\n          <ImportTypeSelector activeType={activeType} onTypeChange={changeType} />\n          <Card size="small" title="2. 选择导入目标">',
    'drawer unified content',
)
for forbidden in ('newImportOpen', 'uploadWorkspaceOpen', 'templateDownloading', 'continueToUpload', '<NewImportModal'):
    if forbidden in page:
        raise RuntimeError(f'stale import dialog token remains: {forbidden}')
IMPORT_PAGE.write_text(page, encoding='utf-8')

SELECTOR.write_text("""import type { ReactNode } from 'react';
import { ApartmentOutlined, FolderOpenOutlined, UserOutlined } from '@ant-design/icons';
import { Card } from 'antd';
import type { ImportTypeKey } from './import-type-registry';

const typeOptions: Array<{ value: ImportTypeKey; label: string; description: string; icon: ReactNode }> = [
  { value: 'person', label: '人物', description: '导入族谱人物信息', icon: <UserOutlined /> },
  { value: 'relationship', label: '关系', description: '导入人物关系信息', icon: <ApartmentOutlined /> },
  { value: 'source', label: '来源', description: '导入资料来源信息', icon: <FolderOpenOutlined /> }
];

type Props = {
  activeType: ImportTypeKey;
  onTypeChange: (value: ImportTypeKey) => void;
};

export function ImportTypeSelector({ activeType, onTypeChange }: Props) {
  return (
    <Card size="small" title="1. 选择导入对象" className="import-type-selector-card">
      <div className="import-new-type-grid">
        {typeOptions.map(option => (
          <button
            key={option.value}
            type="button"
            aria-label={`${option.label}导入`}
            aria-pressed={activeType === option.value}
            className={`import-new-type-card${activeType === option.value ? ' is-selected' : ''}`}
            onClick={() => onTypeChange(option.value)}
          >
            <span className={`import-new-type-icon import-new-type-icon--${option.value}`}>{option.icon}</span>
            <strong>{option.label}</strong>
            <span>{option.description}</span>
            {activeType === option.value ? <span className="import-new-type-check">✓</span> : null}
          </button>
        ))}
      </div>
    </Card>
  );
}
""", encoding='utf-8')

if OLD_MODAL.exists():
    OLD_MODAL.unlink()

css = CSS.read_text(encoding='utf-8')
css = re.sub(
    r"\n\.import-new-modal-content \{\n  width: 100%;\n\}\n\n\.import-new-modal-content \.ant-typography \{\n  margin-bottom: 10px;\n\}\n",
    '\n',
    css,
    count=1,
)
if '.import-type-selector-card {' not in css:
    css = css.replace(
        '.import-new-type-grid {',
        '.import-type-selector-card {\n  width: 100%;\n}\n\n.import-new-type-grid {',
        1,
    )
CSS.write_text(css, encoding='utf-8')

spec = E2E.read_text(encoding='utf-8')
new_test = r'''test('data import page uses a strict two-layer query result with one new import drawer', async ({ page }) => {
  await mockImportApi(page);
  await page.goto('/?view=imports&branchId=2');

  await expect(page.locator('.import-query-card')).toHaveCount(1);
  await expect(page.locator('.import-result-card')).toHaveCount(1);
  await expect(page.locator('.tabbed-module-intro')).toHaveCount(0);
  await expect(page.locator('.tabbed-module-tabs-card')).toHaveCount(0);
  await expect(page.getByText('导入任务查询', { exact: true })).toBeVisible();
  const outerResultHeader = page.locator('.import-result-card > .query-result-outer-card__header');
  await expect(outerResultHeader.getByText('查询结果', { exact: true })).toBeVisible();
  await expect(outerResultHeader.getByText('（共 3 个任务）', { exact: true })).toBeVisible();
  await expectDesktopResultHeaderSpacing(page);
  await expectStrictTwoLayerResult(page);

  const labels = await page.locator('.import-query-card .ant-form-item-label label').allTextContents();
  expect(labels).toEqual(['导入对象', '导入状态', '文件名/任务编号', '任务创建时间']);

  await page.getByLabel('导入对象').click();
  const importTypePopup = page.locator('.ant-select-dropdown:visible');
  await expect(importTypePopup.getByText('全选 / 取消全选', { exact: true })).toBeVisible();
  await expect(importTypePopup.getByText('人物', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  const taskTable = page.locator('.import-execution-table');
  await expect(taskTable.getByText('黄氏人物资料.xlsx')).toBeVisible();
  await expect(taskTable.getByText('IMP-20260720-0101')).toBeVisible();
  await expect(taskTable.getByText('部分成功')).toBeVisible();

  await page.getByRole('button', { name: '新建导入' }).click();
  const drawer = page.locator('.import-upload-workspace-drawer');
  await expect(drawer).toBeVisible();
  await expect(page.locator('.ant-drawer:visible')).toHaveCount(1);
  await expect(page.locator('.ant-modal-wrap:visible')).toHaveCount(0);
  await expect(drawer.getByText('新建导入', { exact: true })).toBeVisible();
  await expect(drawer.getByText('1. 选择导入对象', { exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: '人物导入' })).toHaveAttribute('aria-pressed', 'true');
  await expect(drawer.getByRole('button', { name: '关系导入' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: '来源导入' })).toBeVisible();
  await expect(drawer.getByText('2. 选择导入目标', { exact: true })).toBeVisible();
  await expect(drawer.getByLabel('目标支派')).toBeVisible();
  await expect(drawer.getByRole('button', { name: '下载 XLSX 模板' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: '下载 CSV 模板' })).toBeVisible();
  await expect(drawer.getByText('拖拽文件到此处，或点击选择文件')).toBeVisible();
  await expect(drawer.getByRole('button', { name: '上传文件并预检' })).toHaveCount(0);

  await drawer.getByRole('button', { name: '关系导入' }).click();
  await expect(drawer.getByRole('button', { name: '关系导入' })).toHaveAttribute('aria-pressed', 'true');
  await expect(drawer.getByText('关系导入', { exact: true })).toBeVisible();
  await expect(page.locator('.ant-drawer:visible')).toHaveCount(1);
});'''
spec, count = re.subn(
    r"test\('data import page uses a strict two-layer query result with new import modal'[\s\S]*?\n\}\);\n\n(?=test\('390px viewport)",
    new_test + '\n\n',
    spec,
    count=1,
)
if count != 1 and 'one new import drawer' not in spec:
    raise RuntimeError('cannot replace import page drawer E2E')
E2E.write_text(spec, encoding='utf-8')

TEST.write_text("""import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const importPage = readFileSync(join(here, 'ImportPage.tsx'), 'utf8');
const selector = readFileSync(join(here, 'ImportTypeSelector.tsx'), 'utf8');
const oldModal = join(here, 'NewImportModal.tsx');

test('new import uses one drawer without modal-to-drawer transition', () => {
  assert.match(importPage, /const \[importDrawerOpen, setImportDrawerOpen\] = useState\(false\)/);
  assert.match(importPage, /open=\{importDrawerOpen\}/);
  assert.match(importPage, /title="新建导入"/);
  assert.match(importPage, /<ImportTypeSelector activeType=\{activeType\} onTypeChange=\{changeType\} \/>/);
  assert.doesNotMatch(importPage, /newImportOpen|uploadWorkspaceOpen|continueToUpload|NewImportModal/);
  assert.equal(existsSync(oldModal), false);
});

test('drawer embeds all import type choices and no modal wrapper', () => {
  assert.doesNotMatch(selector, /\bModal\b/);
  assert.match(selector, /title="1\. 选择导入对象"/);
  assert.match(selector, /value: 'person'/);
  assert.match(selector, /value: 'relationship'/);
  assert.match(selector, /value: 'source'/);
  assert.match(selector, /aria-pressed=\{activeType === option\.value\}/);
});
""", encoding='utf-8')

package = PACKAGE.read_text(encoding='utf-8')
old = "src/features/imports/import-history-state.test.mjs; status=$?"
new = "src/features/imports/import-history-state.test.mjs src/features/imports/import-dialog-unification.test.mjs; status=$?"
package = replace_once(package, old, new, 'import dialog static test registration')
PACKAGE.write_text(package, encoding='utf-8')

TASK.parent.mkdir(parents=True, exist_ok=True)
TASK.write_text("""# Issue #699 执行记录

- 将新建导入 Modal 与上传预检 Drawer 合并为一个 960px Drawer。
- 新增 Drawer 内导入对象选择面板，保留人物、关系、来源三类导入。
- 删除双弹框状态、继续跳转和重复模板下载入口。
- 保留目标支派、模板下载、文件上传、数据预检、重复确认和批次创建逻辑。
- 切换导入对象时通过工作区卸载重建清理文件及预检状态。
- 更新静态结构测试和 Import Page Chromium E2E。
""", encoding='utf-8')
