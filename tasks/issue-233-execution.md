# Issue #233 执行看板：世系图谱可读性、路径定位与状态恢复

- Issue：https://github.com/gyguan/genealogy/issues/233
- 关联：#191、#200、PR #232
- 分支：`agent/issue-233-lineage-workbench`
- 目标：在不改变 Tree 权限、隐私和正式数据只读边界的前提下，修复最新搜索交互准出回归，统一业务口径，并将世系图谱建设为可定位、可恢复的单画布工作台。
- 最后更新时间：2026-07-15 14:10（北京时间）

## 方案与边界

- Issue 类型：世系图谱核心前端交互与状态恢复。
- 流程强度：重型前端流程；保留任务看板、Draft PR、Tree Release Gate 和五轴 Review。
- 契约强度：本次不修改 Tree 公共 API、数据库、权限和隐私契约；仅消费现有 `direction / relationScopes / dataView / includeSubBranches / meta` 能力。
- 验证强度：Tree 模型测试、TypeScript、生产构建、API 契约检查和真实 Tree Release Gate。
- 拆分信号：Issue 验收项较多，但主要集中在同一前端页面、画布组件和现有 E2E；为避免多个分支反复修改共享页面，本次采用一个 Issue、三个可独立提交的垂直切片，不扩展后端契约。
- 活跃耗时与外部等待分离：仅记录规则/代码/测试/Review 的活跃时间；CI 排队与运行单独记录。
- 复用：继续使用 `LineageRequestGate`、Tree 生成类型、现有图布局 fixture、语义模型 fixture 和 `tree-release-gate.spec.ts` 的 PostgreSQL 测试数据。

## 实现范围

1. 修复查询输入与已提交条件、E2E 定位、业务口径和中文状态字典。
2. 建立单画布工作台、右侧 Drawer、自动适配、选中状态和关系路径高亮。
3. 增加方向/关系范围/支派范围筛选、URL 状态恢复、警告汇总和大图降级展示。

## 非目标

- 不新增人物或关系正式编辑能力。
- 不修改数据库 schema、权限、隐私或审核流程。
- 不引入图数据库、新 UI 框架或全局状态库。
- 不新增 `siblingOrder / spouseOrder / familyUnitId` 等后端字段；仅在现有数据能力内优化布局与交互。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、现有页面和 Tree Release Gate，建立分支/看板/Draft PR | 🔄 进行中 | 已累计约 10 分钟 | 分支和检查点已建立 |
| 2 | 修复搜索状态、业务口径、中文字典及最新交互 E2E | ⏳ 待处理 | — |  |
| 3 | 实现单画布、Drawer、自动适配和路径高亮 | ⏳ 待处理 | — |  |
| 4 | 实现查询模式、URL 恢复、警告汇总和大图降级 | ⏳ 待处理 | — |  |
| 5 | 执行验证、五轴 Review、同步看板并合入 main | ⏳ 待处理 | — |  |

## 影响范围

- `frontend/genealogy-web/src/features/tree/`
- `frontend/genealogy-web/src/lineage-tree.css`
- `frontend/genealogy-web/src/lineage-graph.css`
- `frontend/genealogy-web/e2e/tree-release-gate.spec.ts`
- 必要的 Tree 单元测试与任务记录

## 验证方案

- `npm run test:tree`
- `npm run typecheck`
- `npm run build`
- `npm run api:check`
- Tree Release Gate：真实 PostgreSQL、安全投影、120+ 人物搜索与浏览器交互
- Review：Correctness、Readability、Architecture、Security、Performance

## 已知风险

- 单画布切换会改变现有 E2E 定位，需要同步更新稳定语义标识。
- URL 状态需避免与全局 `view` 参数和 WorkspaceContext 产生循环更新。
- 路径高亮必须基于现有可见节点和边计算，不能恢复被后端脱敏或过滤的数据。
- 500 节点仍由 SVG 渲染，本次采用 LOD 和交互降级，不引入 Canvas/Web Worker。

## 恢复检查点

- 当前 Issue：#233
- 当前分支：`agent/issue-233-lineage-workbench`
- 当前 Draft PR：待创建
- 最后完成任务：规则、Issue 和现有 Tree 现场读取
- 当前进行中：创建 Draft PR 并回写 Issue
- 最新 Commit：本检查点提交
- CI：尚未运行
- 未解决 Review：无
- 阻塞：无
- 下一步最小任务：修复查询状态、业务口径和 Tree E2E 定位
- 最后更新时间：2026-07-15 14:10（北京时间）
