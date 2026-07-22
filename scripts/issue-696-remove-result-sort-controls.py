from pathlib import Path
import re
import subprocess

ROOT = Path('frontend/genealogy-web')
PERSON = ROOT / 'src/features/persons/PersonArchiveSearchPage.tsx'
SOURCE = ROOT / 'src/features/sources/SourceLibraryQueryPage.tsx'
PACKAGE = ROOT / 'package.json'
TEST = ROOT / 'src/shared/ui/resultSortRemoval.test.mjs'
TASK = Path('tasks/issue-696-execution.md')
PERSON_CSS = ROOT / 'src/person-archive-tweaks.css'
SOURCE_CSS = ROOT / 'src/features/sources/source-library-query-page.css'
MODULE_CSS = ROOT / 'src/module-title-dedup.css'
CLEANUP_CSS = ROOT / 'src/page-content-cleanup.css'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new and new in text:
        return text
    raise RuntimeError(f'cannot locate {label}')


def remove_pattern(text: str, pattern: str) -> str:
    return re.sub(pattern, '', text, flags=re.MULTILINE | re.DOTALL)


def remove_css_rules(text: str, markers: list[str]) -> str:
    for marker in markers:
        escaped = re.escape(marker)
        text = re.sub(
            rf'(?ms)^[^{{}}]*{escaped}[^{{}}]*\{{[^{{}}]*\}}\s*',
            '',
            text,
        )
    return text


def main_version(path: Path) -> str:
    return subprocess.check_output(
        ['git', 'show', f'origin/main:{path.as_posix()}'],
        text=True,
        encoding='utf-8',
    )


person = PERSON.read_text(encoding='utf-8')
person = person.replace('  PERSON_SORT_OPTIONS,\n', '')
person = remove_pattern(
    person,
    r'\n\s*<div className="person-archive-result-toolbar">\s*<Space><Typography\.Text type="secondary">排序</Typography\.Text><Select aria-label="排序"[^\n]*</Space>\s*</div>',
)
if 'Typography.' not in person:
    person = person.replace(', Tag, Typography } from \'antd\';', ', Tag } from \'antd\';')
PERSON.write_text(person, encoding='utf-8')

source = SOURCE.read_text(encoding='utf-8')
source = remove_pattern(
    source,
    r'\nconst sortOptions = \[\s*\{ value: \'updatedAt,desc\', label: \'最近更新\' \},\s*\{ value: \'createdAt,desc\', label: \'最近创建\' \},\s*\{ value: \'sourceName,asc\', label: \'来源名称\' \}\s*\];\n',
)
source = remove_pattern(
    source,
    r'\n\s*function changeSort\(sort: string\) \{\s*const next = \{ \.\.\.search, pageNo: 1, sort \};\s*setSearch\(next\);\s*writeSearchToUrl\(next\);\s*void loadSources\(next\);\s*\}\n',
)
source = remove_pattern(
    source,
    r'\n\s*<div className="source-library-result-meta">\s*<span />\s*<Select aria-label="排序方式"[^\n]*/>\s*</div>\n',
)
SOURCE.write_text(source, encoding='utf-8')

person_css = remove_css_rules(main_version(PERSON_CSS), ['.person-archive-result-toolbar'])
PERSON_CSS.write_text(person_css, encoding='utf-8')

source_css = remove_css_rules(main_version(SOURCE_CSS), [
    '.source-library-result-meta',
    '.source-library-sort',
])
SOURCE_CSS.write_text(source_css, encoding='utf-8')

cleanup_css = remove_css_rules(main_version(CLEANUP_CSS), ['.person-archive-result-toolbar:empty'])
cleanup_css = cleanup_css.replace('/* The result sort is moved into the card header; collapse the now-empty body toolbar. */\n', '')
CLEANUP_CSS.write_text(cleanup_css, encoding='utf-8')

module_css = main_version(MODULE_CSS).replace(
    '.business-page--personArchive .person-archive-result-toolbar,\n',
    '',
)
MODULE_CSS.write_text(module_css, encoding='utf-8')

TEST.write_text(r"""import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');
const personSource = readFileSync(join(srcRoot, 'features/persons/PersonArchiveSearchPage.tsx'), 'utf8');
const sourceSource = readFileSync(join(srcRoot, 'features/sources/SourceLibraryQueryPage.tsx'), 'utf8');

function cssText(root) {
  return readdirSync(root, { withFileTypes: true }).map(entry => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return cssText(path);
    return entry.name.endsWith('.css') ? readFileSync(path, 'utf8') : '';
  }).join('\n');
}

const allCss = cssText(srcRoot);

test('person archive query results do not render a sort control', () => {
  assert.doesNotMatch(personSource, /aria-label="排序"/);
  assert.doesNotMatch(personSource, /person-archive-result-toolbar/);
  assert.doesNotMatch(personSource, /PERSON_SORT_OPTIONS/);
  assert.match(personSource, /new URLSearchParams\(\{ sort: criteria\.sort \}\)/);
});

test('source library query results do not render a sort control', () => {
  assert.doesNotMatch(sourceSource, /aria-label="排序方式"/);
  assert.doesNotMatch(sourceSource, /source-library-result-meta/);
  assert.doesNotMatch(sourceSource, /source-library-sort/);
  assert.doesNotMatch(sourceSource, /const sortOptions/);
  assert.doesNotMatch(sourceSource, /function changeSort/);
  assert.match(sourceSource, /sort: 'updatedAt,desc'/);
});

test('removed result sort controls leave no stale styles', () => {
  assert.doesNotMatch(allCss, /person-archive-result-toolbar/);
  assert.doesNotMatch(allCss, /source-library-result-meta/);
  assert.doesNotMatch(allCss, /source-library-sort/);
});
""", encoding='utf-8')

package = PACKAGE.read_text(encoding='utf-8')
needle = 'src/shared/ui/promptCopyCleanup.test.mjs; status=$?'
replacement = 'src/shared/ui/promptCopyCleanup.test.mjs src/shared/ui/resultSortRemoval.test.mjs; status=$?'
package = replace_once(package, needle, replacement, 'test:person-edit registration')
PACKAGE.write_text(package, encoding='utf-8')

TASK.parent.mkdir(parents=True, exist_ok=True)
TASK.write_text("""# Issue #696 执行记录

- 删除人物档案查询结果排序工具栏。
- 删除来源资料库查询结果排序下拉、排序选项与事件处理。
- 保留默认排序字段、URL 兼容及接口请求排序参数。
- 精确清理目标 CSS，不影响其他页面共享规则。
- 新增静态回归测试并纳入 Frontend CI 已有测试链路。
""", encoding='utf-8')
