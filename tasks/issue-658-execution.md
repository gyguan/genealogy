# Issue #658 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/658
- 分支：`agent/issue-658-member-list-actions`
- 目标：将成员总数与成员列表标题合并，并把“邀请新成员”“新增成员授权”统一放到结果 Card 标题行右侧。
- Issue 类型：单页面前端调整
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：自动门禁 + 聚焦 diff 检查
- 拆分结论：未命中拆分信号，单 Issue 完成
- 影响模块：`frontend/genealogy-web/src/app/App.tsx`、`frontend/genealogy-web/src/features/members/MemberPage.tsx`
- 复用说明：复用现有 `MemberInvitationAction`、Ant Design `Card` / `Space`，不新增组件体系

## 范围

- 成员总数移动到“成员列表”标题后；
- 邀请和授权按钮移动到成员列表 Card 右侧；
- 删除全局模块 Header 和查询 Card 中的重复操作入口；
- 保持现有邀请、授权、权限校验和弹窗逻辑不变。

## 非目标

- 不修改后端接口、OpenAPI、数据库或权限模型；
- 不调整邀请和授权业务流程；
- 不引入新依赖。

## 任务看板

| 序号 | 任务 | 状态 | 验证 |
|---:|---|---|---|
| 1 | 复核成员页、邀请操作与页面规范 | 已完成 | 已确认现有入口和目标布局 |
| 2 | 建立分支、任务看板与 Draft PR | 进行中 | GitHub 现场可恢复 |
| 3 | 调整成员列表标题与按钮布局 | 待开始 | 聚焦 diff 检查 |
| 4 | 执行前端自动门禁并修复问题 | 待开始 | TypeScript / build / api:check |
| 5 | 更新看板、完成 Review 并合入 main | 待开始 | CI / Review / merge |

## 验证方案

- 检查 `App.tsx` 不再在全局 Header 渲染成员邀请入口；
- 检查 `MemberPage.tsx` 的查询 Card 不再包含授权按钮；
- 检查结果 Card 标题显示成员总数，extra 同行展示两个按钮；
- 由 GitHub Actions 执行前端 TypeScript、构建和 API 检查；
- 检查最终 diff 无接口、权限模型或无关页面变更。

## 已知风险

- Ant Design Card Header 在窄屏下可能换行；按钮容器需保留 `wrap`，避免操作溢出。
- `MemberInvitationAction` 自带上下文加载，迁移后仍需处于 `WorkspaceProvider` 内。

## 耗时与等待口径

- 活跃耗时：按实际 GitHub 操作阶段记录，不补算会话外时间；当前为启动阶段。
- 外部等待：GitHub Actions 运行时间单独记录，不计入活跃耗时。

## 恢复检查点

- 当前阶段：启动门禁与 Draft PR 建立
- 最后完成：读取规则、现有页面、邀请组件并创建 Issue #658 与任务分支
- 当前任务：创建 Draft PR
- 最新提交：任务看板检查点提交
- CI 状态：尚未触发
- 未解决 Review：无
- 下一步最小任务：创建 Draft PR 并回写 Issue
- 最后更新时间：2026-07-21 19:30（北京时间）
