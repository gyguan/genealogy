# Issue #987 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/987
- 目标：统一正式页面的页面头、说明、范围上下文和页面级主操作位置，消除标题重复、动作漂移和内容起始节奏差异。
- 工作分支：`agent/issue-987-standard-page-headers`
- PR：#997
- Issue 类型：多页面前端模式迁移
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：页面头聚焦治理测试 + TypeScript / 前端构建 + 现有视觉与浏览器门禁
- 拆分结论：范围限定为页面头和页面级动作；状态反馈与查询交互分别由 #988、#989 承担。

## 正式页面范围

- 11 个模块页：族谱首页、建谱向导、人物档案、世系图谱、来源资料库、数据导入、修谱工作台、审核中心、成员与权限、审计追踪、宗族文化。
- 2 个人物特殊路由：人物详情、人物编辑。
- 登录页：作为独立安全页面例外，保留唯一标题和品牌结构，不套用后台 `StandardPage`。

## 完成内容

- 扩展 `StandardPage` / `StandardPageHeader`，支持说明、范围上下文、返回入口和页面级动作槽。
- 11 个模块页全部通过模块注册层进入统一 `StandardPage` 外围。
- 人物详情与人物编辑通过 `EntityPageHeader` 适配到同一 `StandardPageHeader`，并清理旧 Grid 布局覆盖。
- 全局应用 Header 不再承载业务页面动作，仅保留模块上下文和用户菜单。
- `QueryResultCard` 将首个页面级主按钮提升到页面头，刷新、导出、模板和视图等结果级工具保留在结果区。
- 成员邀请与族谱导出显式迁移到页面头；族谱导出移除 DOM 查询、MutationObserver 和运行时 Portal。
- 页面标题与首个 Card 使用不同职责文案；宗族文化内部 Card 分别使用文化资料查询、迁徙事件查询和宗族场所查询。
- 建谱向导 Steps、数据导入工作区、宗族文化内容区和世系画布核心业务结构保持不变。
- 新增页面头治理测试，阻止正式页面绕过标准 Header、业务动作回流全局 Header或运行时 DOM 搬移。

## 原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 现场并固化 14 页面范围与页面头契约 | ✅ 已完成 | 约 10 分钟 | 13 个登录后页面 + 登录页例外 |
| 2 | 建立分支、执行看板、Draft PR 与 Issue 启动回写 | ✅ 已完成 | 约 4 分钟 | `750c08e`；PR #997 |
| 3 | 扩展标准页面头并迁移特殊页面外围结构 | ✅ 已完成 | 约 9 分钟 | `25879cb`、`3dbc712` |
| 4 | 迁移页面级主操作并清理重复标题 | ✅ 已完成 | 约 7 分钟 | `858c95a`、`2428837`、`96110ee` |
| 5 | 补充治理测试、检查 diff、处理 CI / Review 并合入 main | ✅ 已完成 | 约 12 分钟 | `b84b46f` 及后续 Review 整改；全部门禁通过，2 个 Thread 已解决 |

## 验证结果

- ✅ Frontend CI：DOM / CSS Governance、页面头治理测试、TypeScript 和生产构建通过。
- ✅ Style Debt Audit：通过。
- ✅ Import Page Gate：通过。
- ✅ Visual Release Gate：通过。
- ✅ Functional E2E：PostgreSQL 集成和真实浏览器 E2E 通过。
- ✅ Security Penetration：通过。
- ✅ Multi-Browser Compatibility：Edge、Firefox、Chrome / Chromium、Safari / WebKit 和高 DPI 桌面视口通过。
- ✅ Review：2 个意见均完成整改并解决。
- ✅ Diff 检查：18 个文件均属于页面头、页面动作、页面职责文案、测试或执行记录范围；无 API、数据库、权限、隐私或审核语义变化。

## 活跃耗时与外部等待

- 已完成任务活跃耗时：约 42 分钟。
- GitHub Actions 排队、运行和 Review 等待不计入活跃耗时。
- 已知阻塞：无。

## 复用资产

- 复用 `StandardPagePatterns.tsx`、`standard-page-patterns.css` 和 `StandardPagePatternGovernance.test.mjs`。
- 复用 `moduleRegistry.tsx` 的模块元数据作为页面标题、说明和范围契约来源。
- 未新增第二套页面头、全局强制布局 CSS 或第三方 UI 依赖。

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
- `frontend/genealogy-web/src/features/culture/*StandardTab.tsx`
- `frontend/genealogy-web/src/styles/StandardPagePatternGovernance.test.mjs`
- `frontend/genealogy-web/e2e/culture-page-pattern.spec.ts`
- `frontend/genealogy-web/e2e/import-page-pattern.spec.ts`
- `tasks/issue-987-execution.md`

## 最终结论

- 页面级动作保留原有权限、disabled、loading 和业务回调，仅调整呈现层级。
- 登录页、世系画布和宗族文化核心内容区保留明确业务例外，外围结构已统一。
- 未使用 Ant Design 内部类覆盖、DOM 查询、MutationObserver 或运行时 Portal 完成页面头对齐。
- 无遗留代码事项；后续状态反馈与查询交互分别进入 #988、#989。

## 最终恢复检查点

- 当前 Issue：#987
- 当前分支：`agent/issue-987-standard-page-headers`
- 当前 PR：#997
- 最新业务 Head：`12d3e484d5a451013660e551c74ab8e9042a478c`
- CI 状态：全部成功
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：Squash 合入 `main` 并回写 Issue 与总控 #985
- 最后更新时间：2026-07-30 08:32（北京时间）
