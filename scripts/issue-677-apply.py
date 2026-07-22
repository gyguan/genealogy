#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend/genealogy-web"
IMPORT_LINE = "import { BusinessResultCard } from '../../shared/ui/QueryResultCards';\n"


def read(rel: str) -> str:
    path = ROOT / rel
    if not path.exists():
        raise FileNotFoundError(rel)
    return path.read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def rreplace_once(text: str, old: str, new: str, label: str) -> str:
    index = text.rfind(old)
    if index < 0:
        raise RuntimeError(f"{label}: closing marker not found")
    return text[:index] + new + text[index + len(old):]


def add_business_import(text: str, label: str) -> str:
    if IMPORT_LINE.strip() in text:
        return text
    match = re.match(r"((?:import[\s\S]*?;\n)+)", text)
    if not match:
        raise RuntimeError(f"{label}: import block not found")
    return text[:match.end()] + IMPORT_LINE + text[match.end():]


def patch_person() -> None:
    rel = "frontend/genealogy-web/src/features/persons/PersonArchiveSearchPage.tsx"
    text = add_business_import(read(rel), rel)
    text = replace_once(
        text,
        '    <Card className="person-archive-result-card" title={hasQueried ? `查询结果（${total}）` : \'查询结果\'} extra={resultActions}>\n',
        '    <Card className="person-archive-result-card query-result-outer-card" title="查询结果" extra={resultActions}>\n      <BusinessResultCard title="人物档案" total={total}>\n',
        rel,
    )
    text = rreplace_once(
        text,
        '    </Card>\n  </div>;',
        '      </BusinessResultCard>\n    </Card>\n  </div>;',
        rel,
    )
    write(rel, text)


def patch_source() -> None:
    rel = "frontend/genealogy-web/src/features/sources/SourceLibraryQueryPage.tsx"
    text = add_business_import(read(rel), rel)
    text = replace_once(
        text,
        '        <Card className="source-library-result-card" title={`查询结果（${sourceTotal}）`} extra={resultActions}>\n',
        '        <Card className="source-library-result-card query-result-outer-card" title="查询结果" extra={resultActions}>\n          <BusinessResultCard title="来源资料" total={sourceTotal}>\n',
        rel,
    )
    text = rreplace_once(
        text,
        '        </Card>\n      </Space>',
        '          </BusinessResultCard>\n        </Card>\n      </Space>',
        rel,
    )
    write(rel, text)


def patch_tracking() -> None:
    rel = "frontend/genealogy-web/src/features/logs/LogPage.tsx"
    text = add_business_import(read(rel), rel)
    text = replace_once(text, 'className="tracking-result-card"', 'className="tracking-result-card query-result-outer-card"', rel)
    text = replace_once(
        text,
        '          title={<div className="tracking-result-title"><Title level={4}>查询结果</Title><Text type="secondary">共 {resultTotal} 条</Text></div>}\n',
        '          title="查询结果"\n',
        rel,
    )
    text = replace_once(
        text,
        '          {activeResult}\n',
        "          <BusinessResultCard\n            title={activeTab === TRACKING_TABS.OBJECT ? '业务对象' : activeTab === TRACKING_TABS.AUDIT ? '操作日志' : '风险事件'}\n            total={resultTotal}\n            totalSuffix={activeTab === TRACKING_TABS.OBJECT ? '个对象' : activeTab === TRACKING_TABS.AUDIT ? '条记录' : '条风险事件'}\n          >\n            {activeResult}\n          </BusinessResultCard>\n",
        rel,
    )
    write(rel, text)


def patch_tree() -> None:
    rel = "frontend/genealogy-web/src/features/tree/LineageTreeProductPage.tsx"
    text = add_business_import(read(rel), rel)
    text = replace_once(
        text,
        '      <Card className="lineage-double-card-result" title="查询结果" size="small">\n        <Tabs\n',
        '      <Card className="lineage-double-card-result query-result-outer-card" title="查询结果" size="small">\n        <BusinessResultCard title="世系图谱" total={activeGraph?.nodes.length || 0} totalSuffix="个人物">\n          <Tabs\n',
        rel,
    )
    text = replace_once(
        text,
        '        />\n      </Card>\n\n      <Drawer\n',
        '          />\n        </BusinessResultCard>\n      </Card>\n\n      <Drawer\n',
        rel,
    )
    write(rel, text)


def patch_imports() -> None:
    rel = "frontend/genealogy-web/src/features/imports/ImportPage.tsx"
    text = add_business_import(read(rel), rel)
    text = replace_once(text, 'className="import-result-card"', 'className="import-result-card query-result-outer-card"', rel)
    text = replace_once(text, '        title={`查询结果（${taskTotal}）`}\n', '        title="查询结果"\n', rel)
    text = replace_once(
        text,
        '      >\n        <AsyncImportExecutionPanel\n',
        '      >\n        <BusinessResultCard title="导入任务" total={taskTotal} totalSuffix="个任务">\n          <AsyncImportExecutionPanel\n',
        rel,
    )
    text = replace_once(
        text,
        '        />\n      </Card>\n\n      <NewImportModal\n',
        '          />\n        </BusinessResultCard>\n      </Card>\n\n      <NewImportModal\n',
        rel,
    )
    write(rel, text)


def patch_workbench() -> None:
    rel = "frontend/genealogy-web/src/features/workbench/EditingWorkspacePage.tsx"
    text = add_business_import(read(rel), rel)
    text = replace_once(
        text,
        '    <Card title={`查询结果（${total}）`} extra={resultActions}>\n',
        '    <Card className="query-result-outer-card workbench-result-card" title="查询结果" extra={resultActions}>\n      <BusinessResultCard title="修谱任务" total={total}>\n',
        rel,
    )
    text = replace_once(
        text,
        '    </Card>\n\n    <Drawer title={selectedTask',
        '      </BusinessResultCard>\n    </Card>\n\n    <Drawer title={selectedTask',
        rel,
    )
    write(rel, text)


def patch_culture_item() -> None:
    rel = "frontend/genealogy-web/src/features/culture/CultureItemStandardTab.tsx"
    text = add_business_import(read(rel), rel)
    text = replace_once(text, 'className="culture-result-card"', 'className="culture-result-card query-result-outer-card"', rel)
    text = replace_once(text, '        title={`文化资料（${page.totalElements}）`}\n', '        title="查询结果"\n', rel)
    marker = 'className="culture-result-card query-result-outer-card"'
    start = text.index(marker)
    opening_end = text.index('      >\n', start) + len('      >\n')
    text = text[:opening_end] + '        <BusinessResultCard title="文化资料" total={page.totalElements}>\n' + text[opening_end:]
    text = replace_once(
        text,
        '      </Card>\n\n      <Drawer\n',
        '        </BusinessResultCard>\n      </Card>\n\n      <Drawer\n',
        rel,
    )
    write(rel, text)


def patch_migration() -> None:
    rel = "frontend/genealogy-web/src/features/culture/MigrationEventStandardTab.tsx"
    text = add_business_import(read(rel), rel)
    old = '    <Card className="culture-result-card" title={`迁徙脉络（${total}）`} extra={<Space className="culture-result-actions"><Select aria-label="迁徙脉络排序" className="culture-result-sort" value={search.sort} options={migrationSortOptions} onChange={changeSort} /><Button type="primary" disabled={!clanId} onClick={() => openEditor({ target: \'migration\', mode: \'create\' })}>{culturePrimaryAction(activeTab)}</Button></Space>}>\n'
    new = '    <Card className="culture-result-card query-result-outer-card" title="查询结果" extra={<Space className="culture-result-actions"><Select aria-label="迁徙脉络排序" className="culture-result-sort" value={search.sort} options={migrationSortOptions} onChange={changeSort} /><Button type="primary" disabled={!clanId} onClick={() => openEditor({ target: \'migration\', mode: \'create\' })}>{culturePrimaryAction(activeTab)}</Button></Space>}>\n      <BusinessResultCard title="迁徙脉络" total={total}>\n'
    text = replace_once(text, old, new, rel)
    text = replace_once(
        text,
        '    </Card>\n    <Drawer open={Boolean(selectedId)}',
        '      </BusinessResultCard>\n    </Card>\n    <Drawer open={Boolean(selectedId)}',
        rel,
    )
    write(rel, text)


def patch_site() -> None:
    rel = "frontend/genealogy-web/src/features/culture/CultureSiteStandardTab.tsx"
    text = add_business_import(read(rel), rel)
    old = '    <Card className="culture-result-card" title={`文化场所（${total}）`} extra={<Space className="culture-result-actions"><Select aria-label="文化场所排序" className="culture-result-sort" value={search.sort} options={siteSortOptions} onChange={changeSort} /><Button type="primary" disabled={!clanId} onClick={() => openEditor({ target: \'site\', mode: \'create\' })}>{culturePrimaryAction(activeTab)}</Button></Space>}>\n'
    new = '    <Card className="culture-result-card query-result-outer-card" title="查询结果" extra={<Space className="culture-result-actions"><Select aria-label="文化场所排序" className="culture-result-sort" value={search.sort} options={siteSortOptions} onChange={changeSort} /><Button type="primary" disabled={!clanId} onClick={() => openEditor({ target: \'site\', mode: \'create\' })}>{culturePrimaryAction(activeTab)}</Button></Space>}>\n      <BusinessResultCard title="文化场所" total={total}>\n'
    text = replace_once(text, old, new, rel)
    text = replace_once(
        text,
        '    </Card>\n    <Drawer open={Boolean(selectedId)}',
        '      </BusinessResultCard>\n    </Card>\n    <Drawer open={Boolean(selectedId)}',
        rel,
    )
    write(rel, text)


def patch_review() -> None:
    rel = "frontend/genealogy-web/src/features/reviews/ReviewCenterPageContent.tsx"
    text = add_business_import(read(rel), rel)
    text = replace_once(
        text,
        '        <Card>\n          <Space direction="vertical" size={12} style={{ width: \'100%\' }}>\n',
        '        <Card\n          className="query-result-outer-card review-result-card"\n          title="查询结果"\n          extra={workspace.clanId && !listFailure?.forbidden ? <Button loading={loading} onClick={() => void loadTasks()}>刷新</Button> : null}\n        >\n          <BusinessResultCard title="审核任务" total={total}>\n            <Space direction="vertical" size={12} style={{ width: \'100%\' }}>\n',
        rel,
    )
    text = replace_once(
        text,
        '              <Space wrap>\n                {workspace.clanId && !listFailure?.forbidden ? <Button loading={loading} onClick={() => void loadTasks()}>刷新</Button> : null}\n              </Space>\n',
        '',
        rel,
    )
    text = replace_once(
        text,
        '          </Space>\n        </Card>\n      </Space>\n',
        '            </Space>\n          </BusinessResultCard>\n        </Card>\n      </Space>\n',
        rel,
    )
    write(rel, text)


def patch_member() -> None:
    rel = "frontend/genealogy-web/src/features/members/MemberPage.tsx"
    text = add_business_import(read(rel), rel)
    text = replace_once(
        text,
        '      <Card title="成员与权限" extra={<Button onClick={openCreateGrant} disabled={!selectedClanId || !roles.length}>新增成员授权</Button>}>\n',
        '      <Card title="成员与权限">\n',
        rel,
    )
    text = replace_once(
        text,
        '      <Card title="成员列表" extra={<Typography.Text type="secondary">共 {total} 名成员</Typography.Text>} style={{ marginTop: 16 }}>\n',
        '      <Card className="query-result-outer-card member-result-card" title="查询结果" extra={<Button type="primary" onClick={openCreateGrant} disabled={!selectedClanId || !roles.length}>新增成员授权</Button>} style={{ marginTop: 16 }}>\n        <BusinessResultCard title="成员列表" total={total} totalSuffix="名成员">\n',
        rel,
    )
    text = replace_once(
        text,
        '      </Card>\n\n      <Modal\n',
        '        </BusinessResultCard>\n      </Card>\n\n      <Modal\n',
        rel,
    )
    write(rel, text)


def patch_docs() -> None:
    rel = "docs/22-frontend-query-page-pattern-spec.md"
    text = read(rel)
    text = replace_once(
        text,
        "结果 Card\n├─ 查询结果标题\n├─ 页面级业务操作\n├─ 查询状态与结果说明\n├─ Table / Mobile Card List\n└─ 总数与分页",
        "外层结果 Card\n├─ 标题：查询结果\n├─ 页面级业务操作（标题同一行右对齐）\n└─ 内层业务结果 Card\n   ├─ 业务数据标题与总数\n   ├─ Tabs、排序、批量状态等结果局部控件\n   ├─ 查询状态与结果说明\n   ├─ Table / Mobile Card List / Graph Canvas\n   └─ 总数与分页",
        rel,
    )
    text = replace_once(
        text,
        "- 结果 Card 标题统一使用“查询结果”；\n- 页面级业务操作放在结果 Card 标题右侧；\n- 查询条件与结果列表不得混入同一个 Card；",
        "- 外层结果 Card 标题统一使用“查询结果”；\n- 页面级业务操作放在外层结果 Card 标题右侧；\n- 内层业务结果 Card 使用具体业务名称，例如“人物档案”“审核任务”“来源资料”；\n- Tabs、排序、批量选择、图内定位等结果局部控件放在内层业务结果 Card；\n- 查询条件与结果列表不得混入同一个 Card；",
        rel,
    )
    text = replace_once(
        text,
        "Card 标题用于表达区域任务，总数属于运行时状态，两者不耦合。",
        "外层 Card 标题用于表达区域任务，总数属于运行时状态，两者不耦合。总数优先展示在内层业务结果 Card 标题或分页区域。",
        rel,
    )
    write(rel, text)


def write_component() -> None:
    write(
        "frontend/genealogy-web/src/shared/ui/QueryResultCards.tsx",
        """import type { ReactNode } from 'react';
import { Card, Space, Typography } from 'antd';
import './query-result-cards.css';

type Props = {
  title: ReactNode;
  total?: number;
  totalSuffix?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function BusinessResultCard({ title, total, totalSuffix = '条', extra, children, className = '' }: Props) {
  return (
    <Card
      size="small"
      className={`business-result-card ${className}`.trim()}
      title={(
        <Space direction="vertical" size={0} className="business-result-card__title">
          <Typography.Text strong>{title}</Typography.Text>
          {total !== undefined ? <Typography.Text type="secondary">共 {total} {totalSuffix}</Typography.Text> : null}
        </Space>
      )}
      extra={extra}
    >
      {children}
    </Card>
  );
}
""",
    )
    write(
        "frontend/genealogy-web/src/shared/ui/query-result-cards.css",
        """.query-result-outer-card {
  min-width: 0;
}

.query-result-outer-card > .ant-card-head {
  padding-inline: 16px;
}

.query-result-outer-card > .ant-card-head .ant-card-head-wrapper {
  min-height: 60px;
  align-items: center;
}

.query-result-outer-card > .ant-card-head .ant-card-head-title,
.query-result-outer-card > .ant-card-head .ant-card-extra {
  padding-block: 14px;
}

.query-result-outer-card > .ant-card-body {
  padding: 16px;
  background: #f5f7fa;
}

.business-result-card {
  min-width: 0;
  border-color: #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.business-result-card > .ant-card-head {
  min-height: 56px;
  padding-inline: 16px;
}

.business-result-card > .ant-card-head .ant-card-head-wrapper {
  align-items: center;
}

.business-result-card > .ant-card-body {
  padding: 16px;
}

.business-result-card__title {
  display: flex;
  width: 100%;
}

.business-result-card__title .ant-typography {
  margin: 0;
}

@media (max-width: 767px) {
  .query-result-outer-card > .ant-card-head .ant-card-head-wrapper,
  .business-result-card > .ant-card-head .ant-card-head-wrapper {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
    padding-block: 16px;
  }

  .query-result-outer-card > .ant-card-head .ant-card-head-title,
  .query-result-outer-card > .ant-card-head .ant-card-extra,
  .business-result-card > .ant-card-head .ant-card-head-title,
  .business-result-card > .ant-card-head .ant-card-extra {
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .query-result-outer-card > .ant-card-head .ant-card-extra .ant-btn,
  .business-result-card > .ant-card-head .ant-card-extra .ant-btn {
    min-height: 44px;
  }

  .query-result-outer-card > .ant-card-body {
    padding: 12px;
  }

  .business-result-card > .ant-card-body {
    padding: 12px;
  }
}
""",
    )


def write_test() -> None:
    write(
        "frontend/genealogy-web/src/shared/ui/QueryResultCards.test.mjs",
        """import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = [
  ['features/persons/PersonArchiveSearchPage.tsx', '人物档案'],
  ['features/sources/SourceLibraryQueryPage.tsx', '来源资料'],
  ['features/logs/LogPage.tsx', '业务对象'],
  ['features/tree/LineageTreeProductPage.tsx', '世系图谱'],
  ['features/imports/ImportPage.tsx', '导入任务'],
  ['features/workbench/EditingWorkspacePage.tsx', '修谱任务'],
  ['features/culture/CultureItemStandardTab.tsx', '文化资料'],
  ['features/culture/MigrationEventStandardTab.tsx', '迁徙脉络'],
  ['features/culture/CultureSiteStandardTab.tsx', '文化场所'],
  ['features/reviews/ReviewCenterPageContent.tsx', '审核任务'],
  ['features/members/MemberPage.tsx', '成员列表']
];

test('all query result pages use the approved outer and inner card structure', () => {
  for (const [relativePath, businessTitle] of files) {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
    assert.match(source, /query-result-outer-card/, `${relativePath} should mark the outer result card`);
    assert.match(source, /title="查询结果"/, `${relativePath} should use 查询结果 as outer title`);
    assert.match(source, /<BusinessResultCard/, `${relativePath} should render an inner business result card`);
    assert.ok(source.includes(businessTitle), `${relativePath} should expose business title ${businessTitle}`);
  }
});

test('member create action and review refresh action stay in outer card headers', () => {
  const member = readFileSync(new URL('../features/members/MemberPage.tsx', import.meta.url), 'utf8');
  const review = readFileSync(new URL('../features/reviews/ReviewCenterPageContent.tsx', import.meta.url), 'utf8');
  assert.match(member, /title="查询结果" extra=\{<Button type="primary"[^>]*>新增成员授权<\/Button>\}/);
  assert.match(review, /title="查询结果"[\s\S]*extra=\{workspace\.clanId[\s\S]*>刷新<\/Button>/);
});
""",
    )


def write_task_board() -> None:
    write(
        "tasks/issue-677-execution.md",
        """# Issue #677 执行看板：统一查询页面结果 CARD 双层结构

## 目标

- 外层结果 Card 标题统一为“查询结果”；
- 页面级操作与标题同一行、右对齐；
- 内层业务结果 Card 承载业务标题、总数、局部控件、列表和分页；
- 视觉与响应式行为以审计追踪结果卡为基准。

## 实施范围

- [x] 人物档案
- [x] 来源资料库
- [x] 审计追踪：对象追踪 / 操作日志 / 风险事件
- [x] 世系图谱：人物中心 / 支派全局
- [x] 宗族文化：文化资料 / 迁徙脉络 / 文化场所
- [x] 修谱工作台
- [x] 数据导入：导入任务
- [x] 审核中心：待我审核 / 我提交的 / 已处理
- [x] 成员与权限

## 公共能力

- [x] 新增 `BusinessResultCard` 共享组件；
- [x] 新增统一桌面端和移动端样式；
- [x] 更新查询类页面规范；
- [x] 增加 11 处页面源码结构回归测试。

## 验证

- [ ] `node --test src/shared/ui/QueryResultCards.test.mjs`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] PR CI
""",
    )


def main() -> None:
    write_component()
    patch_person()
    patch_source()
    patch_tracking()
    patch_tree()
    patch_imports()
    patch_workbench()
    patch_culture_item()
    patch_migration()
    patch_site()
    patch_review()
    patch_member()
    patch_docs()
    write_test()
    write_task_board()
    print("Issue #677 query result card transformation completed")


if __name__ == "__main__":
    main()
