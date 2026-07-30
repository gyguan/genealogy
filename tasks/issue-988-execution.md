# Issue #988 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/988
- 目标：统一正式页面的前置条件、首次空数据、查询无结果、无权限、加载中和加载异常反馈，并明确用户下一步动作。
- 工作分支：`agent/issue-988-unified-page-states`
- Draft PR：待创建
- Issue 类型：多页面前端状态治理
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：聚焦状态测试 + TypeScript / 前端构建 + 现有视觉与浏览器门禁
- 拆分结论：范围已限定为状态反馈；查询动作与工具栏由 #989 负责，本 Issue 内不再拆分。

## 状态契约

1. `prerequisite`：缺少宗族等必要上下文，使用阻断型状态，不展示无效查询区、空表格或误操作按钮。
2. `first-empty`：首次无业务数据，说明可创建或导入的下一步；动作仅在用户有权限时展示。
3. `no-results`：用户已执行查询但无匹配结果，保留筛选现场并提供重置条件。
4. `forbidden`：无权限，采用最小披露的 403 状态，不展示受限对象名称、数量或摘要。
5. `loading`：首次加载显示骨架/加载态，不以空列表冒充结果。
6. `error`：首次失败提供重试；刷新失败保留上次成功数据并展示局部错误。

## 非目标

- 不修改后端错误码、权限模型、审核流、`allowedActions`、API 或数据库。
- 不统一查询字段、Tabs、工具栏和动作命名（#989）。
- 不把局部面板错误升级为整页阻断。
- 不新增第二套反馈组件体系。

## 原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 现场并固化六类状态契约 | ✅ 已完成 | 约 5 分钟 | 首次启动；前置 Issue #987 已完成 |
| 2 | 建立分支、执行看板、Draft PR 与 Issue 启动回写 | 🔄 进行中 | 已累计约 2 分钟 | 分支已创建，准备创建 Draft PR |
| 3 | 建立共享状态模型与薄封装 | ⏳ 待处理 | — |  |
| 4 | 迁移代表页面并统一下一步动作 | ⏳ 待处理 | — |  |
| 5 | 补充聚焦测试、处理 CI / Review 并合入 main | ⏳ 待处理 | — |  |

## 验证方案

- 状态反馈与 DOM / CSS Governance 聚焦测试。
- `cd frontend/genealogy-web && npm run typecheck`
- `cd frontend/genealogy-web && npm run build`
- 复用 Visual Release Gate、Functional E2E、Security Penetration 和 Multi-Browser Compatibility。

## 风险与约束

- 错误文案不得暴露接口字段名、堆栈或技术 ID。
- 状态动作沿用 #987 页面级主操作边界，不重复页面头主按钮。
- 权限状态只使用后端既有信号，不由前端猜测。
- 刷新失败必须尽可能保留上次成功数据和用户筛选现场。

## 恢复检查点

- 当前 Issue：#988
- 当前分支：`agent/issue-988-unified-page-states`
- 当前 PR：待创建
- 最后完成任务：固化六类页面状态契约并创建分支
- 当前进行中任务：创建 Draft PR 并回写 Issue
- CI 状态：尚未触发
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR 后检查现有反馈组件与代表页面
- 最后更新时间：2026-07-30 08:58（北京时间）
