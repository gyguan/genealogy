# Issue #1026 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1026
- 目标：在现有 `StandardQueryPanel` / `StandardQueryActions` 基础上建立唯一的查询 Card 字段、栅格、展开区和动作视觉契约，不迁移真实业务页面。
- 实现范围：共享 Query Grid / Field / AdvancedFilters / Actions、统一样式、视觉专项规范和聚焦治理测试。
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
| 2 | 建立共享查询 Grid、Field、AdvancedFilters 与动作视觉契约 | ✅ 已完成 | 约 18 分钟 | 新增 4→2→1 Grid、Field 提示占位、无容器装饰展开区；动作组件统一 Text / Default / Primary、宽度、图标与移动端布局 |
| 3 | 更新查询视觉规范与治理测试 | ✅ 已完成 | 约 12 分钟 | 新增视觉专项权威规范、规范索引和 `StandardQueryVisualContractGovernance`，接入 DOM Governance |
| 4 | 执行聚焦验证、Review、CI 与合入收尾 | 🔄 进行中 | 已累计约 4 分钟 | 首轮 Frontend CI、API Contract、Style Debt Audit、Security Penetration 已通过；浏览器矩阵执行中 |

## 影响模块

- `frontend/genealogy-web/src/shared/ui/StandardPagePatterns.tsx`
- `frontend/genealogy-web/src/shared/ui/StandardQueryActions.tsx`
- `frontend/genealogy-web/src/styles/shared/standard-page-patterns.css`
- `frontend/genealogy-web/src/shared/ui/standard-query-actions.css`
- `frontend/genealogy-web/src/styles/StandardQueryVisualContractGovernance.test.mjs`
- `docs/frontend/query-card-visual-contract.md`
- `docs/standards/README.md`

## 验证结果

- Frontend CI：✅ 首轮业务 Head 通过（包含 DOM/CSS Governance、TypeScript、生产构建）
- API Contract：✅ 通过
- Style Debt Audit：✅ 通过
- Security Penetration：✅ 通过
- Visual Release Gate：🔄 执行中
- Functional E2E：🔄 执行中
- Multi-Browser Compatibility：🔄 执行中
- diff 范围：✅ 仅共享查询契约、规范、测试和执行看板；未迁移真实页面，未修改 API / 数据库 / 权限
- 非目标漂移：✅ `package.json` 既有 `test:draft-delete` 命令已恢复，只新增治理测试入口

## 已知风险与处理

- `query-pages.md` 继续负责查询业务行为；新增 `query-card-visual-contract.md` 被规范索引确认为标题、尺寸、栅格、展开区和动作外观的唯一权威，消除职责冲突。
- 查询动作容器不依赖 Ant Design 内部 `.ant-*` 包装层，避免内部 DOM 变化破坏移动端布局。
- 特殊画布内部工具栏不受标准查询 Card 治理影响。

## 恢复检查点

- 当前 Issue：#1026
- 当前分支：`agent/issue-1026-query-card-visual-contract`
- Draft PR：#1030
- 最后完成任务：共享组件、视觉规范与治理测试实现
- 当前进行中任务：最终 CI、Review 和合入收尾
- 当前任务累计耗时：约 4 分钟
- 最新业务 Commit：`2ec31cfc327372e862b79860207aec1d8f53db46`
- CI 状态：静态、类型、构建、API、样式债、安全通过；浏览器矩阵执行中
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：将 PR 转为 Ready，读取 Review 与最终工作流结果
- 最后更新时间：2026-07-30 15:56（北京时间）
