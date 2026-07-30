# Issue #988 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/988
- 目标：统一正式页面的前置条件、首次空数据、查询无结果、无权限、加载中和加载异常反馈，并明确用户下一步动作。
- 工作分支：`agent/issue-988-unified-page-states`
- PR：#1008
- Issue 类型：多页面前端状态治理
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：聚焦状态测试 + TypeScript / 前端构建 + API、视觉、真实 E2E 与多浏览器门禁
- 拆分结论：范围已限定为状态反馈；查询动作与工具栏由 #989 负责，本 Issue 内不再拆分。

## 状态契约

1. `prerequisite`：页面完成宗族、URL 或对象上下文初始化后，如仍缺少必要条件，使用阻断型状态，不展示无效查询区、空表格或误操作按钮。
2. `first-empty`：首次无业务数据，说明可创建或导入的下一步；动作仅在用户有权限时展示。
3. `no-results`：用户已执行查询但无匹配结果，保留筛选现场并提供调整或重置条件的指引。
4. `forbidden`：无权限，采用最小披露的 403 状态，不展示受限对象名称、数量或摘要。
5. `loading`：首次加载显示统一加载态，不以空列表冒充结果。
6. `error`：首次失败提供重试；刷新失败保留同一业务范围的上次成功数据并展示局部错误。

## 完成内容

- 在 `Feedback.tsx` 建立 `PageState` 六类语义映射和 `RetainedDataFeedback` 刷新保留提示，不新增第二套视觉组件。
- 固化首次加载、阻断状态和空态的稳定布局，桌面与移动端均避免内容跳动。
- 数据导入任务面板完成六态迁移：前置条件、403、首次加载、首次失败、首次空数据和查询无结果。
- 导入任务刷新失败保留上次成功数据和筛选现场；保留数据严格绑定最近一次成功请求的“宗族 + 支派”范围。
- 宗族或支派切换时不展示旧范围任务，旧详情 Drawer 同步关闭，并通过请求序号忽略过期响应。
- 即使上次成功结果为空，后续刷新失败也同时展示刷新警告和原空态。
- 审核中心恢复分页和查询状态期间使用统一首次加载反馈。
- 模块注册层始终挂载页面内容，避免阻断宗族自动发现、直达 URL 恢复和权限请求；前置状态由页面完成上下文初始化后判断。
- 更新反馈规范、现有统一反馈治理断言和页面状态专项门禁。

## 非目标

- 不修改后端错误码、权限模型、审核流、`allowedActions`、API、OpenAPI 或数据库。
- 不统一查询字段、Tabs、工具栏和动作命名（#989）。
- 不把局部面板错误升级为整页阻断。
- 不迁移未完成页面；修谱工作台的临时状态模型改动已撤回，未进入最终 diff。

## 原子任务看板

| 序号 | 任务 | 状态 | 活跃耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 现场并固化六类状态契约 | ✅ 已完成 | 约 5 分钟 | 首次启动；前置 Issue #987 已完成 |
| 2 | 建立分支、执行看板、Draft PR 与 Issue 启动回写 | ✅ 已完成 | 约 4 分钟 | 分支、看板、Draft PR #1008 和 Issue 回写完成 |
| 3 | 建立共享状态模型、样式和治理规范 | ✅ 已完成 | 约 12 分钟 | `PageState`、`RetainedDataFeedback`、状态布局与规范完成 |
| 4 | 迁移数据导入与审核中心代表场景 | ✅ 已完成 | 约 16 分钟 | 导入六态、范围隔离、刷新保留和审核首次加载完成 |
| 5 | 补充测试、处理 CI / Review 并完成合入准备 | ✅ 已完成 | 约 24 分钟 | 4 个 Review 问题全部处理；9 个预期文件；全部业务门禁通过 |

## Review 处理

- ✅ 修复跨宗族 / 支派切换后错误保留旧导入任务的问题；数据保留与详情均绑定成功请求范围。
- ✅ 修复上次成功结果为空时，刷新失败警告被空态覆盖的问题。
- ✅ 撤回未接入页面渲染的工作台状态模型，避免测试通过但页面未使用的半成品。
- ✅ 修复模块注册层过早阻断页面，恢复宗族文化自动选择、直达编辑和 403 权限路径。
- ✅ 执行看板、验证结果、耗时和恢复检查点已同步。

## 最终验证结果

最新业务 Head：`5df9a54d0f30ff32321c00bcb8544ddfade09a0f`

- ✅ Frontend CI：页面状态治理测试、反馈审计、DOM / CSS Governance、TypeScript 和生产构建通过。
- ✅ API Contract：通过。
- ✅ Import Page Gate：通过。
- ✅ Style Debt Audit：通过。
- ✅ Security Penetration：通过。
- ✅ Visual Release Gate：文化页面直达、编辑、403 和 Chromium 页面矩阵通过。
- ✅ Functional E2E：PostgreSQL 集成和真实浏览器 E2E 通过。
- ✅ Multi-Browser Compatibility：Edge、Firefox、Chrome / Chromium、Safari / WebKit 和高 DPI 桌面视口通过。
- ✅ Diff 检查：9 个文件均属于状态契约、代表页面迁移、规范、测试和执行记录范围。

## 活跃耗时与外部等待

- 已完成任务活跃耗时：约 61 分钟。
- GitHub Actions 排队、执行和 Review 等待单独记录，不计入活跃耗时。
- 未记录历史任务：无。

## 影响模块

- `frontend/genealogy-web/src/shared/ui/Feedback.tsx`
- `frontend/genealogy-web/src/feedback-system.css`
- `frontend/genealogy-web/src/features/imports/AsyncImportExecutionPanel.tsx`
- `frontend/genealogy-web/src/features/reviews/ReviewCenterPage.tsx`
- `frontend/genealogy-web/src/shared/ui/PageStateContract.test.mjs`
- `frontend/genealogy-web/src/shared/ui/FeedbackUnification.test.mjs`
- `frontend/genealogy-web/package.json`
- `docs/22-frontend-feedback-pattern-spec.md`
- `tasks/issue-988-execution.md`

## 已知风险与结论

- 权限状态只使用后端明确 403 信号，不根据空数据猜测权限。
- 用户可见首次加载错误使用安全文案，不暴露接口路径、字段名、技术 ID 或堆栈。
- 刷新保留仅发生在相同宗族与支派范围；跨范围数据不会复用。
- 未修改后端、数据库、权限、审核语义或查询交互。
- 当前无已知代码阻塞，无未解决业务 Review。

## 最终恢复检查点

- 当前 Issue：#988
- 当前分支：`agent/issue-988-unified-page-states`
- 当前 PR：#1008（Ready）
- 最后完成任务：完成全部代码、规范、测试、Review 整改和业务门禁验证
- 最新业务 Head：`5df9a54d0f30ff32321c00bcb8544ddfade09a0f`
- CI 状态：全部业务门禁成功
- 未解决 Review：仅本执行看板同步 Thread，提交后关闭
- 已知阻塞：无
- 合入状态：待执行；本记录提交通过最简门禁后 Squash 合入 `main`
- 下一步最小任务：关闭执行看板 Review Thread 并合入 PR #1008
- 最后更新时间：2026-07-30 09:52（北京时间）
