# Issue #987 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/987
- 目标：统一正式页面的页面头、说明、范围上下文和页面级主操作位置，消除标题重复、动作漂移和内容起始节奏差异。
- 工作分支：`agent/issue-987-standard-page-headers`
- PR：#997
- Issue 类型：多页面前端模式迁移
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：页面头聚焦治理测试 + TypeScript / 前端构建 + 现有视觉与浏览器门禁
- 拆分结论：Issue 已命中多页面拆分信号，但范围已限定为页面头和页面级动作；状态反馈与查询交互分别由 #988、#989 承担，本 Issue 内不再拆分。

## 正式页面范围

- 11 个模块页：族谱首页、建谱向导、人物档案、世系图谱、来源资料库、数据导入、修谱工作台、审核中心、成员与权限、审计追踪、宗族文化。
- 2 个人物特殊路由：人物详情、人物编辑。
- 登录页：作为独立安全页面例外，保留自身唯一标题和品牌结构，不套用后台 `StandardPage`。

## 完成内容

- 扩展 `StandardPage` / `StandardPageHeader`，支持说明、范围上下文、返回入口和页面级动作槽。
- 11 个模块页全部通过模块注册层进入统一 `StandardPage` 外围。
- 人物详情与人物编辑通过 `EntityPageHeader` 适配到同一 `StandardPageHeader`。
- 全局应用 Header 不再承载业务页面动作，仅保留模块上下文和用户菜单。
- `QueryResultCard` 自动将首个主按钮提升到页面头，刷新、导出、模板、视图等次级工具继续留在结果区。
- 成员邀请与族谱导出显式迁移到页面头；族谱导出移除 DOM 查询和运行时 Portal。
- 页面标题与业务首 Card 使用不同职责文案，避免标题重复；向导 Steps、导入工作区、文化内容区和世系画布保持原业务结构。
- 新增聚焦治理测试，阻止页面绕过标准 Header、业务动作回流全局 Header或运行时 DOM 搬移。

## 非目标

- 不调整 Empty、Result、Alert 等状态反馈结构（#988）。
- 不统一查询动作、Tabs 与结果工具栏细节（#989）。
- 不修改全局导航、用户菜单、后端 API、权限、审核流程或数据模型。
- 不重构世系画布、宗族文化内容视觉和登录品牌区域。

## 原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 现场并固化 14 页面范围与页面头契约 | ✅ 已完成 | 约 10 分钟 | 首次启动；确认 13 个登录后页面 + 登录页例外 |
| 2 | 建立分支、执行看板、Draft PR 与 Issue 启动回写 | ✅ 已完成 | 约 4 分钟 | 检查点 `750c08e`；Draft PR #997 已创建并回写 Issue |
| 3 | 扩展标准页面头并迁移特殊页面外围结构 | ✅ 已完成 | 约 9 分钟 | `25879cb`、`3dbc712`；11 个模块页和 2 个特殊路由统一 |
| 4 | 迁移页面级主操作并清理重复标题 | ✅ 已完成 | 约 7 分钟 | `858c95a`、`2428837`、`96110ee`；主操作提升，次级工具保留 |
| 5 | 补充治理测试、检查 diff、处理 CI / Review 并合入 main | 🔄 进行中 | 已累计约 6 分钟 | `b84b46f`；Frontend CI、Style Debt Audit 已通过，等待其余门禁和 Review |

## 验证结果

- ✅ DOM / CSS Governance：含 #987 页面头治理测试通过。
- ✅ TypeScript：通过。
- ✅ 前端生产构建：通过。
- ✅ Style Debt Audit：通过。
- 🔄 Visual Release Gate：运行中。
- 🔄 Functional E2E：运行中。
- 🔄 Multi-Browser Compatibility：运行中。
- ⏳ Security Penetration：排队中。
- ✅ Diff 检查：11 个预期文件，无 API、数据库、权限或全局业务样式变更。

## 活跃耗时与外部等待

- 当前活跃耗时：约 36 分钟。
- GitHub Actions 排队、运行和 Review 等待单独记录，不计入活跃耗时。
- 当前外部等待：视觉、真实 E2E、多浏览器和安全门禁运行中。

## 复用资产

- 复用 `StandardPagePatterns.tsx`、`standard-page-patterns.css` 和 `StandardPagePatternGovernance.test.mjs`。
- 复用 `moduleRegistry.tsx` 的模块元数据作为页面标题、说明和范围契约来源。
- 不新增第二套页面头、Page Header CSS 或第三方 UI 依赖。

## 影响模块

- `frontend/genealogy-web/src/shared/ui/StandardPagePatterns.tsx`
- `frontend/genealogy-web/src/shared/ui/QueryResultCards.tsx`
- `frontend/genealogy-web/src/shared/ui/EntityPageHeader.tsx`
- `frontend/genealogy-web/src/styles/shared/standard-page-patterns.css`
- `frontend/genealogy-web/src/app/App.tsx`
- `frontend/genealogy-web/src/app/AuthenticatedShell.tsx`
- `frontend/genealogy-web/src/app/moduleRegistry.tsx`
- `frontend/genealogy-web/src/features/members/MemberManagementPage.tsx`
- `frontend/genealogy-web/src/features/booklets/BookletActions.tsx`
- `frontend/genealogy-web/src/styles/StandardPagePatternGovernance.test.mjs`
- `tasks/issue-987-execution.md`

## 已知风险与结论

- 页面级动作迁移保留原有权限、disabled、loading 和业务回调；只改变呈现位置。
- 登录页、世系画布、宗族文化核心区保留业务例外，外围结构已统一。
- 未使用全局 CSS、Ant Design 内部类覆盖、DOM 查询或 MutationObserver 完成页面头对齐。
- 当前无已知代码阻塞；等待门禁和 Review 结论。

## 恢复检查点

- 当前 Issue：#987
- 当前分支：`agent/issue-987-standard-page-headers`
- 当前 PR：#997
- 最后完成任务：完成页面头、动作迁移和聚焦治理测试
- 当前进行中任务：读取剩余 CI、处理 Review 并合入 main
- 最新业务 Commit：`b84b46f25bf878bb4d12e0ecbe316b5fb37125b8`
- CI 状态：核心 Frontend CI 与 Style Debt Audit 成功；其余运行中
- 未解决 Review：无（PR 仍为 Draft）
- 已知阻塞：无
- 下一步最小任务：将 PR 转为 Ready，读取 Review Thread 与剩余门禁
- 最后更新时间：2026-07-29 20:31（北京时间）
