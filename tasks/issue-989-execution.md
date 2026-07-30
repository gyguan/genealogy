# Issue #989 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/989
- 目标：统一查询 Card、更多筛选、Tabs、结果工具栏和动作词汇，不改变查询 API、分页、排序、URL、权限或审核语义。
- 工作分支：`agent/issue-989-query-tabs-toolbar`
- PR：https://github.com/gyguan/genealogy/pull/1011
- Issue 类型：多页面前端交互治理
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：聚焦治理测试 + TypeScript / 生产构建 + Import / Tracking / Visual / Functional / Multi-Browser 门禁
- 前置依赖：#988 已完成并合入 `main`

## 统一契约

1. 查询 Card 标题统一为“查询条件”，不重复页面模块标题。
2. 查询动作固定为“更多筛选 → 重置 → 查询”，查询为唯一主按钮。
3. 更多筛选使用统一展开 / 收起文案、图标、热区和隐藏条件数量提示。
4. 页面级 Tabs 位于页面头之后、查询和结果区域之前；详情 Tabs 保持对象容器内部，禁止嵌套。
5. 结果工具栏只承载排序、刷新、视图、批量和当前结果专属动作；页面级创建 / 邀请 / 发起动作留在页面头。
6. 结果标题使用“对象名称（共 N 条）”，加载完成前不以 0 冒充数量。
7. 动作词汇：顶层对象“创建”，对象内子项“新增”，成员协作“邀请”，流程启动“发起”。
8. 创建类页面主按钮统一使用加号图标、主按钮层级和 2～6 字动宾短语；导入流程使用“发起导入”。

## 完成范围

- 扩展 `StandardQueryActions`，新增统一更多筛选按钮、展开图标、生效条件计数与移动端触控热区。
- 扩展标准页面模式，提供页面级 Tabs、统一查询面板与业务结果标题。
- 收敛 `QueryResultCard` 的页面动作、结果工具栏和业务标题职责，并避免成员页重复主操作。
- 迁移宗族文化三个真实路由 Tab：文化资料、迁徙事件、文化场所。
- 迁移审计追踪查询动作和业务结果标题。
- 迁移数据导入真实页面：查询标题、查询动作、结果标题及“发起导入”流程词汇。
- 建谱向导结果门禁改为要求业务标题，禁止回退为泛化“查询结果”。
- 新增交互一致性规范、静态治理测试，并同步相关 Playwright 用例。
- 处理 Codex Review：真实文化 Tab 接入、成员页双主操作问题均已修复，Review Thread 已关闭。
- 同步文档分类后的反馈治理测试路径，消除当前 `main` 合并基线阻塞。

## 非目标

- 不调整页面头容器与状态反馈组件业务行为。
- 不改变查询字段、查询 API、分页、排序、URL 状态、权限或审核语义。
- 不重构表格响应式策略、图谱画布或业务流程。
- 不修改后端、OpenAPI 或数据库。

## 原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、#943 共享契约并建立分支 | ✅ 已完成 | 约 6 分钟 | 基于当时最新 `main` `94a2408` |
| 2 | 建立执行看板、Draft PR 与 Issue 启动回写 | ✅ 已完成 | 未单独计时 | PR #1011，后续转为 Ready |
| 3 | 建立共享查询面板、更多筛选、结果标题和动作词汇契约 | ✅ 已完成 | 未单独计时 | `StandardQueryActions`、`StandardPagePatterns`、`QueryResultCard` |
| 4 | 迁移真实页面的查询区、Tabs、工具栏和创建类动作 | ✅ 已完成 | 未单独计时 | 宗族文化、审计追踪、数据导入及共享结果页面 |
| 5 | 补充治理测试并处理 CI / Review | ✅ 实现完成，最终验证中 | 未单独计时 | Review Thread 已关闭；最终门禁以 PR Checks 为准 |

## 验证矩阵

最终合入前要求当前 Head 全部通过：

- Frontend CI：反馈审计、交互治理、TypeScript、生产构建
- API Contract
- Style Debt Audit
- Import Page Gate
- Tracking Page Gate
- Security Penetration
- Visual Release Gate
- Functional E2E（PostgreSQL + 真实 Chromium）
- Multi-Browser Compatibility（Chrome / Firefox / Edge / WebKit / 高 DPI）

## 恢复检查点

- 当前 Issue：#989
- 当前分支：`agent/issue-989-query-tabs-toolbar`
- 当前 PR：#1011
- 当前阶段：实现与 Review 已完成，执行最终全量门禁
- 未解决 Review：无
- 已知阻塞：无代码阻塞；等待当前 Head 的 GitHub Actions 完成
- 下一步最小任务：全部门禁成功后更新 PR / Issue 结论，Squash 合入 `main`，关闭 #989 与总控 #985
- 最后更新时间：2026-07-30（北京时间）
