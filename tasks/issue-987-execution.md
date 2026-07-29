# Issue #987 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/987
- 目标：统一正式页面的页面头、说明、范围上下文和页面级主操作位置，消除标题重复、动作漂移和内容起始节奏差异。
- 工作分支：`agent/issue-987-standard-page-headers`
- Draft PR：#997
- Issue 类型：多页面前端模式迁移
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：页面头聚焦治理测试 + TypeScript / 前端构建；桌面截图沿用现有 Visual Release Gate
- 拆分结论：Issue 已命中多页面拆分信号，但范围已限定为页面头和页面级动作；状态反馈与查询交互分别由 #988、#989 承担，本 Issue 内不再拆分。

## 正式页面范围

- 11 个模块页：族谱首页、建谱向导、人物档案、世系图谱、来源资料库、数据导入、修谱工作台、审核中心、成员与权限、审计追踪、宗族文化。
- 2 个人物特殊路由：人物详情、人物编辑。
- 登录页：作为独立安全页面例外，保留自身唯一标题和品牌结构，不套用后台 `StandardPage`。

## 实现范围

- 扩展现有 `StandardPage` / `StandardPageHeader` 页面头契约，支持范围上下文、返回入口和唯一页面级操作。
- 让全部登录后正式页面进入统一标准页面外围结构。
- 将新建、邀请、发起导入等页面级主操作迁移到页面头右侧。
- 清理页面标题与首个 Card 标题重复；Card 标题改为具体内容职责。
- 保留向导 Steps、导入 Upload、宗族文化内容区和世系画布的业务视觉与流程。
- 补充静态治理测试，阻止正式页面绕过标准页面头、页面级主操作回流结果 Card 或全局 Header。

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
| 3 | 扩展标准页面头并迁移特殊页面外围结构 | 🔄 进行中 | 已累计约 1 分钟 | 正在读取特殊页面和页面级动作实现 |
| 4 | 迁移页面级主操作并清理重复标题 | ⏳ 待处理 | — |  |
| 5 | 补充治理测试、检查 diff、处理 CI / Review 并合入 main | ⏳ 待处理 | — |  |

## 活跃耗时与外部等待

- 活跃耗时仅记录规则与现场恢复、代码与测试修改、diff 检查、验证结果读取和 GitHub 回写。
- GitHub Actions 排队、运行和 Review 等待单独记录，不计入活跃耗时。
- 当前外部等待：Draft PR 初始 CI 已触发，不计入活跃耗时。

## 复用资产

- 复用 `StandardPagePatterns.tsx`、`standard-page-patterns.css` 和 `StandardPagePatternGovernance.test.mjs`。
- 复用 `moduleRegistry.tsx` 的模块元数据作为页面标题、说明和范围契约来源。
- 不新增第二套页面头、Page Header CSS 或第三方 UI 依赖。

## 影响模块

- `frontend/genealogy-web/src/shared/ui/StandardPagePatterns.tsx`
- `frontend/genealogy-web/src/styles/shared/standard-page-patterns.css`
- `frontend/genealogy-web/src/app/App.tsx`
- `frontend/genealogy-web/src/app/AuthenticatedShell.tsx`
- `frontend/genealogy-web/src/app/moduleRegistry.tsx`
- 需要迁移页面级动作或重复标题的相关 Feature 页面
- `frontend/genealogy-web/src/styles/StandardPagePatternGovernance.test.mjs`

## 验证方案

- 聚焦治理：`cd frontend/genealogy-web && npm run test:dom-governance`
- 类型检查：`cd frontend/genealogy-web && npm run typecheck`
- 前端构建：`cd frontend/genealogy-web && npm run build`
- API 检查：不涉及 API 变更；读取现有 Frontend CI 结果确认无契约回退。
- 手工建议：通过现有 Visual Release Gate 检查 1280 / 1440 / 1920 的页面头、主操作和首屏节奏。

## 已知风险

- 多页面迁移容易扩大 diff；优先通过模块注册与共享页面契约集中收敛，只在需要访问页面局部状态时修改 Feature 页面。
- 页面级动作迁移不得改变原有权限、disabled、loading 和业务回调。
- 登录页、世系画布、宗族文化核心区仅保留业务例外，外围结构必须可被治理测试识别。

## 恢复检查点

- 当前 Issue：#987
- 当前分支：`agent/issue-987-standard-page-headers`
- 当前 Draft PR：#997
- 最后完成任务：建立分支、执行看板、Draft PR 与 Issue 启动回写
- 当前进行中任务：扩展标准页面头并迁移特殊页面外围结构
- 当前任务累计耗时：已累计约 1 分钟
- 最新 Commit：启动门禁更新提交
- CI 状态：Draft PR 已触发，尚未读取结果
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：读取人物、导入、树谱和文化页面，收敛统一页面头实现方案
- 最后更新时间：2026-07-29 20:15（北京时间）
