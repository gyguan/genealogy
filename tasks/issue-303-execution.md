# Issue #303 执行看板：宗族文化页面 Header 精简与 Tab 内查询内聚

> 环境限制：当前容器未安装 `gh`，且本地仓库未配置 `origin` 远程，无法真实创建 GitHub Issue、远程分支或 Draft PR。本文件作为本地可恢复执行现场；最终 PR 元数据会记录该限制。

## Issue 链接与目标

- Issue：#303（本地占位，待有 GitHub 连接后补建真实 Issue）
- 标题：`[宗族文化 P1-01] 调整页面为 Tab 内宗族筛选与新增入口`
- 目标：实现宗族文化页面原型：删除顶部说明文案，将当前宗族选择融入各 Tab 查询条件，将新增按钮放到对应 Tab 内。

## 功能组

- 功能前缀：`宗族文化`
- 组内序号：`P1-01`
- 所属总控：不适用
- 前置 Issue：无
- 后续 Issue：无
- 是否可并行：否
- 建议执行顺序：第 1 步，共 1 步
- 建议切片类型：前端接入
- Issue 类型：单页面前端调整
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：聚焦测试 + 类型检查
- 拆分信号：未命中；不涉及数据库、后端、OpenAPI、权限模型或审核流程变更

## 范围

- [ ] 删除宗族文化页面顶部说明文案。
- [ ] 移除页面 Header 右侧的全局宗族选择器和全局新增按钮。
- [ ] 将宗族选择放入文化资料、迁徙脉络、文化场所 Tab 的查询条件区域。
- [ ] 将新增资料、新增迁徙事件、新增场所按钮放入各自 Tab 内。
- [ ] 保持现有后端 API、权限 `allowedActions`、审核流程和正式数据生效路径不变。

## 非目标

- 不修改 OpenAPI 契约。
- 不修改后端接口、数据库和权限模型。
- 不新增或改变审核流。
- 不处理历史基线问题。

## 验收标准

- [ ] 顶部不再展示“查询和维护宗族文化资料、迁徙脉络及文化场所。”。
- [ ] 页面 Header 不再展示全局“当前宗族”选择和全局新增按钮。
- [ ] 三个 Tab 内都能选择宗族，并沿用当前工作区宗族状态。
- [ ] 三个 Tab 内各自展示新增按钮，未选择宗族时新增按钮不可用。
- [ ] 切换宗族后当前 Tab 查询刷新或清空依赖旧宗族的支派条件。
- [ ] 相关聚焦测试或类型检查通过，失败时记录原因。

## 影响模块

- 前端：`frontend/genealogy-web/src/features/culture/`
- 后端：不涉及
- API：不涉及
- 数据库：不涉及
- 权限 / 隐私 / 审核：不改变语义，仅移动入口位置
- CI / E2E：建议执行前端聚焦测试和类型检查

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 建立本地 Issue 执行现场与检查点 | ✅ 已完成 | 约 6 分钟 | a070f4c9；因无 `gh` 与 `origin`，记录本地占位 Issue |
| 2 | 调整文化页 Header 与 Tab 宗族/新增入口 | ✅ 已完成 | 约 24 分钟 | 015b9445；删除顶部说明与全局入口；新增 Tab 内宗族选择和新增按钮 |
| 3 | 执行聚焦验证并检查 diff | ✅ 已完成 | 约 8 分钟 | `npm run test:culture-shell` 通过；`npm run typecheck` 通过 |
| 4 | 更新执行看板并提交实现 | ✅ 已完成 | 约 4 分钟 | 015b9445；实现 Commit 已提交，本次补充最终恢复检查点 |

## 验证方案

- `cd frontend/genealogy-web && npm run test:culture-shell`
- `cd frontend/genealogy-web && npm run typecheck`

## 已知风险

- 当前无法真实创建 GitHub Issue / Draft PR，只能提交本地任务现场并通过 make_pr 记录 PR 元数据。
- 迁徙脉络和文化场所 Tab 当前内部读取 `workspace.clanId`，移动选择器时需避免重复状态源冲突。

## 恢复检查点

- 当前分支：`agent/issue-303-culture-page-tab-query`
- 当前阶段：实现已完成，等待 PR 元数据记录
- 最新 Commit：015b9445
- 下一步：通过 make_pr 记录 PR 元数据；真实 GitHub Issue / Draft PR 待有远程与 gh 后补建
- 最后更新时间：2026-07-16 北京时间

## 验证结果

- `cd frontend/genealogy-web && npm run test:culture-shell`：通过。
- `cd frontend/genealogy-web && npm run typecheck`：通过。

## 耗时汇总

- 已完成任务活跃耗时：约 42 分钟。
- 外部等待：无。
- 环境限制：无法创建真实 GitHub Issue / Draft PR，因为当前容器缺少 `gh` 且仓库未配置 `origin`。
