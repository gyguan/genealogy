# Issue #989 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/989
- 目标：统一查询 Card、更多筛选、Tabs、结果工具栏和动作词汇，不改变查询 API、分页、排序、URL、权限或审核语义。
- 工作分支：`agent/issue-989-query-tabs-toolbar`
- Draft PR：待创建
- Issue 类型：多页面前端交互治理
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：聚焦治理测试 + TypeScript / 生产构建 + 现有视觉、真实 E2E 与多浏览器门禁
- 前置依赖：#988 已完成并合入 main

## 统一契约

1. 查询 Card 标题统一为“查询条件”，不重复页面模块标题。
2. 查询动作固定为“更多筛选 → 重置 → 查询”，查询为唯一主按钮。
3. 更多筛选使用统一展开 / 收起文案、图标、热区和隐藏条件数量提示。
4. 页面级 Tabs 位于页面头之后、查询和结果区域之前；详情 Tabs 保持对象容器内部，禁止嵌套。
5. 结果工具栏只承载排序、刷新、视图、批量和当前结果专属动作；页面级创建 / 邀请 / 发起动作留在页面头。
6. 结果标题使用“对象名称（共 N 条）”，加载完成前不以 0 冒充数量。
7. 动作词汇：顶层对象“创建”，对象内子项“新增”，成员协作“邀请”，流程启动“发起”。
8. 创建类页面主按钮统一使用加号图标、主按钮层级和 2～6 字动宾短语。

## 非目标

- 不调整页面头容器与状态反馈组件。
- 不改变查询字段、查询 API、分页、排序、URL 状态、权限或审核语义。
- 不重构表格响应式策略、图谱画布或业务流程。

## 原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、#943 共享契约并建立分支 | ✅ 已完成 | 约 6 分钟 | 基于最新 main `94a2408` |
| 2 | 建立执行看板、Draft PR 与 Issue 启动回写 | 🔄 进行中 | — |  |
| 3 | 建立共享查询面板、更多筛选、结果标题和动作词汇契约 | ⏳ 待处理 | — |  |
| 4 | 迁移代表页面的查询区、Tabs、工具栏和创建类动作 | ⏳ 待处理 | — |  |
| 5 | 补充治理测试、处理 CI / Review 并合入 main | ⏳ 待处理 | — |  |

## 验证方案

- `cd frontend/genealogy-web && npm run test:dom-governance`
- `cd frontend/genealogy-web && npm run typecheck`
- `cd frontend/genealogy-web && npm run build`
- 复用 Frontend CI、API Contract、Style Debt Audit、Security Penetration、Import Page Gate、Visual Release Gate、Functional E2E 与 Multi-Browser Compatibility。

## 恢复检查点

- 当前 Issue：#989
- 当前分支：`agent/issue-989-query-tabs-toolbar`
- 当前 PR：待创建
- 当前阶段：启动门禁与现状审计
- 未解决 Review：无
- 已知阻塞：本地环境无法访问 GitHub，代码读取、写入和 CI 使用 GitHub Connector 完成
- 下一步最小任务：创建 Draft PR，读取共享查询组件与代表页面实现
- 最后更新时间：2026-07-30 10:07（北京时间）
