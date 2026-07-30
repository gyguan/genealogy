# Issue #1026 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1026
- 目标：在现有 `StandardQueryPanel` / `StandardQueryActions` 基础上建立唯一的查询 Card 字段、栅格、展开区和动作视觉契约，不迁移真实业务页面。
- 实现范围：共享 Query Grid / Field / AdvancedFilters / Actions、统一样式、规范文档和聚焦治理测试。
- 非目标：人物、来源、工作台、世系、成员、审核、审计、文化、导入页面迁移；后端 API、数据库、权限和业务查询语义。
- Issue 类型：前端共享组件与视觉治理
- 流程强度：标准
- 契约强度：不涉及后端契约
- 验证强度：组件聚焦测试 + DOM/CSS Governance + TypeScript / 构建
- 拆分结论：不再拆分；本 Issue 仅建设共享契约，页面迁移已拆为 #1027、#1028、#1029。
- 耗时口径：只记录活跃执行耗时；CI 排队与运行、Review 等待单独记录，不计入活跃耗时。
- 复用资产：复用 `StandardQueryPanel`、`StandardQueryActions`、`QueryMultiSelect`、现有 DOM/CSS Governance 与前端页面模式测试。

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 与现有查询组件现场 | ✅ 已完成 | 约 12 分钟 | 已确认无既有分支/PR；识别规范与现实现冲突，以 Issue 验收为当前变更依据 |
| 2 | 建立共享查询 Grid、Field、AdvancedFilters 与动作视觉契约 | 🔄 进行中 | 已累计约 1 分钟 | 正在读取共享组件、样式与测试入口 |
| 3 | 更新查询页面规范与治理测试 | ⏳ 待处理 | — |  |
| 4 | 执行聚焦验证、Review、CI 与合入收尾 | ⏳ 待处理 | — |  |

## 影响模块

- `frontend/genealogy-web/src/shared/ui/StandardPagePatterns.tsx`
- `frontend/genealogy-web/src/shared/ui/StandardQueryActions.tsx`
- 共享查询样式与聚焦测试
- `docs/frontend/query-pages.md`

## 验证方案

- 共享组件 / 查询动作聚焦测试
- DOM / CSS Governance
- `npm run typecheck`
- `npm run build`
- diff 范围与敏感信息检查
- 现有 Visual Release Gate 作为仓库工作流证据，不新增重型 Required Check

## 已知风险

- `docs/frontend/query-pages.md` 当前仍保留旧的业务化查询标题和“动作与第一行同排”表述，需要与 #1026 验收同步，避免规范与实现继续冲突。
- 治理规则不能误伤特殊画布内部工具栏；仅约束标准查询 Card。
- 不允许使用无作用域 `.ant-*` 或 `!important` 强行对齐。

## 恢复检查点

- 当前 Issue：#1026
- 当前分支：`agent/issue-1026-query-card-visual-contract`
- Draft PR：待创建
- 最后完成任务：规则、需求与现场确认
- 当前进行中任务：共享查询视觉契约设计与实现
- 当前任务累计耗时：约 1 分钟
- 最新 Commit：执行看板检查点提交
- CI 状态：尚未触发
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：读取并修改共享查询组件、样式和聚焦测试
- 最后更新时间：2026-07-30 15:37（北京时间）
